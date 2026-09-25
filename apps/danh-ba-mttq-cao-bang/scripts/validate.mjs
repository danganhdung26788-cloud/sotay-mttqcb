import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const src = path.resolve('src');
const required = [
  'Config.gs','Utils.gs','AuditService.gs','HardeningService.gs','SettingsService.gs','AuthService.gs',
  'PermissionService.gs','OrganizationService.gs','ContactService.gs','DatabaseSetup.gs',
  'PublicDirectoryService.gs','ViewHelpers.gs','AdminPortalService.gs','ContactAdminService.gs',
  'OrganizationAdminService.gs','GroupAdminService.gs','UserAdminService.gs','ImportExportService.gs','ImportPhase4Service.gs',
  'AuditQueryService.gs','AvatarService.gs','ReviewWorkflowService.gs','BackupService.gs',
  'Phase4RegressionTest.gs','CredentialProvisionService.gs','RuntimeGateConfig.gs','RuntimeGateService.gs','RuntimeAcceptanceService.gs','Code.gs','Index.html','Styles.html','Client.html','Admin.html',
  'AdminStyles.html','AdminClient.html','appsscript.json'
];

let failed = false;

for (const f of required) {
  if (!fs.existsSync(path.join(src,f))) {
    console.error('MISSING', f);
    failed = true;
  }
}

for (const f of fs.readdirSync(src).filter(x => x.endsWith('.gs'))) {
  const code = fs.readFileSync(path.join(src,f),'utf8');
  try {
    new vm.Script(code,{filename:f});
  } catch (e) {
    console.error('SYNTAX', f, e.message);
    failed = true;
  }
}

for (const f of ['Client.html','AdminClient.html']) {
  const html = fs.readFileSync(path.join(src,f),'utf8');
  const m = html.match(/<script>([\s\S]*)<\/script>/);
  if (!m) {
    console.error('SCRIPT_TAG', f);
    failed = true;
    continue;
  }
  try {
    new vm.Script(m[1],{filename:f});
  } catch (e) {
    console.error('SYNTAX', f, e.message);
    failed = true;
  }
}

const sourceFiles = fs.readdirSync(src).filter(f => /\.(gs|html|json)$/.test(f));
const all = sourceFiles.map(f => fs.readFileSync(path.join(src,f),'utf8')).join('\n');

const forbiddenDefault = ['Mttq','@123'].join('');
for (const bad of [forbiddenDefault, 'password_hash: "Mttq', "password_hash: 'Mttq"]) {
  if (all.includes(bad)) {
    console.error('FORBIDDEN_SECRET_PATTERN', bad);
    failed = true;
  }
}

const requiredFunctions = [
  'doGet','publicApi','adminApi',
  'verifyDatabase_','setupDatabase_','runPhase4RegressionTests_','runPhase4ScopeSmokeTest_',
  'adminLogin_','adminBootstrap_','adminChangePasswordPhase4_',
  'adminSaveContactPhase4_','adminSetContactStatusPhase4_',
  'listAdminGroups_','adminCreateGroup_','adminUpdateGroup_','adminSetGroupStatus_',
  'adminUploadAvatar_','adminRemoveAvatar_',
  'listReviewRequests_','adminReviewRequest_',
  'adminCreateDatabaseBackup_','adminPreviewRestore_','adminRestoreOperationalData_',
  'runtimeGateResponse_','runRuntimeBaselineGate_','runtimeProvisionPendingCredentials_','runtimeNavigationGate_','provisionPendingCredentials_',
  'activeDbId_','withRuntimeDbOverride_',
  'runtimeAcceptancePrepare_','runtimeAcceptanceCore_','runtimeAcceptanceRestore_','runtimeAcceptanceCleanup_'
];
for (const fn of requiredFunctions) {
  const re = new RegExp('function\\s+' + fn + '\\s*\\(');
  if (!re.test(all)) {
    console.error('MISSING_REQUIRED_FUNCTION', fn);
    failed = true;
  }
}

const config = fs.readFileSync(path.join(src,'Config.gs'),'utf8');
if (!config.includes("VERSION: '1.1.0'")) {
  console.error('VERSION_MISMATCH');
  failed = true;
}
if (!config.includes("DB_ID: '1E1pOxwBiQI4GDehXrYYghwULUg6pGZhbILXEOs-vIcY'")) {
  console.error('DATABASE_ID_MISMATCH');
  failed = true;
}

try {
  const manifest = JSON.parse(fs.readFileSync(path.join(src,'appsscript.json'),'utf8'));
  if (manifest.timeZone !== 'Asia/Ho_Chi_Minh') {
    console.error('MANIFEST_TIMEZONE_MISMATCH');
    failed = true;
  }
  if (manifest.runtimeVersion !== 'V8') {
    console.error('MANIFEST_RUNTIME_MISMATCH');
    failed = true;
  }
  if (!manifest.webapp ||
      manifest.webapp.access !== 'ANYONE_ANONYMOUS' ||
      manifest.webapp.executeAs !== 'USER_DEPLOYING') {
    console.error('WEBAPP_MANIFEST_MISMATCH');
    failed = true;
  }
  const scopes = new Set(manifest.oauthScopes || []);
  for (const scope of [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ]) {
    if (!scopes.has(scope)) {
      console.error('MISSING_OAUTH_SCOPE', scope);
      failed = true;
    }
  }
} catch (e) {
  console.error('MANIFEST_INVALID_JSON', e.message);
  failed = true;
}

const claspIgnorePath = path.resolve('.claspignore');
if (!fs.existsSync(claspIgnorePath)) {
  console.error('MISSING .claspignore');
  failed = true;
} else {
  const rules = fs.readFileSync(claspIgnorePath,'utf8')
    .split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  for (const rule of ['!appsscript.json','!**/*.gs','!**/*.html']) {
    if (!rules.includes(rule)) {
      console.error('CLASPIGNORE_MISSING_RUNTIME_RULE', rule);
      failed = true;
    }
  }
  if (rules.includes('!src/**')) {
    console.error('CLASPIGNORE_WRONG_ROOTDIR_RULE !src/**');
    failed = true;
  }
}

try {
  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'),'utf8'));
  if (pkg.devDependencies?.['@google/clasp'] !== '3.4.1') {
    console.error('CLASP_VERSION_MISMATCH');
    failed = true;
  }
  if (pkg.scripts?.deploy !== 'clasp create-deployment') {
    console.error('CLASP_DEPLOY_SCRIPT_MISMATCH');
    failed = true;
  }
} catch (e) {
  console.error('PACKAGE_INVALID_JSON', e.message);
  failed = true;
}

if (!fs.existsSync(path.resolve('scripts/setup-google-auth.ps1'))) {
  console.error('MISSING_GOOGLE_AUTH_HELPER');
  failed = true;
}

const runtimeGateConfig = fs.readFileSync(path.join(src,'RuntimeGateConfig.gs'),'utf8');
if (!runtimeGateConfig.includes("__RUNTIME_GATE_TOKEN_SHA256__")) {
  console.error('RUNTIME_GATE_CONFIG_MUST_BE_DISABLED_IN_REPO');
  failed = true;
}
const publicIndex = fs.readFileSync(path.join(src,'Index.html'),'utf8');
for (const token of ['<?= webAppUrl ?>?view=admin','levelFilter','positionFilter','resetFiltersBtn']) {
  if (!publicIndex.includes(token)) {
    console.error('PUBLIC_UI_FILTER_OR_ADMIN_ENTRY_MISSING', token);
    failed = true;
  }
}
const adminIndex = fs.readFileSync(path.join(src,'Admin.html'),'utf8');
if (!adminIndex.includes('href="<?= webAppUrl ?>"')) {
  console.error('ADMIN_PUBLIC_ABSOLUTE_LINK_MISSING');
  failed = true;
}
const viewHelpers = fs.readFileSync(path.join(src,'ViewHelpers.gs'),'utf8');
if (!viewHelpers.includes('ScriptApp.getService().getUrl()') ||
    !viewHelpers.includes('template.webAppUrl')) {
  console.error('WEB_APP_ABSOLUTE_URL_BINDING_MISSING');
  failed = true;
}
for (const token of ['data-tab="groups"','groupTbody','addGroupBtn']) {
  if (!adminIndex.includes(token)) {
    console.error('ADMIN_GROUP_UI_MISSING', token);
    failed = true;
  }
}

const codeEntry = fs.readFileSync(path.join(src,'Code.gs'),'utf8');
if (!codeEntry.includes("view === '__runtime_gate'") || !codeEntry.includes('runtimeGateResponse_(e)')) {
  console.error('RUNTIME_GATE_ROUTE_MISSING');
  failed = true;
}

const backupService = fs.readFileSync(path.join(src,'BackupService.gs'),'utf8');
if (backupService.includes('DriveApp.getFileById(CONFIG.DB_ID)') ||
    backupService.includes('source_db_id:CONFIG.DB_ID') ||
    backupService.includes("String(r.source_db_id || '') === String(CONFIG.DB_ID)")) {
  console.error('BACKUP_SERVICE_NOT_CLONE_SAFE');
  failed = true;
}
const utilsSource = fs.readFileSync(path.join(src,'Utils.gs'),'utf8');
if (!utilsSource.includes('RUNTIME_DB_OVERRIDE_ID_') ||
    !utilsSource.includes('SpreadsheetApp.openById(activeDbId_())')) {
  console.error('RUNTIME_DB_OVERRIDE_MISSING');
  failed = true;
}

const allowedPublicServerFunctions = new Set(['doGet','publicApi','adminApi']);
for (const f of fs.readdirSync(src).filter(x => x.endsWith('.gs'))) {
  const code = fs.readFileSync(path.join(src,f),'utf8');
  for (const m of code.matchAll(/(?:^|\n)\s*function\s+([A-Za-z0-9_$]+)\s*\(/g)) {
    const name = m[1];
    if (!name.endsWith('_') && !allowedPublicServerFunctions.has(name)) {
      console.error('UNEXPECTED_PUBLIC_SERVER_FUNCTION', f, name);
      failed = true;
    }
  }
}

if (failed) {
  console.error('FAIL: Danh ba Phase 4 validation');
  process.exit(1);
}
console.log('PASS: structure + JS syntax + secret guard + required functions + manifest + clasp deploy guard');
