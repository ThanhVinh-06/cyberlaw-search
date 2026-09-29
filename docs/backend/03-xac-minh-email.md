# Xác minh email đăng ký

## Luồng đã triển khai

Đăng ký → email chứa mã 6 chữ số → `/verify-email` → xác nhận thành công → đăng nhập. Tài khoản mới chưa xác minh không được tạo phiên đăng nhập hoặc dùng API bảo vệ. Đúng mật khẩu nhưng chưa xác minh trả `403 email_unverified` và mở lại bước xác minh; người dùng bấm **Gửi lại mã**. Sai mật khẩu vẫn trả lỗi chung.

Mã có hiệu lực 5 phút, tối đa 5 lần nhập sai; gửi lại sau 30 giây, tối đa 10 lần/giờ/tài khoản. Gửi lại hủy mã trước. Refresh giữ thời gian và số lần sai từ server. Phiên chờ xác minh sống 30 phút; hết phiên thì đăng nhập bằng mật khẩu để tiếp tục. Thành công không tự đăng nhập, giữ ý định mở lịch sử hỏi đáp. Nếu gửi thư lần đầu lỗi, tài khoản vẫn được tạo và có thể gửi lại; không đăng ký trùng để thử lại.

Form dùng màu/chữ/sidebar tài khoản hiện có, Fade In Up 550ms, hỗ trợ reduced motion/bàn phím. Robot có chỗ riêng dưới form xác minh để tránh che nút và liên kết.

## Thử trên máy phát triển

Chạy MySQL, Laravel cổng 8000, Vite cổng 5173 như [hướng dẫn đăng nhập](01-dang-nhap.md). Mở Mailpit bằng:

```powershell
cd E:\cyberlaw-search
powershell -ExecutionPolicy Bypass -File scripts/start-mailpit.ps1
```

Đăng ký ở `http://127.0.0.1:5173/register`; đọc thư tại `http://127.0.0.1:8025`, nhập mã trong cùng trình duyệt đăng ký. Mailpit bắt thư SMTP cục bộ, **không chuyển thư đến Gmail/Outlook thật**. Khi deploy phải cấu hình SMTP thật và kiểm thử lại theo [hướng dẫn email](02-quen-mat-khau.md#khi-deploy).

## API và dữ liệu

| API | Hợp đồng |
|---|---|
| POST `/api/auth/register` | 201 `{verification_required: true, mail_sent: boolean}`; tạo tài khoản user/active, chưa xác minh |
| GET `/api/auth/email/status` | Email của phiên chờ, `expires_in`, `resend_after`, `locked`; không có OTP/hash |
| POST `/api/auth/email/send` | 202 cùng metadata; không nhận email hoặc ID từ browser |
| POST `/api/auth/email/verify` | `{code}`; 200 rồi hủy phiên chờ, hoặc 422 với `verification_invalid/expired/locked` |

Mọi POST cần session cookie và CSRF; kiểm tra Origin. Phiên chờ được tạo sau đăng ký hoặc kiểm tra đúng mật khẩu, gắn ID/email/fingerprint mật khẩu phía server. Không tin cờ verified/role/ID do client gửi. Đổi mật khẩu làm phiên chờ cũ mất hiệu lực nhưng **không tự xác minh email**.

Hai cột `nguoi_dung.ngay_xac_minh_email` và `duoc_mien_xac_minh_email`; bảng `yeu_cau_xac_minh_email` gồm 8 cột, chỉ lưu bcrypt của OTP. Khóa user trước record trong transaction; timestamp xác minh, tiêu thụ mã và hủy mã khác cùng transaction. Cập nhật lỗi thì rollback cả ba. Dùng dịch vụ riêng vì schema tiếng Việt và luồng nhập mã; không dùng middleware `verified`/signed-link mặc định Laravel. Mọi API bảo vệ phải dùng `account.active`.

Migration `database/migrations/20260930_xac_minh_email.sql` đã được chủ dự án chạy trong Workbench ngày 30/09/2026. Đã đối chiếu chỉ đọc: 2 tài khoản cũ vẫn truy cập được, ngày xác minh còn NULL; default miễn xác minh của tài khoản mới là 0; bảng mới có 8 cột. **Không chạy lại migration hoặc nhập đè schema trên database hiện có.** Tài khoản cũ dùng cờ miễn xác minh để giữ quyền truy cập, không ghi ngày xác minh giả. CLI quản trị `cyberlaw:create-account` cũng cấp miễn xác minh có audit, dành cho người vận hành tin cậy; đăng ký công khai luôn ghi cờ false.

## Kiểm thử và vận hành

Theo yêu cầu chủ dự án, commit chức năng không kèm `.env`, cấu hình database, SQL/migration/dump. Máy clone mới cần được chuẩn bị cấu trúc database tương ứng qua kênh riêng trước khi chạy; không coi repository là gói triển khai đầy đủ.

PHPUnit dùng SQLite riêng; HTTP thật dùng `playwright.auth.config.ts` với SQLite và Mailpit test 1026/8026. Không seed/xóa dữ liệu MySQL của anh. Xem [review và giới hạn](../security/reviews/2026-09-30-email-verification.md).

Sự kiện `auth.email.status/send/verify`, `mail_sent`, `mail_failed`, `initial_send_failed` đi qua logger allowlist có request ID. Không ghi code/password/email thô/cookie/body. Chưa thay chính sách rotation hiện có.

Trước deploy: SMTP/domain/TLS thật, queue bền vững có mã hóa/retry thay SMTP đồng bộ, shared session/cache khi nhiều instance, test race trên MySQL nhiều worker, lịch dọn OTP/tài khoản chưa xác minh, chống bot/quota, ACL/quota/cảnh báo log. Phản hồi đăng ký email trùng còn có thể tiết lộ email đã đăng ký; không coi xác minh email là đã giải quyết dò tài khoản hoặc chứng minh danh tính pháp lý.
