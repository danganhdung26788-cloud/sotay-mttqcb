function runPhase4RegressionTests() {
  const ss = db_();
  const required = Object.values(CONFIG.SHEETS);
  const missing = required.filter(n => !ss.getSheetByName(n));
  const orgs = tableObjects_(CONFIG.SHEETS.ORGANIZATIONS);
  const contacts = tableObjects_(CONFIG.SHEETS.CONTACTS);
  const users = tableObjects_(CONFIG.SHEETS.USERS);
  const orgIds = orgs.map(x => String(x.org_id));
  const contactIds = contacts.map(x => String(x.contact_id));
  const dupOrg = orgIds.filter((v,i,a) => a.indexOf(v) !== i);
  const dupContact = contactIds.filter((v,i,a) => a.indexOf(v) !== i);
  const unitAdmins = users.filter(u => String(u.role_id) === 'UNIT_ADMIN');
  const badScopes = unitAdmins.filter(u => {
    const o = orgs.find(x => String(x.org_id) === String(u.scope_org_id));
    return !o || Number(o.level) !== 2;
  });
  const badLevel3 = orgs.filter(o => Number(o.level) === 3).filter(o => {
    const p = orgs.find(x => String(x.org_id) === String(o.parent_org_id));
    return !p || Number(p.level) !== 2;
  });
  const leakedPlaintext = users.filter(u => String(u.password_hash || '').includes('Mttq@'));
  const settings = settingsMap_(true);
  const checks = {
    missing_sheets:missing,
    organizations:orgs.length,
    communes:orgs.filter(o => Number(o.level) === 2).length,
    contacts:contacts.length,
    users:users.length,
    unit_admins:unitAdmins.length,
    duplicate_org_ids:dupOrg.length,
    duplicate_contact_ids:dupContact.length,
    bad_unit_admin_scopes:badScopes.length,
    bad_level3_parents:badLevel3.length,
    plaintext_password_leaks:leakedPlaintext.length,
    avatar_folder_configured:!!settings.AVATAR_FOLDER_ID,
    backup_folder_configured:!!settings.BACKUP_ROOT_FOLDER_ID,
    review_mode:settings.UNIT_ADMIN_REVIEW_MODE || ''
  };
  checks.ok =
    missing.length === 0 &&
    checks.communes === 56 &&
    checks.users >= 57 &&
    checks.unit_admins === 56 &&
    checks.duplicate_org_ids === 0 &&
    checks.duplicate_contact_ids === 0 &&
    checks.bad_unit_admin_scopes === 0 &&
    checks.bad_level3_parents === 0 &&
    checks.plaintext_password_leaks === 0 &&
    checks.avatar_folder_configured &&
    checks.backup_folder_configured;
  return checks;
}
function runPhase4ScopeSmokeTest(token) {
  const auth = requireAdminSession_(token);
  const allowed = scopedOrgIds_(auth.session);
  return {
    ok:true,
    role:auth.session.role_id,
    scope_org_id:auth.session.scope_org_id,
    allowed_org_count:allowed.size,
    can_manage_root:canManageOrg_(auth.session,CONFIG.ROOT_ORG_ID)
  };
}
