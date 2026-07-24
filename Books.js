function setBooksApiKey(apiKey) {
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error("A non-empty Google Books API key is required");
  }

  PropertiesService.getScriptProperties().setProperty(
    "BOOKS_API_KEY",
    apiKey.trim(),
  );
  return { status: "ok" };
}

function hasBooksApiKey() {
  const apiKey =
    PropertiesService.getScriptProperties().getProperty("BOOKS_API_KEY");
  return Boolean(apiKey && apiKey.trim());
}

function fetchBookInfo(isbn) {
  let apiKey = "";

  try {
    const props = PropertiesService.getScriptProperties();
    apiKey = props.getProperty("BOOKS_API_KEY") || "";
    const country = props.getProperty("BOOKS_COUNTRY") || "US";
    const query = [
      `q=isbn:${encodeURIComponent(isbn)}`,
      `country=${encodeURIComponent(country)}`,
    ];

    if (apiKey) {
      query.push(`key=${encodeURIComponent(apiKey)}`);
    }

    const response = UrlFetchApp.fetch(
      `https://www.googleapis.com/books/v1/volumes?${query.join("&")}`,
      { muteHttpExceptions: true },
    );
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode !== 200) {
      return {
        book: null,
        error: sanitizeApiError(
          `HTTP ${responseCode}\n\n${responseBody}`,
          apiKey,
        ),
      };
    }

    const data = JSON.parse(responseBody);
    if (!data.items || data.items.length === 0) {
      return {
        book: null,
        error: responseBody,
      };
    }

    const volume = data.items[0].volumeInfo || {};
    const sale = data.items[0].saleInfo || {};
    return {
      book: {
        title: volume.title || "",
        authors: Array.isArray(volume.authors) ? volume.authors.join(", ") : "",
        price: sale.listPrice
          ? `${sale.listPrice.amount} ${sale.listPrice.currencyCode}`
          : "",
      },
      error: null,
    };
  } catch (error) {
    return {
      book: null,
      error: sanitizeApiError(error.stack || String(error), apiKey),
    };
  }
}

function sanitizeApiError(details, apiKey) {
  return apiKey ? details.split(apiKey).join("[API KEY REDACTED]") : details;
}
