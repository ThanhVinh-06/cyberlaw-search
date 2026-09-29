# Review quên mật khẩu — 29/09/2026

## Phạm vi

Laravel ba endpoint `auth.reset.request/verify/complete`, OTP SMTP, session revocation; React form hiện có. Áp dụng `.agent/cyberlaw-security/SKILL.md`, CL-01/04/06/07/09/10/12/16 và checklist auth/OTP/log. Không commit/push; giữ thay đổi đăng ký và tài liệu trước đó.

## Kiểm soát và kết quả

| Kiểm tra | Kết quả và bằng chứng |
|---|---|
| API auth, CSRF, Origin, giới hạn gửi | PASS — `PasswordResetTest`: từ chối không có CSRF/Origin lạ, không gửi thư/ghi reset; giới hạn IP và cooldown email còn hiệu lực khi đổi session |
| Mã ngẫu nhiên, hash, expiry, attempts | PASS — bcrypt OTP; 5 sai được commit, đúng sau khóa vẫn bị từ chối; expiry áp dụng cả mã và grant |
| Session binding/IDOR/mass assignment | PASS — session khác hoặc email khác bị từ chối, không tin ID/role gửi vào; khóa tài khoản sau verify không đổi được mật khẩu |
| Một lần, gửi lại, transaction | PASS tuần tự — mã mới hủy grant cũ; dùng lại session đã verify không đổi lần hai; lỗi DB giả lập rollback password/consumption rồi retry thành công |
| Phiên sau reset | PASS — PHP test và HTTP thật: phiên đăng nhập trình duyệt khác nhận 401; cookie/grant cũ không replay; đăng nhập password mới được, password cũ bị từ chối |
| Log | PASS — request ID, request/verify/complete/mail_sent có sự kiện, không chứa OTP/grant/email/password canary. Mailer log fail closed 503; SMTP exception trả thông báo chung, hủy mã và không lộ exception. Rotation/fallback hiện có chạy lại trong suite |
| SMTP local | PASS — Mailpit v1.31.3 ZIP SHA-256 đã đối chiếu GitHub metadata, bind loopback/Host allowlist/no relay; HTTP test gửi thư SMTP1026 → đọc Mailpit8026 → nhập mã trong UI → đổi mật khẩu thật trên SQLite |
| Frontend | PASS — build/typecheck; mã minh họa đã bỏ; pending khóa submit/input; lỗi server, email đổi, expiry, resend, keyboard, reduced motion, Axe |
| Responsive giả lập | PASS — ba bước tại 320/390/440/700/701/768/834/900/901/1000/1001/1024/1440/1920px, landscape844×390/956×440; iPhone440px có cảm ứng/menu. Kiểm tra tràn ngang và giới hạn input/button, xem ảnh440/1440. Chưa test thiết bị thật |
| Database phát triển | Chỉ đọc schema/counter. Bảng reset 10 cột đủ dùng, không sửa migration/seed. Lần đọc cuối MySQL có 2 tài khoản active bcrypt và 0 tài khoản miền fixture; số lượng đã thay đổi so với bàn giao cũ1, không tự điều chỉnh dữ liệu người dùng |
| Git/secrets | `.env` và `tmp/tools/mailpit` bị Git bỏ qua; diff được rà, không đưa mật khẩu SMTP/database vào mã. Chưa thực hiện push hoặc quét toàn bộ lịch sử bằng Gitleaks |

## Lệnh đã chạy

- PHPUnit toàn bộ: **44 tests / 363 assertions**, trong đó 12 ca reset. SQLite, Mail fake trong unit/feature; không được gọi là kiểm thử SMTP thật.
- Playwright HTTP thật: **5/5 đạt**, gồm SMTP/reset mới và hồi quy login/register/logout/role. Launcher dùng SQLite và mailbox riêng.
- Playwright UI auth/errors/registration/reset: 15/16 đạt lần đầu; ca touch tạo context riêng thiếu mock nên gọi API local với email giả không tồn tại. Đã gắn fixture đúng cho context đó; chạy lại toàn bộ reset **5/5 đạt**. 11 ca hồi quy tài khoản còn lại đã đạt; không có fixture account nào trong MySQL.
- `npm run build`, `npm run typecheck:e2e`, Pint, `git diff --check`: đạt. Build lần đầu bị sandbox chặn spawn, chạy lại ngoài sandbox đạt; cảnh báo bundle >500kB có sẵn. Không thay dependency ứng dụng.

## Giới hạn còn mở trước deploy

1. **NOT RUN:** race nhiều worker/MySQL/InnoDB; đã có khóa người dùng → yêu cầu reset và session blocking nhưng chưa có bằng chứng tải đồng thời trên MySQL. PHP dev server Windows xử lý tuần tự.
2. **OPEN:** SMTP đồng bộ có thể tạo khác biệt thời gian giữa email tồn tại/không tồn tại khi SMTP >800ms. Thông báo/status/metadata giống nhau; timebox local không bảo đảm chống dò qua timing trên production. Cần queue bền vững với payload bảo vệ, retry và đo lại trước release.
3. **NOT RUN:** SMTP Internet, nhận thư Gmail/Outlook, SPF/DKIM/DMARC, bounce; user hiện chỉ yêu cầu Mailpit miễn phí. Không hứa email deploy hoạt động khi chưa cấu hình/test nhà cung cấp.
4. **OPEN vận hành:** dọn yêu cầu reset hết hạn, quota/rotation dung lượng log, ACL thực tế, cảnh báo nhận được, HTTPS/proxy và session/cache nhiều instance. Log ngày và giới hạn retention đã có; không tương đương hoàn thành mọi mục logging.
5. Không cài/chạy Gitleaks, SAST/DAST staging ở lượt này. Không có dependency mới; audit dependency lần trước vẫn là kết quả lần trước.

Đã hoàn thành luồng local trong phạm vi kiểm thử trên; **chưa kết luận deploy-ready**.
