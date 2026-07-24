const DEFAULT_CONFIG = Object.freeze({
  sheetName: "Sheet1",
  COLS: Object.freeze({
    date: "A",
    title: "B",
    author: "C",
    price: "D",
    isbn: "E",
    amazon_link: "F",
  }),
});

function getConfig() {
  const props = PropertiesService.getDocumentProperties();

  return {
    sheetName: props.getProperty("SHEET_NAME") || DEFAULT_CONFIG.sheetName,
    COLS: {
      date: props.getProperty("COL_DATE") || DEFAULT_CONFIG.COLS.date,
      title: props.getProperty("COL_TITLE") || DEFAULT_CONFIG.COLS.title,
      author: props.getProperty("COL_AUTHOR") || DEFAULT_CONFIG.COLS.author,
      price: props.getProperty("COL_PRICE") || DEFAULT_CONFIG.COLS.price,
      isbn: props.getProperty("COL_ISBN") || DEFAULT_CONFIG.COLS.isbn,
      amazon_link:
        props.getProperty("COL_AMAZON_LINK") || DEFAULT_CONFIG.COLS.amazon_link,
    },
  };
}

function saveConfig(config) {
  PropertiesService.getDocumentProperties().setProperties(
    {
      SHEET_NAME: config.sheetName,
      COL_DATE: config.COLS.date,
      COL_TITLE: config.COLS.title,
      COL_AUTHOR: config.COLS.author,
      COL_PRICE: config.COLS.price,
      COL_ISBN: config.COLS.isbn,
      COL_AMAZON_LINK: config.COLS.amazon_link,
    },
    true,
  );
}
