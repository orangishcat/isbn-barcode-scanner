/** Code.gs **/

/**
 * When the spreadsheet opens, add the “Barcode Scanner” menu.
 * Do NOT return anything from onOpen.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Barcode Scanner')
    .addItem('Open Scanner', 'openScanner')
    .addToUi();
}

/**
 * Sheets add-on homepage trigger.
 * Always returns a fresh card that won’t go stale.
 */
function onHomepage(e) {
  // Card header
  const header = CardService.newCardHeader()
    .setTitle('ISBN Barcode Scanner')
    .setSubtitle('Tap below to open the scanner');

  // Button that invokes openScannerFromCard()
  const button = CardService.newTextButton()
    .setText('▶ Open Scanner')
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName('openScannerFromCard')
    );

  // Put it in a section
  const section = CardService.newCardSection()
    .addWidget(button);

  // Build and return the card
  const card = CardService.newCardBuilder()
    .setHeader(header)
    .addSection(section)
    .build();

  return [ card ];
}

/**
 * Action callback when the user taps “Open Scanner” on the card.
 * This launches your HTML sidebar just like the menu item.
 */
function openScannerFromCard(e) {
  openScanner();
  return CardService.newActionResponseBuilder()
    .build();
}

/**
 * Legacy menu-driven entrypoint: opens your HTML sidebar.
 */
function openScanner() {
  const html = HtmlService
    .createHtmlOutputFromFile('ScannerSidebar')
    .setTitle('ISBN Barcode Scanner');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Read user-configured sheet name & column mappings (with defaults).
 */
function getConfig() {
  const props = PropertiesService.getDocumentProperties();
  return {
    sheetName: props.getProperty('SHEET_NAME') || 'Sheet1',
    COLS: {
      date:        props.getProperty('COL_DATE')        || 'A',
      title:       props.getProperty('COL_TITLE')       || 'B',
      author:      props.getProperty('COL_AUTHOR')      || 'C',
      price:       props.getProperty('COL_PRICE')       || 'D',
      isbn:        props.getProperty('COL_ISBN')        || 'E',
      amazon_link: props.getProperty('COL_AMAZON_LINK') || 'F'
    }
  };
}

/**
 * Persist the given config into Document Properties.
 */
function saveConfig(config) {
  const props = PropertiesService.getDocumentProperties();
  props.setProperties({
    SHEET_NAME:      config.sheetName,
    COL_DATE:        config.COLS.date,
    COL_TITLE:       config.COLS.title,
    COL_AUTHOR:      config.COLS.author,
    COL_PRICE:       config.COLS.price,
    COL_ISBN:        config.COLS.isbn,
    COL_AMAZON_LINK: config.COLS.amazon_link
  }, true);
}

/** A→1, B→2, etc. */
function letterToColumn(letter) {
  return letter.toUpperCase().charCodeAt(0)
       - 'A'.charCodeAt(0) + 1;
}

/** Strip non-digits/X and check ISBN-10/13. */
function normalizeIsbn(raw) {
  const s = raw.replace(/[^0-9X]/gi, '');
  if (/^\d{9}[0-9X]$/.test(s)) {
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += (10 - i) * parseInt(s[i], 10);
    const check = s[9] === 'X' ? 10 : parseInt(s[9], 10);
    sum += check;
    return sum % 11 === 0 ? s : null;
  }
  if (/^\d{13}$/.test(s)) {
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(s[i], 10) * (i % 2 ? 3 : 1);
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(s[12], 10) ? s : null;
  }
  return null;
}

/**
 * Find the first empty row in the ISBN column.
 */
function findFirstEmptyRow(sh, isbnColIdx) {
  const last = sh.getLastRow();
  const vals = sh.getRange(2, isbnColIdx, Math.max(last - 1, 1), 1)
                 .getValues();
  for (let i = 0; i < vals.length; i++) {
    if (!vals[i][0]) return i + 2;
  }
  return last + 1;
}

/**
 * Called by the sidebar after scan/manual entry.
 * Validates config, handles sheet errors, writes data or returns status.
 */
function setScannedValue(rawValue) {
  try {
    const { sheetName, COLS } = getConfig();
    // Validate sheetName
    if (!sheetName) {
      return { status: 'invalid-config', message: 'Sheet name not set' };
    }
    // Validate columns A–L
    for (const [k, letter] of Object.entries(COLS)) {
      if (!/^[A-Z]$/.test(letter)) {
        return { status: 'invalid-config', message: `Invalid column for ${k}: "${letter}"` };
      }
      const idx = letterToColumn(letter);
      if (idx < 1 || idx > 12) {
        return { status: 'invalid-config', message: `${k} column "${letter}" out of A–L range` };
      }
    }
    // Ensure spreadsheet is saved
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss || !ss.getId()) {
      return { status: 'spreadsheet-not-saved',
               message: 'Please save the spreadsheet by giving it a name' };
    }
    // Ensure sheet exists
    const sh = ss.getSheetByName(sheetName);
    if (!sh) {
      return { status: 'no-sheet', message: `Sheet "${sheetName}" not found` };
    }
    // Normalize ISBN
    const isbn = normalizeIsbn(rawValue);
    if (!isbn) return { status: 'not-an-isbn' };
    // Write ISBN in first empty row
    const isbnColIdx = letterToColumn(COLS.isbn);
    const row = findFirstEmptyRow(sh, isbnColIdx);
    sh.getRange(row, isbnColIdx).setValue(isbn);
    // Fetch book info
    const info = fetchBookInfo(isbn);
    if (!info) return { status: 'not-found' };
    // Populate remaining columns
    sh.getRange(row, letterToColumn(COLS.title)).setValue(info.title);
    sh.getRange(row, letterToColumn(COLS.author)).setValue(info.authors);
    sh.getRange(row, letterToColumn(COLS.price)).setValue(info.price);
    sh.getRange(row, letterToColumn(COLS.amazon_link))
      .setFormula(`=HYPERLINK("https://www.amazon.com/s?k=${isbn}","Search Amazon")`);
    sh.getRange(row, letterToColumn(COLS.date)).setValue(new Date());
    return { status: 'ok' };
  } catch (e) {
    console.error('setScannedValue error', e);
    const msg = e.message || '';
    if (msg.includes('No item with the given')) {
      return { status: 'spreadsheet-not-saved',
               message: 'Please save the spreadsheet by giving it a name' };
    }
    return { status: 'error', message: msg };
  }
}

/**
 * Google Books lookup (with country & optional API key).
 */
function fetchBookInfo(isbn) {
  const props   = PropertiesService.getScriptProperties();
  const apiKey  = props.getProperty('BOOKS_API_KEY');
  const country = props.getProperty('BOOKS_COUNTRY') || 'US';
  let url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&country=${country}`;
  if (apiKey) url += `&key=${apiKey}`;
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) return null;
  const data = JSON.parse(resp.getContentText());
  if (!data.items || !data.items.length) return null;
  const vi = data.items[0].volumeInfo || {};
  const si = data.items[0].saleInfo   || {};
  return {
    title:   vi.title   || '',
    authors: Array.isArray(vi.authors) ? vi.authors.join(', ') : '',
    price:   si.listPrice
             ? `${si.listPrice.amount} ${si.listPrice.currencyCode}`
             : ''
  };
}
