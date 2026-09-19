# Danh bạ MTTQ tỉnh Cao Bằng

Google Apps Script Web App quản lý và tra cứu danh bạ MTTQ tỉnh Cao Bằng theo mô hình 3 cấp.

## Trạng thái
**V1.1 – Phase 4 BUILD READY, GitHub CI PASS; chờ Apps Script runtime authorization/test.**

Read-back baseline:
- 57 đơn vị, trong đó 56 xã/phường.
- 466 hồ sơ liên hệ.
- 57 tài khoản, trong đó 56 `UNIT_ADMIN`.
- 8 hồ sơ `REVIEW_QUEUE`.

Database vận hành: `1E1pOxwBiQI4GDehXrYYghwULUg6pGZhbILXEOs-vIcY`.

## Chức năng
- Public directory, tìm kiếm không dấu, cây 3 cấp.
- Admin theo scope.
- CRUD/soft-delete/chuyển đơn vị.
- Admin xã tự quản lý cấp 3.
- Import/Export CSV.
- Tài khoản, session versioning, audit.
- Avatar Drive.
- Review workflow `OPTIONAL` / `REQUIRED`.
- Backup/restore có snapshot.
- Regression tests Phase 4.

## Source of Truth
GitHub `main` tại `danganhdung26788-cloud/sotay-mttqcb` là source code được phép deploy production. Google Drive giữ database, hồ sơ dự án và backup.

## Branch
- `main`: source được phép deploy production.
- `develop`: phát triển/kiểm thử.
- `release/v1.1-phase4-build-ready`: checkpoint V1.1 Phase 4.

## Validate
```bash
node scripts/validate.mjs
```

## Apps Script
Không commit `.clasp.json`, `.clasprc.json`, token hoặc mật khẩu. Xem `docs/DEPLOYMENT.md`.
