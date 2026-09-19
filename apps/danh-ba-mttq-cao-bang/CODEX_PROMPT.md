You are taking over the Danh bạ MTTQ tỉnh Cao Bằng project at Phase 4 runtime gate.

Read `apps/danh-ba-mttq-cao-bang/CODEX_HANDOFF.md` first and treat it as the operational contract. Work only from the current GitHub source of truth in `danganhdung26788-cloud/sotay-mttqcb`. Do not rebuild Phase 1–4 and do not overwrite the unrelated root GitHub Pages/Tarot app.

Your job is to finish everything that requires a real local/browser/Apps Script runtime: validate the current main branch, complete Google Apps Script OAuth with the user, configure clasp, push source, run database/regression checks, provision credentials only if still pending, create/test the Web App deployment, execute the full acceptance matrix, test restore only on a clone/test DB, update the Phase 4 checklist/status, and leave the repo at a documented RUNTIME PASS state.

Never expose or commit passwords, OAuth refresh tokens, .clasprc.json, or GitHub secrets. Stop for explicit user authorization whenever Google OAuth or a destructive/production restore gate requires it.
