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
function tableObjects_(sheetName) {
  const values = sheet_(sheetName).getDataRange().getValues();
  if (!values.length) return [];
  const headers = values[0].map(String);
  return values.slice(1)
    .map((r, i) => ({row:r, physicalRow:i+2}))
    .filter(x => String(x.row[0] == null ? '' : x.row[0]).trim() !== '')
    .map(x => {
      const o = {_row:x.physicalRow};
      headers.forEach((h, j) => o[h] = x.row[j]);
      return o;
    });
}
function rowObject_(sheetName, rowNumber) {
  const sh = sheet_(sheetName);
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const row = sh.getRange(rowNumber,1,1,sh.getLastColumn()).getValues()[0];
  const o={_row:rowNumber};
  headers.forEach((h,j)=>o[h]=row[j]);
  return o;
}
function findBy_(sheetName, field, value) {
  return tableObjects_(sheetName).find(x => String(x[field]) === String(value)) || null;
}
function updateByHeaders_(sheetName, rowNumber, patch) {
  const sh=sheet_(sheetName);
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const current=sh.getRange(rowNumber,1,1,headers.length).getValues()[0];
  headers.forEach((h,i)=>{if(Object.prototype.hasOwnProperty.call(patch,h)) current[i]=patch[h];});
  sh.getRange(rowNumber,1,1,headers.length).setValues([current]);
  return rowObject_(sheetName,rowNumber);
}
function appendObject_(sheetName,obj) {
  const sh=sheet_(sheetName);
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  sh.appendRow(headers.map(h=>Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:''));
  return sh.getLastRow();
}
function nowIso_() {
  return Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh',"yyyy-MM-dd'T'HH:mm:ssXXX");
}
function randomId_(prefix) {
  return prefix+'_'+Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase();
}
