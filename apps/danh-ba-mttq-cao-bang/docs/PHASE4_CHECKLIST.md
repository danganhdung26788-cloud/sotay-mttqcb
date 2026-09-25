# Phase 4 Gate

## GitHub / static gate
- [x] Database V1.1 schema/read-back baseline.
- [x] Source backend Phase 4.
- [x] UI patch Phase 4.
- [x] Static source merge.
- [x] Session versioning code.
- [x] Avatar MIME/size guard.
- [x] Avatar byte-signature guard.
- [x] Review workflow.
- [x] Stale-review protection.
- [x] Backup/restore.
- [x] Restore restricted to registered BACKUP_LOG entries.
- [x] First-column/key-row handling for reads and appends.
- [x] Public directory chunked cache.
- [x] Level-3 hierarchy/type/status/duplicate-name validation.
- [x] Contact target-org/group/order validation.
- [x] Contact avatar can only be changed by AvatarService.
- [x] Web App manifest configured.
- [x] CI static validation.
- [x] Internal Apps Script functions hidden with trailing `_`.
- [x] Public server surface limited to `doGet`, `publicApi`, `adminApi`.
- [x] OAuth/clasp linked to real Apps Script project.
- [x] `CLASPRC_JSON` and `CLASP_JSON` configured.
- [x] Source push to Apps Script PASS.
- [x] `setupDatabase_()` PASS.
- [x] `verifyDatabase_()` baseline PASS: 57 organizations / 56 communes / 466 contacts / 57 users / 56 UNIT_ADMIN.
- [x] `runPhase4RegressionTests_().ok === true`.
- [x] Phase 4A runtime-gate automation merged.
- [x] Phase 4B credential bootstrap merged and runtime PASS.
- [x] Phase 4C clone-only acceptance merged and runtime PASS.

## Runtime gate / deployment
- [x] Automated per-user credential bootstrap PASS: 57/57 PROVISIONED.
- [x] Private Drive credential handoff verified PRIVATE by runtime.
- [x] Final credential-state gate PASS: pending/hash/salt empty = 0; must-change = 57.
- [x] Automated production Web App deployment PASS.
- [x] Production Web App URL recorded.
- [x] Public/admin HTML smoke PASS.
- [x] Production read-back after acceptance unchanged: 57 organizations / 56 communes / 0 level-3 test rows / 466 contacts / 57 users / 56 UNIT_ADMIN.

## Full acceptance — PASS
- [x] Public directory runtime PASS.
- [x] Accent-insensitive global search PASS.
- [x] Public payload does not expose USERS/password/AUDIT/REVIEW internals.
- [x] Province admin runtime PASS.
- [x] At least 2 distinct UNIT_ADMIN accounts tested.
- [x] Cross-scope read/write denied.
- [x] Password reset invalidates old token.
- [x] Level-3 own-scope create/update/status PASS.
- [x] Duplicate level-3 under same parent denied.
- [x] Contact create/update/status/move PASS.
- [x] Unauthorized contact move denied.
- [x] Avatar same-scope PASS / cross-scope DENIED / invalid signature DENIED.
- [x] Review OPTIONAL PASS.
- [x] Review REQUIRED PASS.
- [x] Stale review approval denied and marked ERROR.
- [x] Real backup creation/read-back PASS on clone.
- [x] Arbitrary non-registered restore source denied.
- [x] Registered restore preview PASS.
- [x] PRE_RESTORE backup PASS.
- [x] Restore-on-clone PASS.
- [x] Restore does not overwrite USERS.
- [x] Acceptance clone/test folder cleanup PASS.
- [x] Production database was not used as first restore target.
- [x] Phase status changed to **RUNTIME PASS** after all gates passed.

## Evidence
- Accepted runtime commit: `eaaef4533f4a82ea8f3f9eb627c06270b3001617`
- Runtime workflow run: `36085635653`
- Production Web App: https://script.google.com/macros/s/AKfycbwmVqvqZoelpQb30PMsczG7b1Zr3tC724ZVjWq41oLplK-oMSAKlibCy6QkojZEAyHo/exec
