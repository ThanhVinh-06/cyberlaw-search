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

## Kiểm tra UI thống kê liên quan

- Khôi phục Fade In Up 950ms cho box xu hướng bằng component reveal dùng chung; không thay đổi API, dữ liệu hoặc quyền.
- Test biểu đồ/modal: 5/5 PASS ở 440px và 834px, gồm reduced motion, bàn phím và không tràn ngang.

## Ma trận quyền

- API trả ma trận cố định từ server, không nhận quyền do client gửi; khách và user nhận 401/403, admin nhận danh sách 8 quyền — **PASS**.
- Gate quản trị được áp dụng cho API tài khoản, ma trận và kho văn bản; PHPUnit toàn bộ: 78 tests/812 assertions — **PASS**.
- Responsive và animation frontend: 15/15 PASS; không có migration hoặc dữ liệu MySQL nào được thay đổi.
