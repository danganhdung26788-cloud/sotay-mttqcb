function verifyDatabase() {
  const required = Object.values(CONFIG.SHEETS);
  const ss = db_();
  const missing = required.filter(name => !ss.getSheetByName(name));
  const orgs = tableObjects_(CONFIG.SHEETS.ORGANIZATIONS);
  const users = tableObjects_(CONFIG.SHEETS.USERS);
  const contacts = tableObjects_(CONFIG.SHEETS.CONTACTS);
  const result = {
    ok: missing.length === 0,
    missing_sheets: missing,
    organizations: orgs.length,
    communes: orgs.filter(o => String(o.org_type) === 'COMMUNE').length,
    contacts: contacts.length,
    users: users.length,
    commune_admins: users.filter(u => String(u.role_id) === 'UNIT_ADMIN').length
  };
  audit_('SYSTEM', 'VERIFY_DATABASE', 'DATABASE', CONFIG.VERSION, null, result, result.ok ? 'PASS' : 'FAIL');
  return result;
}


function setupDatabase() {
  // Database V1.0 đã được tạo và import sẵn trên Drive.
  // Hàm này chỉ xác nhận baseline, không xóa/ghi đè dữ liệu hiện có.
  const result = verifyDatabase();
  if (!result.ok) throw new Error('Database chưa đủ schema: ' + result.missing_sheets.join(', '));
  if (result.communes !== 56) throw new Error('Số xã/phường không đúng baseline: ' + result.communes);
  if (result.commune_admins !== 56) throw new Error('Số Admin xã/phường không đúng baseline: ' + result.commune_admins);
  return result;
}
