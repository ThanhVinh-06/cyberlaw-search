# Quên mật khẩu qua email

Cập nhật 29/09/2026. Form đã nối Laravel: gửi email → xác nhận mã → đặt mật khẩu mới → quay về đăng nhập. Local dùng Mailpit miễn phí, thư được giữ trên máy và không chuyển ra Gmail/Outlook.

## Anh thử trên máy

1. Giữ Laravel ở `127.0.0.1:8000` và Vite ở `127.0.0.1:5173` đang chạy.
2. Nếu Mailpit chưa chạy, mở PowerShell tại thư mục dự án và chạy:

   ```powershell
   .\scripts\start-mailpit.ps1
   ```

3. Mở [trang đăng nhập](http://127.0.0.1:5173/login), nhập email của tài khoản đã đăng ký rồi chọn **Quên mật khẩu?**.
4. Chọn **Gửi mã xác nhận**, mở [hộp thư Mailpit](http://127.0.0.1:8025), lấy mã trong thư CyberLaw.
5. Nhập mã và mật khẩu mới hai lần. Thành công sẽ quay về đăng nhập; mật khẩu mới được lưu thật trong MySQL dưới dạng bcrypt.

Không phải mua dịch vụ để thử luồng này. Email không tồn tại/tài khoản khóa vẫn nhận thông báo chung nhưng không có thư. Mã hết hạn sau 5 phút, tối đa 5 lần nhập sai; gửi lại sau 30 giây. Nếu tải lại trang hoặc đổi email giữa chừng, gửi mã mới để bắt đầu lại. Mailpit không tự khởi động cùng Windows; hộp thư tạm được xóa khi Mailpit thoát bình thường, tối đa 100 thư/24 giờ trong lúc chạy.

## Cấu hình local

Đã đặt trong `backend/api/.env` cục bộ, Git bỏ qua:

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_URL=null
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS=cyberlaw@example.test
MAIL_FROM_NAME="CyberLaw"
```

Sau khi sửa cấu hình chạy `C:\xampp\php\php.exe backend/api/artisan config:clear` từ thư mục gốc. API chỉ dùng SMTP; cấu hình mailer `log`, `array` hoặc `failover` bị từ chối để tránh ghi mã vào log. SMTP timeout 5 giây cho thao tác mạng. Mailpit chỉ bind loopback, giới hạn Host `127.0.0.1,localhost`, không bật relay/forward.

Máy mới: tải `mailpit-windows-amd64.zip` từ [release chính thức](https://github.com/axllent/mailpit/releases), kiểm tra SHA-256 theo metadata release rồi giải nén thành `tmp/tools/mailpit/mailpit.exe`. Máy hiện tại dùng **v1.31.3**, checksum ZIP đã kiểm tra: `863e9502d4e0f14a78c0f91c5091797b1c7b7b7e3fc7e5eab62e5770ce44b76e`. Binary/thư thử không nằm trong Git. Tham khảo [cài Mailpit](https://mailpit.axllent.org/docs/install/) và [các tùy chọn chạy](https://mailpit.axllent.org/docs/configuration/runtime-options/).

## API và dữ liệu

| Endpoint POST | Body | Kết quả |
|---|---|---|
| `/api/auth/password/request` | `email` | 202, thông báo chung, `expires_in`, `resend_after` |
| `/api/auth/password/verify` | `email`, `code` | 200 sau xác minh; quyền đặt lại nằm trong session server |
| `/api/auth/password/complete` | `email`, `password`, `password_confirmation` | 200 sau transaction cập nhật mật khẩu và đánh dấu đã dùng |

Mọi POST cần cookie phiên và CSRF từ `/api/auth/csrf`; cùng origin. Không trả OTP/hash/token, không truyền chúng qua URL hoặc browser storage. Form chỉ hiển thị mật khẩu mới sau khi server xác nhận mã. Mã gốc chỉ ở email và ô nhập; server lưu bcrypt OTP, SHA-256 của grant ngẫu nhiên 256 bit. Grant gốc chỉ ở session server.

Dùng bảng sẵn có `yeu_cau_dat_lai_mat_khau` với **10 cột**, đủ hỗ trợ nghiệp vụ. Không thêm/chạy lại migration, không dùng Password Broker mặc định vì schema tiếng Việt khác schema của Laravel. Gửi lại hủy yêu cầu cũ; khóa bản ghi người dùng trước yêu cầu reset trong mọi transaction. Route dùng session blocking. Đổi mật khẩu + tiêu thụ grant + hủy yêu cầu còn lại cùng transaction.

Phiên login lưu fingerprint HMAC của password hash. `account.active` so sánh mỗi request bảo vệ; sau reset các phiên cũ bị từ chối ở request kế tiếp. Những phiên tạo trước khi có kiểm soát này cần đăng nhập lại một lần. Mọi API bảo vệ mới phải dùng middleware này.

Giới hạn: gửi 5/phút/IP, 20/giờ/IP, 10/giờ/email; chờ 30 giây/email giữa lần gửi; verify/complete tổng 20/phút/IP. Cache key dùng HMAC. Mật khẩu 8 ký tự trở lên, tối đa 72 byte UTF-8, giữ nguyên khoảng trắng, không nhận ký tự null.

## Kiểm thử

```powershell
cd E:\cyberlaw-search\backend\api
C:\xampp\php\php.exe vendor/bin/phpunit
cd E:\cyberlaw-search\frontend
npm run build
npm run typecheck:e2e
npx playwright test e2e/reset-password.spec.ts
npx playwright test --config playwright.auth.config.ts
```

PHPUnit dùng SQLite riêng; HTTP integration dùng `storage/framework/testing/auth-browser.sqlite`, Mailpit riêng ở SMTP1026/UI8026. Launcher tự mở/đóng mailbox test; cần binary local phía trên. Không seed hoặc đổi tài khoản MySQL thật. Review/bằng chứng: [báo cáo quên mật khẩu](../security/reviews/2026-09-29-password-reset.md).

## Khi deploy

- Thay Mailpit bằng nhà cung cấp SMTP gửi email thật; xác minh sender/domain, SPF/DKIM/DMARC và TLS theo dịch vụ. Giữ mật khẩu SMTP ngoài Git. Thử nhận thư, spam/bounce trên hộp thư thật được phép trước khi mở cho người dùng.
- HTTPS, cookie secure, Origin chính xác, PHP-FPM/nginx, `APP_DEBUG=false`, session/cache tập trung nếu nhiều instance; không công khai Mailpit.
- Hiện gửi SMTP đồng bộ. Mức chờ tối thiểu 800ms giảm khác biệt thời gian phản hồi local nhưng không che được SMTP chậm hơn mức này. Trước production cần queue có lưu trữ bền vững/mã hóa payload, retry và giới hạn thời gian; đo lại khả năng dò email qua thời gian phản hồi.
- Cần test request đồng thời trên MySQL/InnoDB và nhiều worker; SQLite/PHP development server không chứng minh khóa hàng dưới tải thật. Cần lịch dọn yêu cầu đã hết hạn, kiểm soát quota log, quyền filesystem và cảnh báo mail_failed; các mục vận hành cũ vẫn theo checklist deploy.

Chưa xác nhận sẵn sàng production. Không cần mua SMTP trong giai đoạn thử bằng Mailpit.
