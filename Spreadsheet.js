function letterToColumn(letter) {
  return letter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0) + 1;
}

function findFirstEmptyRow(sheet, isbnColumn) {
  const lastRow = sheet.getLastRow();
  const values = sheet
    .getRange(2, isbnColumn, Math.max(lastRow - 1, 1), 1)
    .getValues();

  const emptyIndex = values.findIndex(row => !row[0]);
  return emptyIndex === -1 ? lastRow + 1 : emptyIndex + 2;
}

function validateConfig(config) {
  if (!config.sheetName) {
    return { status: 'invalid-config', message: 'Sheet name not set' };
  }

  for (const [name, letter] of Object.entries(config.COLS)) {
    if (!/^[A-Z]$/.test(letter)) {
      return {
        status: 'invalid-config',
        message: `Invalid column for ${name}: "${letter}"`
      };
    }
    if (letterToColumn(letter) > 12) {
      return {
        status: 'invalid-config',
        message: `${name} column "${letter}" out of A–L range`
      };
    }
  }

  return null;
}

function setScannedValue(rawValue) {
  try {
    const config = getConfig();
    const configError = validateConfig(config);
    if (configError) {
      return configError;
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet || !spreadsheet.getId()) {
      return {
        status: 'spreadsheet-not-saved',
        message: 'Please save the spreadsheet by giving it a name'
      };
    }

    const sheet = spreadsheet.getSheetByName(config.sheetName);
    if (!sheet) {
      return {
        status: 'no-sheet',
        message: `Sheet "${config.sheetName}" not found`
      };
    }

    const isbn = normalizeIsbn(rawValue);
    if (!isbn) {
      return { status: 'not-an-isbn' };
    }

    const isbnColumn = letterToColumn(config.COLS.isbn);
    const row = findFirstEmptyRow(sheet, isbnColumn);
    sheet.getRange(row, isbnColumn).setValue(isbn);

    const book = fetchBookInfo(isbn);
    if (!book) {
      return { status: 'not-found' };
    }

    sheet.getRange(row, letterToColumn(config.COLS.title)).setValue(book.title);
    sheet
      .getRange(row, letterToColumn(config.COLS.author))
      .setValue(book.authors);
    sheet.getRange(row, letterToColumn(config.COLS.price)).setValue(book.price);
    sheet
      .getRange(row, letterToColumn(config.COLS.amazon_link))
      .setFormula(
        `=HYPERLINK("https://www.amazon.com/s?k=${isbn}","Search Amazon")`
      );
    sheet.getRange(row, letterToColumn(config.COLS.date)).setValue(new Date());

    return { status: 'ok' };
  } catch (error) {
    console.error('setScannedValue error', error);
    const message = error.message || '';
    if (message.includes('No item with the given')) {
      return {
        status: 'spreadsheet-not-saved',
        message: 'Please save the spreadsheet by giving it a name'
      };
    }
    return { status: 'error', message };
  }
}
