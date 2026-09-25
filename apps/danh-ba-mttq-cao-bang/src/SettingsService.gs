function settingsMap_(forceRefresh) {
  const cache = CacheService.getScriptCache();
  const key = 'SETTINGS_V11:' + activeDbId_();
  if (!forceRefresh) {
    const cached = cache.get(key);
    if (cached) return JSON.parse(cached);
  }
  const map = {};
  tableObjects_(CONFIG.SHEETS.SETTINGS).forEach(r => {
    map[String(r.key || '')] = String(r.value == null ? '' : r.value);
  });
  const json = JSON.stringify(map);
  if (json.length < 90000) cache.put(key, json, 300);
  return map;
}
function setting_(key, fallback) {
  const m = settingsMap_(false);
  return Object.prototype.hasOwnProperty.call(m, key) ? m[key] : fallback;
}
function settingBool_(key, fallback) {
  const v = setting_(key, fallback ? 'TRUE' : 'FALSE');
  return v === true || String(v).toUpperCase() === 'TRUE' || String(v) === '1';
}
function settingInt_(key, fallback) {
  const n = Number(setting_(key, fallback));
  return Number.isFinite(n) ? n : Number(fallback || 0);
}
function invalidateSettingsCache_() {
  CacheService.getScriptCache().remove('SETTINGS_V11:' + activeDbId_());
}
