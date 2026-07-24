function normalizeIsbn(raw) {
  const isbn = raw.replace(/[^0-9X]/gi, '').toUpperCase();

  if (/^\d{9}[0-9X]$/.test(isbn)) {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += (10 - i) * parseInt(isbn[i], 10);
    }
    sum += isbn[9] === 'X' ? 10 : parseInt(isbn[9], 10);
    return sum % 11 === 0 ? isbn : null;
  }

  if (/^\d{13}$/.test(isbn)) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(isbn[i], 10) * (i % 2 ? 3 : 1);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(isbn[12], 10) ? isbn : null;
  }

  return null;
}
