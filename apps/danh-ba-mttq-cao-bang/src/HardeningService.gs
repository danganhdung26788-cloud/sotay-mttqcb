function sanitizeText_(value, maxLen) {
  const n = Number(maxLen || CONFIG.LIMITS.MAX_TEXT_LENGTH);
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, n);
}
function validateEmail_(value) {
  const s = sanitizeText_(value, CONFIG.LIMITS.MAX_EMAIL_LENGTH);
  if (!s) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error('Email không hợp lệ.');
  return s;
}
function safeEquals_(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function requireProvinceAdmin_(session) {
  if (!isProvinceAdmin_(session)) throw new Error('Chỉ Admin cấp tỉnh được thực hiện thao tác này.');
}
function passwordVersion_(user) {
  return String((user && user.password_version) || 'V1');
}
function withScriptLock_(waitMs, fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(Number(waitMs || 20000));
  try { return fn(); } finally { lock.releaseLock(); }
}
function redactSecrets_(obj) {
  const clone = JSON.parse(JSON.stringify(obj || {}));
  ['password','currentPassword','newPassword','temporary_password','password_hash','password_salt','base64'].forEach(k => {
    if (Object.prototype.hasOwnProperty.call(clone, k)) clone[k] = '[REDACTED]';
  });
  return clone;
}
