# AuthController: kiểm tra kiểu dữ liệu — 29/09/2026

Người dùng báo file lỗi trong trình soạn thảo. PHP lint trước sửa không có lỗi cú pháp. Đối chiếu vendor: `Auth::guard()` khai báo trả Guard/StatefulGuard (không có attemptWhen trong contract), `Auth::user()` trả Authenticatable|null (không bảo đảm save/only hoặc model NguoiDung). Chưa lấy được diagnostic trực tiếp của extension trong editor; đây là các điểm không khớp kiểu đã xác định từ mã.

- Đã kiểm tra instanceof SessionGuard trước attemptWhen; kiểm tra NguoiDung trước dùng model trong callback/login/me/logout. Dùng getAttribute/setAttribute cho cột động. Không tắt diagnostics hoặc giả ép kiểu bằng docblock.
- Giữ session cookie/CSRF, giới hạn đăng nhập, kiểm tra trạng thái, allowlist DTO/log và fingerprint thu hồi phiên. Trường hợp cấu hình guard/model không phù hợp bị từ chối, không tự cấp phiên/quyền.
- PHP lint/Pint/diff check đạt. PHPUnit toàn bộ44 tests/363 assertions đạt; sau đổi accessor trạng thái, chạy lại LoginTest14 tests/120 assertions đạt.
- HTTP integration5/5 đạt (34.7s): login/register/logout/reset SMTP, cookie cũ, CSRF/storage forgery và quyền user. SQLite + Mailpit riêng, không ghi MySQL phát triển.
- Responsive giả lập trang login khi API trả lỗi:320×568,440×956,834×1194,1440×900,844×390,956×440; input/button trong viewport, không tràn ngang. Không sửa frontend/CSS, không test thiết bị thật.
- Không dependency mới, không đổi env/schema, không push. Giới hạn deploy trong review password-reset vẫn giữ nguyên; chưa chạy static analyzer/diagnostics của IDE trực tiếp.
