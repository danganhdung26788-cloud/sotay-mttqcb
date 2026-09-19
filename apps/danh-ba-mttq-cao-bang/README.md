# Danh bạ MTTQ tỉnh Cao Bằng

Google Apps Script Web App quản lý và tra cứu danh bạ MTTQ tỉnh Cao Bằng theo mô hình 3 cấp.

## Trạng thái
**V1.1 – Phase 4 BUILD READY, chờ runtime test/deploy.**

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
Sau khi repo GitHub chính thức được tạo và push, `main` là source được phép deploy production. Drive giữ database, tài liệu và backup.

## Branch
- `main`: baseline đã chốt.
- `develop`: phát triển/kiểm thử.
- tag: `v1.1-phase4-build-ready`.

## Validate
```bash
node scripts/validate.mjs
```

## Apps Script
Không commit `.clasp.json` hoặc `.clasprc.json`. Xem `docs/DEPLOYMENT.md`.
