# Tiếp nhận khung backend từ Claude

Phạm vi: đọc Markdown và đối chiếu Laravel/model/cấu hình với DB hiện có. Không triển khai toàn bộ auth, không thay schema, không đọc hoặc in mật khẩu trong `.env`. Các ngày 30/09/2026 theo bản bàn giao Claude.

## Xác nhận thực tế

- PHP CLI `C:\xampp\php\php.exe`: 8.2.12; Laravel 12.69.2; PHPUnit 11.5.56.
- Bootstrap Laravel và chỉ đọc metadata/count: kết nối là `cyberlaw_app`; 11 bảng, 101 cột; cả 11 model đếm được 0 bản ghi. Không chạy migration/seed.
- Route ứng dụng hiện chỉ là `/` trả welcome; có health route framework. Chưa có auth API, Sanctum chưa nằm trong `composer.json`.
- Cấu hình PHPUnit dùng SQLite memory, session/cache array và mail array. Test mới không ghi DB.

## Phát hiện và xử lý

| ID | Bằng chứng/tác động | Trạng thái |
|---|---|---|
| BH-01 | `NguoiDung.getAuthPassword()` đọc `mat_khau` nhưng `getAuthPasswordName()` kế thừa trả `password`; provider dùng tên này để rehash nên sẽ ghi sai cột khi cần cập nhật hash | FIXED: đặt `$authPasswordName = 'mat_khau'`; test provider rehash thực, mock duy nhất thao tác save, kiểm tra đúng field/hash |
| BH-02 | Model reset serialize cả hash OTP và hash token; có nguy cơ lộ nếu controller trả model trực tiếp sau này, chưa có endpoint chứng minh rò ra ngoài | FIXED: thêm `$hidden`; test `toArray/toJson` bằng chuỗi giả. API sau này vẫn cần DTO allowlist |
| BH-03 | Password broker mặc định trong `config/auth.php` trỏ bảng Việt hóa, trong khi repository chuẩn Laravel truy vấn `email/token/created_at`; chỉ đổi tên bảng chưa tương thích | OPEN: không dùng broker mặc định cho OTP; triển khai service riêng/adapter có test ở bước reset |
| BH-04 | `composer.json` còn script scaffold `setup/post-create-project-cmd` có key generation, migrate và frontend npm riêng | OPEN: chưa chạy các script đó. Chuẩn hóa lệnh setup riêng cho React + schema SQL hiện hữu trước khi bàn giao cài đặt |
| BH-05 | `.env.example` có `MAIL_MAILER=log`; nếu gửi OTP bằng cấu hình này sẽ ghi nội dung mail chứa mã | OPEN: trước làm reset chọn mail test bằng array hoặc hộp thư test có quyền truy cập; production dùng dịch vụ gửi thật, không ghi OTP vào log |
| BH-06 | Bảng audit đã tồn tại nhưng chưa có service ghi cùng transaction hoặc exporter/retry ra file | OPEN: triển khai với nghiệp vụ đặc quyền và kiểm thử lỗi/restart; không coi bảng tồn tại là đã có log đầy đủ |

## Kiểm tra

- PASS: `php vendor/bin/phpunit` — **5 tests, 13 assertions**, gồm 2 test scaffold và 3 test model mới.
- PASS: guard fillable ngăn gán hàng loạt `vai_tro/trang_thai`; kiểm tra bằng model trong bộ test mới. Không thay thế kiểm tra policy API.
- PASS: kết nối DB chỉ đọc metadata/count qua Laravel; không xuất dữ liệu tài khoản hoặc secrets.
- NOT RUN: auth HTTP/CSRF/ownership/OTP/rate limit/logger/DAST; chức năng chưa có.
- NOT RUN: Composer advisory audit/secret scan tự động trong lượt đọc bàn giao; không kết luận dependencies PHP an toàn từ test PHPUnit.
- N/A responsive: không thay frontend hoặc phản hồi API đang được frontend dùng.

Kết luận: khung đủ để bắt đầu mốc auth server. Tiếp theo: chuẩn hóa setup/config, Sanctum SPA và logging có che dữ liệu; register/login/me/logout và policy; nối React và kiểm thử HTTP + responsive. Giữ reset/email là mốc riêng với các mục BH-03/BH-05 cần xử lý trước. Không có tuyên bố deploy-ready.
