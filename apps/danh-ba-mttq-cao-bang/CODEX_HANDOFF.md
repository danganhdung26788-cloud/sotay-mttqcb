# CODEX HANDOFF — Danh bạ MTTQ tỉnh Cao Bằng

> **Phase 4A update:** runtime baseline/deployment is now automated by `.github/workflows/danh-ba-deploy.yml`. Do not reintroduce manual wrapper execution, first-deployment UI steps, or `CLASP_DEPLOYMENT_ID` as a required secret. The workflow must return `PASS / REVIEW / BLOCKED` and fail closed on unexpected baseline/runtime errors.

## Mục tiêu
Hoàn tất **Phase 4 runtime gate** và triển khai Google Apps Script Web App từ source đã chuẩn hóa trên GitHub.

## Source of Truth
- Repository: `danganhdung26788-cloud/sotay-mttqcb`
- Project path: `apps/danh-ba-mttq-cao-bang/`
- Production branch: `main`
- Development branch: `develop`
- Release branch: `release/v1.1-phase4-build-ready`
- Current app version: `1.1.0`
- Database ID: `1E1pOxwBiQI4GDehXrYYghwULUg6pGZhbILXEOs-vIcY`
- Avatar folder ID: `1lijMMO-I3xtCXk4WKFtdFtwkG3X1h2wJ`
- Backup root folder ID: `11mkQbQl3g1QA5qDT_eVLwA0SWXdLWycM`

Do **not** edit the root Tarot/GitHub Pages app except when strictly necessary. All Danh bạ work belongs under `apps/danh-ba-mttq-cao-bang/` and its dedicated workflows.

## Baseline dữ liệu bắt buộc
Before any mutation/runtime test, verify:
- 57 organizations total.
- 56 communes/wards.
- 466 contacts.
- 57 users.
- 56 `UNIT_ADMIN`.
- 8 `REVIEW_QUEUE`.
- Level 3 initially 0 unless a runtime/admin test creates test data.

Important database invariant: rows are records only when the **first/key column is non-empty**. Never use `row.some(v => v !== '')` because validation/checkbox rows can contain `FALSE`.

## Security / behavior invariants
1. Public server surface must be only:
   - `doGet`
   - `publicApi`
   - `adminApi`
   Internal Apps Script functions must end with `_`.
2. Backend authorization is mandatory; never rely on UI hiding.
3. `UNIT_ADMIN` may manage only its commune plus level-3 children.
4. Admin commune creates/manages level 3; no preloaded village list required.
5. Password reset increments `password_version` and invalidates old sessions.
6. Never store plaintext passwords/tokens/secrets in repo.
7. Avatar: JPEG/PNG/WebP only, <=2MB, MIME signature must match bytes.
8. `PUBLIC_AVATAR_SHARING=FALSE` by default.
9. Review mode supports `OPTIONAL` / `REQUIRED`; approval must reject stale mutations.
10. Restore may restore operational data only; never restore `USERS`, `AUDIT_LOG`, `BACKUP_LOG`.
11. Restore must accept only backup files registered in `BACKUP_LOG`.
12. Always create PRE_RESTORE backup before restore.
13. Production deploy only from `main`.

## Step 1 — Validate GitHub state
From repo root:

```bash
cd apps/danh-ba-mttq-cao-bang
node scripts/validate.mjs
```

Expected: PASS.

Also inspect current GitHub Actions. Do not proceed while `Danh ba MTTQ - CI` is red.

## Step 2 — Apps Script OAuth / project creation
This requires user authorization.

On trusted Windows workstation, use:

```powershell
cd <repo>\apps\danh-ba-mttq-cao-bang
powershell -ExecutionPolicy Bypass -File .\scripts\setup-google-auth.ps1
```

The script should:
- install `@google/clasp@3.4.1`
- ask user to enable Apps Script API
- ask user to create the Apps Script project
- collect Script ID
- run `clasp login`
- create local ignored `.clasp.json`
- if `gh` exists, write `CLASPRC_JSON` and `CLASP_JSON` secrets
- trigger the deploy workflow

Do not print or commit `.clasprc.json`.

## Step 3 — Push source
Use `.github/workflows/danh-ba-deploy.yml` or:

```bash
npx clasp push -f
```

Confirm all expected `.gs`, `.html`, and `appsscript.json` files exist in the Apps Script project.

## Step 4 — Initial runtime checks
The Phase 4A workflow executes the private maintenance checks automatically through a one-time, SHA-256 protected runtime-gate deployment:

- `setupDatabase_()`
- `verifyDatabase_()`
- `runPhase4RegressionTests_()`
- credential-state check

Do not create temporary editor wrappers for normal operation.

Expected baseline:
- communes = 56
- contacts = 466
- users >= 57
- unit_admins = 56
- duplicate org IDs = 0
- duplicate contact IDs = 0
- bad scopes = 0
- bad level-3 parents = 0
- plaintext password leaks = 0
- avatar folder configured = true
- backup folder configured = true
- overall `ok=true`

If any baseline count differs before deliberate test mutations, STOP and investigate.

## Step 5 — Provision credentials
Only if USERS are still `PENDING_PROVISION`.

Run the private provisioning function from Apps Script editor and let the user type/provide the temporary password locally. Never put the password in GitHub, issue comments, logs, or chat.

All accounts must require password change on first login.

## Step 6 — Web App deployment
The Phase 4A workflow automatically creates the first versioned Web App deployment when runtime gate is PASS. On later runs it discovers the existing production deployment by the `DANH_BA_PRODUCTION` marker and updates it in place.

No manual `CLASP_DEPLOYMENT_ID` secret is required. Do not expose OAuth credentials.

## Step 7 — Runtime acceptance
Test public directory and admin portal.

Required acceptance:
1. Public directory loads.
2. Global search works accent-insensitively.
3. Public payload never exposes USERS/password hashes/AUDIT/REVIEW internals.
4. Login `admin.caobang`.
5. Login at least 2 different `UNIT_ADMIN` accounts.
6. Cross-scope read/write mutation is denied.
7. Admin commune can create a level-3 unit only under own commune.
8. Duplicate level-3 name under same parent is denied.
9. Contact CRUD works.
10. Moving contact across unauthorized scope is denied.
11. Password reset invalidates old session token.
12. Avatar upload same-scope passes; cross-scope denied; invalid MIME signature denied.
13. Review OPTIONAL path works.
14. Review REQUIRED path works.
15. Stale review approval is denied/error.
16. Real backup is created and appears in BACKUP_LOG.
17. Restore preview rejects arbitrary non-registered Spreadsheet IDs.
18. Restore test is performed **only on clone/test DB**, never first on production.
19. After restore-on-clone, baseline and audit expectations remain correct.

## Step 8 — Finalize
When all runtime gates pass:
- update `docs/PHASE4_CHECKLIST.md`
- update `SOURCE_STATUS.md` from BUILD READY to RUNTIME PASS
- capture Web App URL / deployment ID reference without secrets
- sync `develop` and `release/v1.1-phase4-build-ready` to the accepted main commit
- create final release/tag as appropriate

## Stop conditions
Stop and report before destructive action when:
- baseline differs unexpectedly
- cross-scope authorization fails
- regression returns `ok=false`
- restore source is not a registered backup
- the only available restore target is production
- OAuth/Apps Script permissions require user approval

## Definition of Done
Phase 4 is DONE only when:
- GitHub CI PASS
- Apps Script source push PASS
- runtime regression PASS
- public Web App test PASS
- admin tests PASS on province + 2 commune accounts
- security/scope tests PASS
- backup PASS
- restore-on-clone PASS
- deployment URL recorded
- project docs/checklist updated
