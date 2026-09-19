function canManageOrg_(session, orgId) {
  if (session.role_id === 'SUPER_ADMIN' || session.role_id === 'PROVINCIAL_ADMIN') return true;
  if (session.role_id !== 'UNIT_ADMIN' && session.role_id !== 'EDITOR') return false;
  if (String(orgId) === String(session.scope_org_id)) return true;
  const org = findBy_(CONFIG.SHEETS.ORGANIZATIONS, 'org_id', orgId);
  return !!org && String(org.parent_org_id) === String(session.scope_org_id) && Number(org.level) === 3;
}


function requireOrgWrite_(session, orgId) {
  if (!canManageOrg_(session, orgId)) throw new Error('Không có quyền thao tác đơn vị này.');
}
