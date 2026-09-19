# Việc người dùng cần thao tác/cấp quyền

Source/GitHub/CI đã được AI chuẩn bị. Phần còn lại chỉ là các thao tác xác thực Google mà connector hiện tại không thể thay thế.

## Cách ngắn nhất

Từ thư mục gốc repo trên máy Windows, chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\apps\danh-ba-mttq-cao-bang\scripts\setup-google-auth.ps1
```

Anh chỉ cần:
1. Bật Apps Script API khi trình duyệt được mở.
2. Tạo project **Danh bạ MTTQ tỉnh Cao Bằng**.
3. Copy/paste `Script ID` vào PowerShell.
4. Xác nhận OAuth khi `clasp login` mở trình duyệt.
5. Nếu GitHub CLI chưa có, tạo 2 Actions Secrets theo hướng dẫn script in ra.

Sau khi workflow push source PASS:
6. Chạy `setupDatabase()`.
7. Chạy `runPhase4RegressionTests()`.
8. Tạo Web App deployment đầu tiên và chọn phạm vi truy cập.
9. Lưu `CLASP_DEPLOYMENT_ID`.

Không gửi hoặc commit mật khẩu quản trị, refresh token, `.clasprc.json`, private key hoặc OAuth client secret.
