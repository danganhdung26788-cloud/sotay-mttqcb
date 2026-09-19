import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const src = path.resolve('src');
const required = [
  'Config.gs','Utils.gs','AuditService.gs','HardeningService.gs','SettingsService.gs','AuthService.gs',
  'PermissionService.gs','OrganizationService.gs','ContactService.gs','DatabaseSetup.gs',
  'PublicDirectoryService.gs','ViewHelpers.gs','AdminPortalService.gs','ContactAdminService.gs',
  'OrganizationAdminService.gs','UserAdminService.gs','ImportExportService.gs','ImportPhase4Service.gs',
  'AuditQueryService.gs','AvatarService.gs','ReviewWorkflowService.gs','BackupService.gs',
  'Phase4RegressionTest.gs','Code.gs','Index.html','Styles.html','Client.html','Admin.html',
  'AdminStyles.html','AdminClient.html','appsscript.json'
];
let failed=false;
for (const f of required) {
  if (!fs.existsSync(path.join(src,f))) { console.error('MISSING',f); failed=true; }
}
for (const f of fs.readdirSync(src).filter(x=>x.endsWith('.gs'))) {
  const code=fs.readFileSync(path.join(src,f),'utf8');
  try { new vm.Script(code,{filename:f}); } catch(e) { console.error('SYNTAX',f,e.message); failed=true; }
}
for (const f of ['Client.html','AdminClient.html']) {
  const html=fs.readFileSync(path.join(src,f),'utf8');
  const m=html.match(/<script>([\s\S]*)<\/script>/);
  if(!m){console.error('SCRIPT_TAG',f);failed=true;continue;}
  try { new vm.Script(m[1],{filename:f}); } catch(e) { console.error('SYNTAX',f,e.message); failed=true; }
}
const all=fs.readdirSync(src).filter(f=>/\.(gs|html|json)$/.test(f)).map(f=>fs.readFileSync(path.join(src,f),'utf8')).join('\n');
const forbiddenDefault = ['Mttq','@123'].join('');
for (const bad of [forbiddenDefault,'password_hash: \"Mttq',"password_hash:'Mttq"]) {
  if(all.includes(bad)){console.error('FORBIDDEN_SECRET_PATTERN',bad);failed=true;}
}
const config=fs.readFileSync(path.join(src,'Config.gs'),'utf8');
if(!config.includes("VERSION: '1.1.0'")){console.error('VERSION_MISMATCH');failed=true;}
if(failed) process.exit(1);
console.log('PASS: structure + JS syntax + secret guard');
