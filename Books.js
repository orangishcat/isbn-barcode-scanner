function setBooksApiKey(apiKey) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('A non-empty Google Books API key is required');
  }

  PropertiesService.getScriptProperties()
    .setProperty('BOOKS_API_KEY', apiKey.trim());
  return { status: 'ok' };
}

function fetchBookInfo(isbn) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('BOOKS_API_KEY');
  const country = props.getProperty('BOOKS_COUNTRY') || 'US';
  const query = [
    `q=isbn:${encodeURIComponent(isbn)}`,
    `country=${encodeURIComponent(country)}`
  ];

  if (apiKey) {
    query.push(`key=${encodeURIComponent(apiKey)}`);
  }

  const response = UrlFetchApp.fetch(
    `https://www.googleapis.com/books/v1/volumes?${query.join('&')}`,
    { muteHttpExceptions: true }
  );
  if (response.getResponseCode() !== 200) {
    return null;
  }

  const data = JSON.parse(response.getContentText());
  if (!data.items || data.items.length === 0) {
    return null;
  }

  const volume = data.items[0].volumeInfo || {};
  const sale = data.items[0].saleInfo || {};
  return {
    title: volume.title || '',
    authors: Array.isArray(volume.authors) ? volume.authors.join(', ') : '',
    price: sale.listPrice
      ? `${sale.listPrice.amount} ${sale.listPrice.currencyCode}`
      : ''
  };
}
