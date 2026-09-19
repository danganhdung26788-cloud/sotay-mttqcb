# Việc người dùng cần thao tác/cấp quyền

1. Tạo repo GitHub **private** `danh-ba-mttq-cao-bang`.
2. Cho GitHub connector trong ChatGPT quyền push vào repo.
3. Bật Apps Script API.
4. Tạo Apps Script project và lấy `scriptId`.
5. Thực hiện OAuth `clasp login` trên thiết bị tin cậy.
6. Thêm GitHub Secrets theo `DEPLOYMENT.md`.
7. Xác nhận quyền Google khi Apps Script chạy lần đầu.
8. Tạo Web App deployment đầu tiên và chọn phạm vi truy cập phù hợp.

Không gửi mật khẩu quản trị hoặc refresh token vào commit/chat không cần thiết.
