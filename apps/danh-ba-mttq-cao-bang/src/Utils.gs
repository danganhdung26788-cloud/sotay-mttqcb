function db_() {
  return SpreadsheetApp.openById(CONFIG.DB_ID);
}

function sheet_(name) {
  const sh = db_().getSheetByName(name);
  if (!sh) throw new Error('Không tìm thấy sheet: ' + name);
  return sh;
}

function normalizeText_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUsername_(value) {
  return normalizeText_(value).replace(/[^a-z0-9.]/g, '');
}

function normalizePhone_(value) {
  return String(value || '').replace(/\D/g, '');
}

function lastKeyRow_(sh) {
  const maxRows = sh.getMaxRows();
  if (maxRows <= 1) return 1;
  const keys = sh.getRange(2, 1, maxRows - 1, 1).getDisplayValues();
  for (let i = keys.length - 1; i >= 0; i--) {
    if (String(keys[i][0] || '').trim() !== '') return i + 2;
  }
  return 1;
}

function tableObjects_(sheetName) {
  const sh = sheet_(sheetName);
  const lastCol = Math.max(sh.getLastColumn(), 1);
  const lastRow = lastKeyRow_(sh);
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  if (lastRow <= 1) return [];
  const rows = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return rows
    .map((row, i) => ({row: row, physicalRow: i + 2}))
    .filter(x => String(x.row[0] == null ? '' : x.row[0]).trim() !== '')
    .map(x => {
      const o = {_row: x.physicalRow};
      headers.forEach((h, j) => o[h] = x.row[j]);
      return o;
    });
}

function rowObject_(sheetName, rowNumber) {
  const sh = sheet_(sheetName);
  const lastCol = Math.max(sh.getLastColumn(), 1);
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const row = sh.getRange(rowNumber, 1, 1, lastCol).getValues()[0];
  const o = {_row: rowNumber};
  headers.forEach((h, j) => o[h] = row[j]);
  return o;
}

function findBy_(sheetName, field, value) {
  return tableObjects_(sheetName).find(x => String(x[field]) === String(value)) || null;
}

function updateByHeaders_(sheetName, rowNumber, patch) {
  const sh = sheet_(sheetName);
  const lastCol = Math.max(sh.getLastColumn(), 1);
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const current = sh.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  headers.forEach((h, i) => {
    if (Object.prototype.hasOwnProperty.call(patch, h)) current[i] = patch[h];
  });
  sh.getRange(rowNumber, 1, 1, headers.length).setValues([current]);
  return rowObject_(sheetName, rowNumber);
}

function appendObject_(sheetName, obj) {
  const sh = sheet_(sheetName);
  const lastCol = Math.max(sh.getLastColumn(), 1);
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const rowNumber = lastKeyRow_(sh) + 1;

  if (rowNumber > sh.getMaxRows()) {
    sh.insertRowsAfter(sh.getMaxRows(), Math.max(50, rowNumber - sh.getMaxRows()));
  }

  const target = sh.getRange(rowNumber, 1, 1, headers.length);
  if (rowNumber > 2) {
    const prior = sh.getRange(rowNumber - 1, 1, 1, headers.length);
    prior.copyTo(target, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    target.setDataValidations(prior.getDataValidations());
  }

  target.setValues([headers.map(h => Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : '')]);
  return rowNumber;
}

function nowIso_() {
  return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function randomId_(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase();
}
