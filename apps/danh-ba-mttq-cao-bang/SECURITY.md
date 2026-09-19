# Security

- Repo nên để private.
- Không commit `.clasprc.json`, `.clasp.json`, token hoặc mật khẩu.
- Backend kiểm tra scope cho mutation.
- Mật khẩu chỉ lưu hash + salt.
- Reset mật khẩu tăng `password_version` để vô hiệu session cũ.
- Avatar tối đa 2 MB, chỉ JPG/PNG/WebP.
- `PUBLIC_AVATAR_SHARING` mặc định `FALSE`.
- Restore không phục hồi `USERS`, `AUDIT_LOG`, `BACKUP_LOG`.
- Trước restore tự tạo backup.
- Production chỉ deploy từ `main`.
