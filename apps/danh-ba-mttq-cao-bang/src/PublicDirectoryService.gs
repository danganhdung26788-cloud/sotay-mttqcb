function isTruthy_(value) {
  return value === true || String(value).toUpperCase() === 'TRUE' || String(value) === '1';
}

function publicCacheMetaKey_() {
  return 'PUBLIC_DIRECTORY_V11_META:' + activeDbId_();
}

function publicCacheChunkKey_(index) {
  return 'PUBLIC_DIRECTORY_V11_' + activeDbId_() + ':' + index;
}

function getPublicCache_() {
  const cache = CacheService.getScriptCache();
  const rawMeta = cache.get(publicCacheMetaKey_());
  if (!rawMeta) return null;

  try {
    const meta = JSON.parse(rawMeta);
    const count = Number(meta.count || 0);
    if (!count || count > 30) return null;

    const parts = [];
    for (let i = 0; i < count; i++) {
      const part = cache.get(publicCacheChunkKey_(i));
      if (part == null) return null;
      parts.push(part);
    }
    return JSON.parse(parts.join(''));
  } catch (e) {
    return null;
  }
}

function putPublicCache_(payload) {
  const cache = CacheService.getScriptCache();
  const json = JSON.stringify(payload);
  const chunkSize = 55000;
  const count = Math.ceil(json.length / chunkSize);
  if (!count || count > 30) return false;

  for (let i = 0; i < count; i++) {
    cache.put(
      publicCacheChunkKey_(i),
      json.slice(i * chunkSize, (i + 1) * chunkSize),
      300
    );
  }
  cache.put(publicCacheMetaKey_(), JSON.stringify({count: count}), 300);
  return true;
}

function publicContactDto_(row, orgMap, groupMap) {
  return {
    contact_id: String(row.contact_id || ''),
    org_id: String(row.org_id || ''),
    group_id: String(row.group_id || ''),
    full_name: String(row.full_name || ''),
    normalized_name: String(row.normalized_name || normalizeText_(row.full_name || '')),
    position: String(row.position || ''),
    phone: String(row.phone || ''),
    phone_normalized: String(row.phone_normalized || normalizePhone_(row.phone || '')),
    email: String(row.email || ''),
    zalo: String(row.zalo || row.phone_normalized || ''),
    avatar_file_id: String(row.avatar_file_id || ''),
    sort_order: Number(row.sort_order || 9999),
    org_name: orgMap[String(row.org_id || '')] || '',
    group_name: groupMap[String(row.group_id || '')] || ''
  };
}

function getPublicDirectoryData_(forceRefresh) {
  if (!forceRefresh) {
    const cached = getPublicCache_();
    if (cached) return cached;
  }

  const orgRows = tableObjects_(CONFIG.SHEETS.ORGANIZATIONS)
    .filter(x => String(x.status) === 'ACTIVE')
    .map(x => ({
      org_id: String(x.org_id || ''),
      parent_org_id: String(x.parent_org_id || ''),
      level: Number(x.level || 0),
      org_type: String(x.org_type || ''),
      org_name: String(x.org_name || ''),
      short_name: String(x.short_name || x.org_name || ''),
      normalized_name: String(x.normalized_name || normalizeText_(x.org_name || '')),
      sort_order: Number(x.sort_order || 9999)
    }))
    .sort((a,b) => a.level - b.level || a.sort_order - b.sort_order || a.org_name.localeCompare(b.org_name,'vi'));

  const groupRows = tableObjects_(CONFIG.SHEETS.GROUPS)
    .filter(x => String(x.status) === 'ACTIVE')
    .map(x => ({
      group_id: String(x.group_id || ''),
      org_id: String(x.org_id || ''),
      group_type: String(x.group_type || ''),
      group_name: String(x.group_name || ''),
      normalized_name: String(x.normalized_name || normalizeText_(x.group_name || '')),
      sort_order: Number(x.sort_order || 9999)
    }))
    .sort((a,b) => a.sort_order - b.sort_order || a.group_name.localeCompare(b.group_name,'vi'));

  const orgMap = Object.fromEntries(orgRows.map(x => [x.org_id, x.org_name]));
  const groupMap = Object.fromEntries(groupRows.map(x => [x.group_id, x.group_name]));

  const contactRows = tableObjects_(CONFIG.SHEETS.CONTACTS)
    .filter(x => String(x.status) === 'ACTIVE' && isTruthy_(x.public_flag))
    .map(x => publicContactDto_(x, orgMap, groupMap))
    .sort((a,b) => a.sort_order - b.sort_order || a.full_name.localeCompare(b.full_name,'vi'));

  const payload = {
    app: {
      name: CONFIG.APP_NAME,
      version: CONFIG.VERSION,
      root_org_id: CONFIG.ROOT_ORG_ID
    },
    organizations: orgRows,
    groups: groupRows,
    contacts: contactRows,
    generated_at: nowIso_()
  };

  putPublicCache_(payload);
  return payload;
}

function invalidatePublicDirectoryCache_() {
  const cache = CacheService.getScriptCache();
  cache.remove(publicCacheMetaKey_());
  for (let i = 0; i < 30; i++) cache.remove(publicCacheChunkKey_(i));
}

function getPublicStats_() {
  const data = getPublicDirectoryData_(false);
  return {
    organizations: data.organizations.length,
    communes: data.organizations.filter(x => x.level === 2).length,
    level3: data.organizations.filter(x => x.level === 3).length,
    contacts: data.contacts.length
  };
}
