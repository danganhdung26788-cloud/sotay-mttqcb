# Việc người dùng cần thao tác/cấp quyền

Source/GitHub/CI đã được AI chuẩn bị. Người dùng chỉ cần thực hiện các thao tác xác thực mà connector hiện tại không thể thay thế:

1. Bật **Apps Script API**.
2. Tạo standalone Apps Script project cho **Danh bạ MTTQ tỉnh Cao Bằng** và cung cấp `scriptId`.
3. Chạy OAuth `clasp login` trên thiết bị tin cậy.
4. Tạo GitHub Actions Secrets `CLASPRC_JSON` và `CLASP_JSON` theo `DEPLOYMENT.md`.
5. Xác nhận màn hình quyền Google khi Apps Script chạy lần đầu.
6. Tạo Web App deployment đầu tiên trong Apps Script UI.
7. Sau lần deploy đầu, lưu `CLASP_DEPLOYMENT_ID` vào GitHub Actions Secrets.

Không gửi hoặc commit mật khẩu quản trị, refresh token, `.clasprc.json`, private key hoặc OAuth client secret.
