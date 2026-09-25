# Source status

- Project: Danh bạ MTTQ tỉnh Cao Bằng
- Version: 1.1.0
- Phase: **4 RUNTIME PASS**
- Source import: VERIFIED
- Runtime source path: `apps/danh-ba-mttq-cao-bang/src/`
- Database ID: `1E1pOxwBiQI4GDehXrYYghwULUg6pGZhbILXEOs-vIcY`
- Production Web App: https://script.google.com/macros/s/AKfycbwmVqvqZoelpQb30PMsczG7b1Zr3tC724ZVjWq41oLplK-oMSAKlibCy6QkojZEAyHo/exec
- Accepted runtime commit: `4d0dbc71cd750a756fc503dde0dedeaa51ad8e5c`
- Accepted runtime workflow: `Danh ba MTTQ - Runtime Gate + Deploy`, run `36096260212`
- Public Apps Script server surface: **ONLY** `doGet`, `publicApi`, `adminApi`
- OAuth/clasp source push: PASS
- Runtime baseline/regression: PASS
- Credential bootstrap: PASS — 57/57 `PROVISIONED`, 57/57 `must_change_password=TRUE`
- Phase 4C clone-only acceptance: PASS
- Backup/restore-on-clone: PASS
- Acceptance clone cleanup: PASS
- Production public/admin HTML smoke: PASS
- Public UI V2: PASS — compact header/search, collapsible sidebar, compact group filters, 4-column cards, list view, reduced red accents, responsive mobile/tablet
- Ban/Nhóm Admin + public level/position filters: PASS — scoped CRUD, contact assignment, cross-scope deny, level filter, position filter
- Production read-back after acceptance: 57 organizations / 56 communes / 0 level-3 test rows / 26 active groups / 466 contacts / 57 users / 56 UNIT_ADMIN

## Current conclusion

Phase 4 đã hoàn tất runtime gate và acceptance. Production database không được dùng làm restore target thử nghiệm; mutation acceptance chạy trên private clone và đã được cleanup trước khi production deployment được cập nhật.

Trạng thái chính thức: **RUNTIME PASS**.
