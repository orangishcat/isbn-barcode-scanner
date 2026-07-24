function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Barcode Scanner')
    .addItem('Open Scanner', 'openScanner')
    .addToUi();
}

function onHomepage() {
  const header = CardService.newCardHeader()
    .setTitle('ISBN Barcode Scanner')
    .setSubtitle('Tap below to open the scanner');
  const button = CardService.newTextButton()
    .setText('▶ Open Scanner')
    .setOnClickAction(
      CardService.newAction().setFunctionName('openScannerFromCard')
    );
  const section = CardService.newCardSection().addWidget(button);

  return [
    CardService.newCardBuilder()
      .setHeader(header)
      .addSection(section)
      .build()
  ];
}

function openScannerFromCard() {
  openScanner();
  return CardService.newActionResponseBuilder().build();
}

function openScanner() {
  const html = HtmlService.createTemplateFromFile('ScannerSidebar')
    .evaluate()
    .setTitle('ISBN Barcode Scanner');
  SpreadsheetApp.getUi().showSidebar(html);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
