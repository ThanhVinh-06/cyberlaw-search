# Review đăng ký

## Phạm vi

Thêm POST `/api/auth/register`, `RegistrationController`, giới hạn đăng ký, log đăng ký và nối form React. Không sửa schema/env, không thêm dependency. Các thay đổi DB/tài liệu có trước được giữ nguyên. Test ghi dữ liệu chỉ dùng SQLite `:memory:` và browser fixture riêng; không tạo tài khoản giả trong MySQL người dùng.

## Kiểm tra

- PASS: PHPUnit **32 test / 238 assertions** (10 ca đăng ký mới). Kiểm tra hash và password có khoảng trắng, chuẩn hóa email, payload giả admin/blocked/ID/remember token không tăng quyền; đăng ký xong vẫn là khách, đăng nhập được bằng mật khẩu vừa tạo.
- PASS: email trùng trả 409, không thay bất kỳ thuộc tính tài khoản cũ; UNIQUE index xử lý INSERT trùng trực tiếp, không dựa trên kiểm tra trước rồi mới ghi. Chưa stress race trên MySQL; không gọi kiểm thử SQLite là kiểm thử MySQL concurrent.
- PASS: thiếu CSRF, origin lạ, body >8KB, array thay string, dữ liệu thiếu/sai/xác nhận khác, bcrypt >72 byte và byte null bị từ chối, không có bản ghi mới. Trường ngoài allowlist bị bỏ qua.
- PASS: 5 lần/phút và 20 lần/giờ theo IP kể cả đổi email. Kế thừa không tin X-Forwarded-For tùy ý; file cache phù hợp một instance, shared store trước scale.
- PASS: đăng ký khi có phiên trả 409, giữ nguyên phiên/tài khoản. DB lỗi trả 500 chung không stack/SQL/password.
- PASS: log `auth.register` có success/failure, request ID; không chứa email, password, CSRF hoặc nested secret canary. Rotation/fallback được test lại trong suite logging hiện có. Đăng ký thường không ghi audit đặc quyền; logger/quota/alert giới hạn như báo cáo login.
- PASS: **4 test HTTP thật** React/Laravel qua proxy, có đăng ký → quay về login → đăng nhập user → chặn admin, email trùng; thêm hồi quy session/logout/CSRF. SQLite cô lập, không giả API trong suite này.
- Build và TypeScript app/e2e đạt; cảnh báo bundle >500KB có từ trước. Không thay dependency; audit trước đó không thay thế kiểm tra logic mới.
- UI: đăng ký lỗi 409/422/429/500, pending, mật khẩu được xóa, email được giữ, giới hạn byte UTF-8 và rời trang trong lúc gửi. Hồi quy login/reset demo và responsive trang tài khoản. Kiểm tra 320/440/834/1440px và landscape cho thông báo lỗi; suite auth có Axe/keyboard/reduced motion. Ca ghi ảnh register-390 lần đầu gặp lỗi mở file Windows, chạy lại đạt. Chỉ giả lập, chưa thiết bị thật.

## Giới hạn trước deploy

Chưa gửi email xác minh; user/active không có nghĩa địa chỉ email đã được xác minh. Phản hồi 201 và 409 khác nhau nên có thể suy đoán email tồn tại dù thông báo trùng không nêu thông tin hồ sơ; rate limit giảm lạm dụng, không xóa rủi ro này. Trước mở đăng ký công khai cần quyết định xác minh email/chống bot; không tự thêm dịch vụ email hoặc gửi thư thật trong lượt này.

Chưa thử race/load trên MySQL, scanner SAST/DAST hoặc ACL/HTTPS/monitoring trên hosting. Không kết luận deploy-ready. Tham khảo [Laravel 12 validation](https://laravel.com/docs/12.x/validation); hướng dẫn vận hành tại [tài khoản](../../backend/01-dang-nhap.md).
