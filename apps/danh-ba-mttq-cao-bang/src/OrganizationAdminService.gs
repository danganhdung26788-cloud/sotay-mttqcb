function listLevel3Organizations_(token) {
  const auth = requireAdminSession_(token);
  const allowed = scopedOrgIds_(auth.session);
  return tableObjects_(CONFIG.SHEETS.ORGANIZATIONS)
    .filter(o => Number(o.level) === 3 && allowed.has(String(o.org_id)))
    .map(o => ({
      org_id:String(o.org_id), parent_org_id:String(o.parent_org_id),
      org_name:String(o.org_name), org_type:String(o.org_type || 'VILLAGE'),
      sort_order:Number(o.sort_order || 999), status:String(o.status || '')
    }))
    .sort((a,b) => a.parent_org_id.localeCompare(b.parent_org_id) || a.sort_order-b.sort_order);
}

function adminCreateLevel3_(token, payload) {
  requireAdminSession_(token);
  payload = payload || {};
  const created = createLevel3Organization_(
    token,
    String(payload.parent_org_id || ''),
    String(payload.org_name || ''),
    normalizeLevel3Type_(payload.org_type || 'VILLAGE')
  );
  invalidatePublicDirectoryCache_();
  return created;
}

function adminUpdateLevel3_(token, payload) {
  const auth = requireAdminSession_(token);
  payload = payload || {};
  const org = findBy_(CONFIG.SHEETS.ORGANIZATIONS, 'org_id', payload.org_id);
  if (!org || Number(org.level) !== 3) throw new Error('Không tìm thấy đơn vị cấp 3.');
  requireOrgWrite_(auth.session, org.org_id);

  const parentOrgId = String(payload.parent_org_id || org.parent_org_id);
  requireLevel2Parent_(auth.session, parentOrgId);

  const name = sanitizeText_(payload.org_name != null ? payload.org_name : org.org_name, 200);
  if (!name) throw new Error('Tên đơn vị không được để trống.');
  assertUniqueLevel3Name_(parentOrgId, name, org.org_id);

  const before = {
    parent_org_id:org.parent_org_id,
    org_name:org.org_name,
    org_type:org.org_type,
    status:org.status,
    sort_order:org.sort_order
  };
  const patch = {
    parent_org_id: parentOrgId,
    org_name: name,
    short_name: name,
    normalized_name: normalizeText_(name),
    org_type: normalizeLevel3Type_(payload.org_type || org.org_type || 'VILLAGE'),
    sort_order: normalizeSortOrder_(
      payload.sort_order != null ? payload.sort_order : org.sort_order,
      org.sort_order || 999
    ),
    status: normalizeOrganizationStatus_(payload.status || org.status || 'ACTIVE'),
    updated_at: nowIso_()
  };

  const updated = updateByHeaders_(CONFIG.SHEETS.ORGANIZATIONS, org._row, patch);
  audit_(auth.session.username,'UPDATE_LEVEL3_ORG','ORGANIZATION',org.org_id,before,patch,'PASS');
  invalidatePublicDirectoryCache_();
  return updated;
}

function adminSetLevel3Status_(token, orgId, status) {
  const auth = requireAdminSession_(token);
  const org = findBy_(CONFIG.SHEETS.ORGANIZATIONS, 'org_id', orgId);
  if (!org || Number(org.level) !== 3) throw new Error('Chỉ áp dụng cho cấp 3.');
  requireOrgWrite_(auth.session, orgId);
  const updated = setOrganizationStatus_(token, orgId, normalizeOrganizationStatus_(status));
  invalidatePublicDirectoryCache_();
  return updated;
}
