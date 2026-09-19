import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve('apps/danh-ba-mttq-cao-bang');
const srcRoot = path.join(appRoot, 'src');
const validatorPath = path.join(appRoot, 'scripts', 'validate.mjs');

const internalFunctions = [
  'provisionAllAdminPasswords','login','logout','changePassword',
  'getOrganizationTree','createLevel3Organization','setOrganizationStatus',
  'searchContacts','createContact','verifyDatabase','setupDatabase',
  'getPublicDirectoryData','getPublicStats','include',
  'adminLogin','adminBootstrap','adminLogout','adminChangePasswordPhase4',
  'listAdminContacts','adminCreateContact','adminUpdateContact','adminSetContactStatus','adminMoveContacts',
  'listLevel3Organizations','adminCreateLevel3','adminUpdateLevel3','adminSetLevel3Status',
  'listAdminUsers','adminResetUserPassword','adminSetUserStatus',
  'previewImportContacts','commitImportContacts','exportContactsCsv','commitImportContactsPhase4',
  'listAdminAudit','adminUploadAvatar','adminRemoveAvatar',
  'adminSaveContactPhase4','adminSetContactStatusPhase4','listReviewRequests','adminReviewRequest',
  'adminCreateDatabaseBackup','adminListBackups','adminPreviewRestore','adminRestoreOperationalData',
  'runPhase4RegressionTests','runPhase4ScopeSmokeTest'
];

const textExts = new Set(['.gs','.html','.md','.ps1','.mjs']);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (textExts.has(path.extname(entry.name))) files.push(p);
  }
}
walk(appRoot);

function escapeRe(s) {
  return s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
}

let changed = 0;
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  const before = text;

  for (const name of internalFunctions) {
    const re = new RegExp('\\b' + escapeRe(name) + '\\s*\\(', 'g');
    text = text.replace(re, name + '_(');
  }

  if (file === validatorPath) {
    for (const name of internalFunctions) {
      const single = new RegExp("'" + escapeRe(name) + "'", 'g');
      const dbl = new RegExp('"' + escapeRe(name) + '"', 'g');
      text = text.replace(single, "'" + name + "_'");
      text = text.replace(dbl, '"' + name + '_"');
    }

    if (!text.includes('UNEXPECTED_PUBLIC_SERVER_FUNCTION')) {
      text = text.replace(
        "if (failed) {\n  console.error('FAIL: Danh ba Phase 4 validation');",
        `const allowedPublicServerFunctions = new Set(['doGet','publicApi','adminApi']);
for (const f of fs.readdirSync(src).filter(x => x.endsWith('.gs'))) {
  const code = fs.readFileSync(path.join(src,f),'utf8');
  for (const m of code.matchAll(/(?:^|\\n)\\s*function\\s+([A-Za-z0-9_$]+)\\s*\\(/g)) {
    const name = m[1];
    if (!name.endsWith('_') && !allowedPublicServerFunctions.has(name)) {
      console.error('UNEXPECTED_PUBLIC_SERVER_FUNCTION', f, name);
      failed = true;
    }
  }
}

if (failed) {
  console.error('FAIL: Danh ba Phase 4 validation');`
      );
    }
  }

  if (text !== before) {
    fs.writeFileSync(file, text, 'utf8');
    changed++;
  }
}

const exposed = [];
for (const f of fs.readdirSync(srcRoot).filter(x => x.endsWith('.gs'))) {
  const code = fs.readFileSync(path.join(srcRoot,f),'utf8');
  for (const m of code.matchAll(/(?:^|\n)\s*function\s+([A-Za-z0-9_$]+)\s*\(/g)) {
    const name = m[1];
    if (!name.endsWith('_')) exposed.push(f + ':' + name);
  }
}

const allowed = new Set(['Code.gs:doGet','Code.gs:publicApi','Code.gs:adminApi']);
const unexpected = exposed.filter(x => !allowed.has(x));
if (unexpected.length) {
  console.error('Unexpected public Apps Script functions:', unexpected);
  process.exit(1);
}

console.log('HARDENED_FILES=' + changed);
console.log('PUBLIC_SERVER_SURFACE=' + exposed.join(','));
