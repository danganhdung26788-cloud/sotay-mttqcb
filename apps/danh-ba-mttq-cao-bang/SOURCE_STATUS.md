# Source status

- Project: Danh bạ MTTQ tỉnh Cao Bằng
- Version: 1.1.0
- Phase: **4 BUILD READY — GitHub hardened; runtime gate pending**
- Source import: VERIFIED
- Runtime source path: `apps/danh-ba-mttq-cao-bang/src/`
- Database ID: `1E1pOxwBiQI4GDehXrYYghwULUg6pGZhbILXEOs-vIcY`
- Windows auth helper: `scripts/setup-google-auth.ps1`
- Codex runtime handoff: `CODEX_HANDOFF.md`
- Codex takeover prompt: `CODEX_PROMPT.md`
- GitHub issue: #4 — Codex handoff: finish Danh bạ Phase 4 runtime gate
- Public Apps Script server surface: **ONLY** `doGet`, `publicApi`, `adminApi`
- Server-surface hardening commit: `42d10c7835678d92d50a57ec0aea03c6ae7dabf8`
- Hardening workflow result: PASS
- Hardening validator result: PASS
- Web App manifest: configured
- ZIP source baseline SHA-256: `e00de66d5c30a0ae4dbcefc88fbbd9a7cec725ae21e2437d4f1114cae734ad5f`
- Deployment gate remaining: Google Apps Script OAuth/project creation, source push, runtime regression, credential provisioning if pending, test Web App, acceptance tests, backup/restore-on-clone.

## Current conclusion

All work that can be completed safely through the GitHub connector is prepared. **Do not mark Phase 4 RUNTIME PASS yet.** The next execution environment must have a real Google Apps Script runtime and user OAuth authorization.
