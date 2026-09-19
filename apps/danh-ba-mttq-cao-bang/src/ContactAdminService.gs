function contactSortOrder_(value, fallback) {
  return normalizeSortOrder_(value, fallback == null ? 999 : fallback);
}

function requireContactTargetOrg_(session, orgId) {
  const id = String(orgId || '');
  if (!id) throw new Error('Chưa chọn đơn vị.');
  requireOrgWrite_(session, id);
  const org = findBy_(CONFIG.SHEETS.ORGANIZATIONS, 'org_id', id);
  if (!org) throw new Error('Không tìm thấy đơn vị.');
  if (String(org.status) !== 'ACTIVE') throw new Error('Đơn vị đang ngừng sử dụng.');
  return org;
}

function contactGroupForOrg_(orgId, groupId) {
  const id = String(groupId || '');
  if (!id) return '';
  const group = findBy_(CONFIG.SHEETS.GROUPS, 'group_id', id);
  if (!group || String(group.status) !== 'ACTIVE') throw new Error('Nhóm/ban không hợp lệ hoặc đã ngừng sử dụng.');
  if (String(group.org_id) !== String(orgId)) throw new Error('Nhóm/ban không thuộc đơn vị đã chọn.');
  return id;
}

function contactValidation_(payload, excludeContactId) {
  const fullName = sanitizeText_(payload.full_name || '', CONFIG.LIMITS.MAX_NAME_LENGTH);
  const phone = normalizePhone_(payload.phone || '');
  const issues = [];

  if (!fullName) issues.push('MISSING_NAME');
  if (!phone) issues.push('MISSING_PHONE');
  if (phone && phone.length !== 10) issues.push('PHONE_LENGTH');

  if (phone) {
    const dup = tableObjects_(CONFIG.SHEETS.CONTACTS).filter(c =>
      String(c.contact_id) !== String(excludeContactId || '') &&
      String(c.status) === 'ACTIVE' &&
      normalizePhone_(c.phone_normalized || c.phone) === phone
    );
    if (dup.length) issues.push('DUPLICATE_PHONE');
  }

  const email = validateEmail_(payload.email || '');
  return {full_name: fullName, phone: phone, email: email, issues: issues};
}

function listAdminContacts_(token, filters) {
  const auth = requireAdminSession_(token);
  filters = filters || {};
  const allowed = scopedOrgIds_(auth.session);
  let rows = tableObjects_(CONFIG.SHEETS.CONTACTS)
    .filter(c => allowed.has(String(c.org_id)));

  if (filters.org_id) rows = rows.filter(c => String(c.org_id) === String(filters.org_id));
  if (filters.status) rows = rows.filter(c => String(c.status) === String(filters.status));
  if (filters.data_quality) rows = rows.filter(c => String(c.data_quality) === String(filters.data_quality));

  const q = normalizeText_(filters.query || '');
  const qp = normalizePhone_(filters.query || '');
  if (q) {
    rows = rows.filter(c =>
      normalizeText_(c.full_name).includes(q) ||
      normalizeText_(c.position).includes(q) ||
      (qp && normalizePhone_(c.phone).includes(qp))
    );
  }

  return rows
    .sort((a,b) => Number(a.sort_order || 9999)-Number(b.sort_order || 9999) ||
      String(a.full_name).localeCompare(String(b.full_name),'vi'))
    .slice(0, 1000)
    .map(c => ({
      contact_id: String(c.contact_id),
      org_id: String(c.org_id),
      group_id: String(c.group_id || ''),
      full_name: String(c.full_name || ''),
      position: String(c.position || ''),
      phone: String(c.phone || ''),
      email: String(c.email || ''),
      avatar_file_id: String(c.avatar_file_id || ''),
      sort_order: Number(c.sort_order || 9999),
      status: String(c.status || ''),
      public_flag: bool_(c.public_flag),
      data_quality: String(c.data_quality || ''),
      review_reason: String(c.review_reason || '')
    }));
}

function adminCreateContact_(token, payload) {
  const auth = requireAdminSession_(token);
  payload = payload || {};
  const targetOrgId = String(payload.org_id || '');
  requireContactTargetOrg_(auth.session, targetOrgId);

  const check = contactValidation_(payload, '');
  if (check.issues.includes('MISSING_NAME')) throw new Error('Họ tên không được để trống.');

  const now = nowIso_();
  const contact = {
    contact_id: randomId_('CT'),
    org_id: targetOrgId,
    group_id: contactGroupForOrg_(targetOrgId, payload.group_id),
    full_name: check.full_name,
    normalized_name: normalizeText_(check.full_name),
    position: sanitizeText_(payload.position || '', 200),
    phone: check.phone,
    phone_normalized: check.phone,
    email: check.email,
    zalo: check.phone,
    avatar_file_id: '',
    sort_order: contactSortOrder_(payload.sort_order, 999),
    status: 'ACTIVE',
    public_flag: payload.public_flag == null ? true : bool_(payload.public_flag),
    source_sheet: 'WEB_APP_ADMIN',
    source_row: '',
    data_quality: check.issues.length ? 'REVIEW' : 'PASS',
    review_reason: check.issues.join('; '),
    created_at: now,
    updated_at: now
  };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    appendObject_(CONFIG.SHEETS.CONTACTS, contact);
    audit_(auth.session.username, 'CREATE_CONTACT', 'CONTACT', contact.contact_id, null, contact, 'PASS');
    invalidatePublicDirectoryCache_();
    return contact;
  } finally {
    lock.releaseLock();
  }
}

function adminUpdateContact_(token, payload) {
  const auth = requireAdminSession_(token);
  payload = payload || {};
  const current = findBy_(CONFIG.SHEETS.CONTACTS, 'contact_id', payload.contact_id);
  if (!current) throw new Error('Không tìm thấy cán bộ.');
  requireOrgWrite_(auth.session, current.org_id);

  const targetOrgId = String(payload.org_id || current.org_id);
  requireContactTargetOrg_(auth.session, targetOrgId);

  const merged = {
    full_name: payload.full_name != null ? payload.full_name : current.full_name,
    phone: payload.phone != null ? payload.phone : current.phone,
    email: payload.email != null ? payload.email : current.email
  };
  const check = contactValidation_(merged, current.contact_id);
  if (check.issues.includes('MISSING_NAME')) throw new Error('Họ tên không được để trống.');

  let requestedGroupId;
  if (payload.group_id != null) {
    requestedGroupId = payload.group_id;
  } else if (targetOrgId !== String(current.org_id)) {
    requestedGroupId = '';
  } else {
    requestedGroupId = current.group_id || '';
  }
  const groupId = contactGroupForOrg_(targetOrgId, requestedGroupId);

  const before = {
    org_id: current.org_id,
    group_id: current.group_id,
    full_name: current.full_name,
    position: current.position,
    phone: current.phone,
    email: current.email,
    avatar_file_id: current.avatar_file_id,
    status: current.status,
    public_flag: current.public_flag
  };

  const patch = {
    org_id: targetOrgId,
    group_id: groupId,
    full_name: check.full_name,
    normalized_name: normalizeText_(check.full_name),
    position: sanitizeText_(payload.position != null ? payload.position : current.position || '', 200),
    phone: check.phone,
    phone_normalized: check.phone,
    email: check.email,
    zalo: check.phone,
    avatar_file_id: String(current.avatar_file_id || ''),
    sort_order: contactSortOrder_(
      payload.sort_order != null ? payload.sort_order : current.sort_order,
      current.sort_order || 999
    ),
    public_flag: payload.public_flag != null ? bool_(payload.public_flag) : bool_(current.public_flag),
    data_quality: check.issues.length ? 'REVIEW' : 'PASS',
    review_reason: check.issues.join('; '),
    updated_at: nowIso_()
  };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const updated = updateByHeaders_(CONFIG.SHEETS.CONTACTS, current._row, patch);
    audit_(auth.session.username, 'UPDATE_CONTACT', 'CONTACT', current.contact_id, before, patch, 'PASS');
    invalidatePublicDirectoryCache_();
    return updated;
  } finally {
    lock.releaseLock();
  }
}

function adminSetContactStatus_(token, contactId, status) {
  const auth = requireAdminSession_(token);
  const nextStatus = String(status || '').toUpperCase();
  if (!['ACTIVE','INACTIVE'].includes(nextStatus)) throw new Error('Trạng thái không hợp lệ.');

  const current = findBy_(CONFIG.SHEETS.CONTACTS, 'contact_id', contactId);
  if (!current) throw new Error('Không tìm thấy cán bộ.');
  requireOrgWrite_(auth.session, current.org_id);

  const before = {status: current.status};
  const updated = updateByHeaders_(CONFIG.SHEETS.CONTACTS, current._row, {
    status: nextStatus,
    updated_at: nowIso_()
  });
  audit_(auth.session.username, 'SET_CONTACT_STATUS', 'CONTACT', contactId, before, {status: nextStatus}, 'PASS');
  invalidatePublicDirectoryCache_();
  return updated;
}

function adminMoveContacts_(token, contactIds, targetOrgId) {
  const auth = requireAdminSession_(token);
  contactIds = Array.isArray(contactIds) ? contactIds : [];
  if (!contactIds.length) throw new Error('Chưa chọn cán bộ.');

  const targetId = String(targetOrgId || '');
  requireContactTargetOrg_(auth.session, targetId);

  const contacts = tableObjects_(CONFIG.SHEETS.CONTACTS);
  const byId = Object.fromEntries(contacts.map(c => [String(c.contact_id), c]));

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    let moved = 0;
    contactIds.forEach(id => {
      const c = byId[String(id)];
      if (!c) return;
      requireOrgWrite_(auth.session, c.org_id);
      const before = {org_id: c.org_id, group_id: c.group_id};
      updateByHeaders_(CONFIG.SHEETS.CONTACTS, c._row, {
        org_id: targetId,
        group_id: '',
        updated_at: nowIso_()
      });
      audit_(auth.session.username, 'MOVE_CONTACT', 'CONTACT', c.contact_id, before, {org_id: targetId,group_id:''}, 'PASS');
      moved++;
    });
    invalidatePublicDirectoryCache_();
    return {ok:true, moved:moved};
  } finally {
    lock.releaseLock();
  }
}
