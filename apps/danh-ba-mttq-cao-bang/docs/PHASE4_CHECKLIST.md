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
- [x] Phase 4A runtime-gate automation merged to `main`.
- [x] Automated credential-state result recorded: 57 pending / 57 empty hashes / 57 must-change.
- [x] Phase 4B safe auto-provision merged and runtime PASS.

## Runtime gate / deployment
- [x] Phase 4B branch merged after CI PASS.
- [x] Automated per-user credential bootstrap PASS: 57/57 PROVISIONED.
- [x] Private Drive credential handoff file created and verified PRIVATE by runtime.
- [x] Final credential-state gate PASS: pending/hash/salt empty = 0; must-change = 57.
- [x] Automated first production Web App deployment PASS.
- [x] Production deployment ID and Web App URL recorded by workflow.
- [x] Public/admin HTML smoke PASS.
- [x] Phase 4C clone-only acceptance implementation prepared on protected branch.

## Full acceptance — Phase 4C runtime pending
- [ ] Public directory runtime PASS.
- [ ] Accent-insensitive global search PASS.
- [ ] Public payload does not expose USERS/password/AUDIT/REVIEW internals.
- [ ] Province admin runtime PASS.
- [ ] At least 2 distinct UNIT_ADMIN accounts tested.
- [ ] Cross-scope read/write denied.
- [ ] Password reset invalidates old token.
- [ ] Level-3 own-scope create/update/status PASS.
- [ ] Contact CRUD PASS.
- [ ] Avatar same-scope PASS / cross-scope DENIED / invalid signature DENIED.
- [ ] Review OPTIONAL PASS.
- [ ] Review REQUIRED PASS.
- [ ] Stale review approval denied/error.
- [ ] Real backup creation/read-back PASS.
- [ ] Arbitrary non-registered restore source denied.
- [ ] Restore-on-clone PASS.
- [ ] Production database not used as first restore target.
- [ ] Phase status changed to RUNTIME PASS only after every runtime acceptance item passes.
