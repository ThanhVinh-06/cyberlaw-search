# Rà soát bảo mật — quản trị người dùng và phân quyền

## Cập nhật thứ tự danh sách

- Chuyển ORDER BY ID sang ASC trước phân trang; cột và chiều sắp xếp cố định, không nhận SQL từ client. Không thay đổi quyền hay dữ liệu.
- AdminUserTest 6 tests/107 assertions PASS, kiểm tra thứ tự ID qua hai trang cùng các ca bảo mật cũ. CRUD HTTP và responsive giả lập 320/440/834/900/901/956×440/1440 PASS. Không chạy lại audit dependency vì không đổi dependency.

## Phạm vi

- API Laravel `GET/POST /api/admin/users`, `POST /status`, `DELETE`.
- Giao diện React thêm, sửa, khóa/mở khóa, xem và xóa tài khoản.
- Dữ liệu kiểm thử dùng SQLite riêng và tài khoản tổng hợp; không ghi vào MySQL đang dùng.

## Kiểm tra và kết quả

- Khách và user thường bị chặn; mọi ghi dữ liệu yêu cầu session, CSRF và origin hợp lệ — **PASS**.
- Không trả mật khẩu băm hoặc mã thu hồi phiên; tìm kiếm dùng binding và escape ký tự LIKE — **PASS**.
- Khóa/xóa/hạ quyền quản trị viên cuối cùng bị chặn; không tự thay đổi quyền truy cập; thay đổi nhạy cảm thu hồi phiên và hủy OTP đang chờ — **PASS**.
- Revision token chống ghi đè cũ; mutex MySQL và transaction khóa danh sách admin; lỗi audit làm rollback — **PASS** trong kiểm thử cô lập.
- Giới hạn đọc 120/phút, ghi 30/phút; kiểm thử vượt giới hạn trả 429 — **PASS**.
- Audit cùng transaction, chỉ ghi ID, loại hành động và thay đổi vai trò/trạng thái; không ghi password, OTP, token hay nội dung chat — **PASS**.
- CRUD HTTP thật và responsive ở 320, 440, 834, 900, 901, 956×440, 1440; modal giữ footer trong viewport, hỗ trợ Escape và reduced motion — **PASS**.

## Giới hạn còn lại

- Chưa chạy kiểm thử tải hoặc kiểm tra đồng thời nhiều tiến trình trên MySQL triển khai.
- Chưa kiểm tra deploy production, SMTP thật, rotation/quyền file log và dependency audit trong lượt này.
- Tài khoản mới do admin tạo phải xác minh email trước khi đăng nhập.
