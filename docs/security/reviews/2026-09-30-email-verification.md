# Rà soát xác minh email đăng ký — 30/09/2026

- Base: `426536b19e862e4d8561e12b42aff40412dd9efe`; thay đổi đang ở working tree, chưa commit/push.
- Phạm vi: registration/login, `account.active`, dịch vụ/ba API xác minh, email, schema tiếng Việt, form React `/verify-email`, fixture và hồi quy tài khoản.
- Môi trường: PHP 8.2.12, Laravel 12.69.2, PHPUnit 11.5.56; Vite/Playwright Chromium (Edge). PHPUnit SQLite riêng; HTTP SQLite và SMTP Mailpit 1026/UI8026 riêng; không gửi ra Internet, không seed hoặc đổi mật khẩu tài khoản MySQL thật.
- Áp dụng `.agent/cyberlaw-security/SKILL.md`, checklist auth/session/CSRF/ownership/rate limit/log trong `docs/security/`. UI áp dụng skill `emil-design-eng`; thời lượng Fade In Up giữ theo quy ước người dùng thay vì rút về thời lượng ngắn của skill.

## Thiết kế và kết quả

| Kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| Backend nghiệp vụ và ca lạm dụng | PASS | `vendor/bin/phpunit`: 55 test / 502 assertions; gồm 11 test mới trong `EmailVerificationTest` |
| Đăng ký → SMTP → nhận thư → nhập mã → đăng nhập | PASS | `playwright.auth.config.ts`: 5/5; có reload trang xác minh, hồi quy reset/đăng nhập/phân quyền/CSRF |
| Hồi quy UI tài khoản | PASS | auth, auth-errors, registration, reset-password, email-verification: 34/34 |
| Responsive sau chỉnh robot | PASS | Chạy lại riêng email-verification 18/18, gồm 14 viewport; xem ảnh320/440/1440 |
| Cú pháp/format/kiểu | PASS | PHP lint 18 file PHP mới/sửa; Pint dirty; build React và typecheck e2e. Chưa đọc diagnostics trực tiếp trong IDE |
| Dependency | PASS | `npm audit --json`: 0 advisory; Composer audit: 0 advisory/abandoned. Không đổi dependency |
| Secrets trong file liên quan | PASS trong phạm vi chọn | Helper chỉ đọc đối chiếu43 file với giá trị bí mật từ env/email riêng và pattern khóa phổ biến: không trùng. Không in giá trị ra output; không thay thế Gitleaks hoặc quét lịch sử Git |
| Log | PASS trong phạm vi local | Test sự kiện/request ID và không lộ OTP/password/email/cookie; test lỗi gửi mail. Fallback logger cố tình lỗi ở AuthLoggingTest vẫn có thông báo cố định; không phải lỗi test |
| Database đang dùng | PASS, chỉ đọc | Chủ dự án chạy migration Workbench. Đối chiếu 2 tài khoản cũ được miễn, 0 ngày xác minh giả, default miễn mới=0, bảng mới8 cột/0 dòng. Không chạy lại DDL |
| Bảo mật ở production / tải đồng thời MySQL | NOT RUN | Chưa có SMTP thật, hosting/multiple workers để kiểm tra; không suy từ SQLite ra kết quả race trên InnoDB |
| SAST/DAST toàn hệ thống | NOT RUN | Không tuyên bố quét toàn bộ ứng dụng hoặc lịch sử Git |

Test responsive: 320×568, 390×844, 440×956 (kích thước iPhone 16 Pro Max), 700/701×900, 834×1194, 900/901/1000/1001×1000, 1440×1000, 1920×1080, 844×390, 956×440. Kiểm tra tràn ngang, email dài, form/nút, touch menu, Escape, bàn phím/reduced motion và Axe. Đây là **giả lập trình duyệt**, chưa kiểm tra iPhone/iPad vật lý.

### Ca bảo mật đã kiểm tra

- Public registration bỏ qua role/verified/exemption do client giả; không cấp phiên authenticated trước xác minh. Đúng mật khẩu mới mở phiên chờ; sai mật khẩu không tiết lộ trạng thái xác minh.
- Phiên chờ gắn user ID/email/fingerprint mật khẩu trong server session; không cho đổi người nhận hoặc xác minh hộ tài khoản khác bằng payload. Không nhận ID/email từ browser ở send/verify.
- OTP ngẫu nhiên6 số, bcrypt, TTL5 phút/5 lần sai, dùng một lần; gửi lại hủy mã cũ. Số lần sai tồn tại qua reload; cooldown30s và quota10/giờ/tài khoản tồn tại khi đổi phiên. Thêm giới hạn IP.
- Thiếu CSRF, Origin ngoài allowlist, không có phiên chờ, phiên hết30 phút, tài khoản bị khóa, mã sai/hết hạn/hủy/dùng lại đều bị từ chối.
- Ghi ngày xác minh và tiêu thụ mã cùng transaction; test ép lỗi ghi rồi xác nhận rollback/retry. Khóa user trước record, session blocking; concurrency nhiều worker chưa test.
- Password reset không tự cấp xác minh; password fingerprint thay đổi làm phiên chờ cũ vô hiệu. Forged login session của tài khoản chưa xác minh bị `account.active` từ chối.
- Mailer log/không phải SMTP bị từ chối; lỗi SMTP hủy yêu cầu, không ghi exception chứa bí mật. Tài khoản tạo rồi vẫn có thể tiếp tục xác minh sau khi mail hoạt động trở lại.

## Sửa trong lúc review

| Trước | Sau |
|---|---|
| Đăng ký xong có thể đăng nhập ngay | Phải nhập mã; trạng thái verified được quyết định ở backend |
| Chưa có màn hình xác minh/recovery khi reload | Form dùng style tài khoản, lấy TTL/cooldown từ server, thông báo sai/hết hạn/giới hạn, gửi lại mã |
| Nút robot che cuối form mới trên ảnh responsive | Dành vùng dưới form xác minh; test vị trí sau Motion layout transition và xem lại ảnh |
| Eloquent nullable/user contract có thể gây báo kiểu sai | Narrow `NguoiDung` bằng nhánh rõ ràng, accessor ở middleware và PHPDoc đúng casts của model mới |
| Một số test cũ cấu hình driver tên `null` không hợp lệ | Dùng channel `null` có Monolog NullHandler; full PHPUnit chạy lại đạt |

Lần kiểm tra vị trí robot đầu tiên lấy bounding box giữa animation layout nên báo 13 lỗi; kiểm tra CSS sau chuyển động đã đúng. Test chờ điều kiện vị trí thực tế bằng polling, không bỏ assertion. Chạy lại18/18 đạt. Có cảnh báo build chunk JS >500kB; không phải lỗi TypeScript, chưa tối ưu tách bundle trong chức năng này.

Kiểm tra bổ sung popup robot phát hiện khung mở có thể vượt viewport ngang956×440 khi dùng vị trí theo trang. Đã giữ nút đóng dưới form nhưng cố định khung mở trong viewport; kiểm tra lại320/440/834/1440/956×440 đạt, Escape hoạt động. Thêm assertion landscape vào test xác minh để chống hồi quy.

## Giới hạn trước deploy

- Tài khoản cũ và CLI tin cậy dùng exemption để giữ quyền truy cập; không đồng nghĩa email đã được xác minh. Public registration không thể đặt exemption. Cần chính sách yêu cầu xác minh lại tài khoản cũ nếu đưa dữ liệu này lên production.
- Phản hồi đăng ký trùng còn cho phép suy đoán email tồn tại; cần quyết định chống bot/quota/UX trước mở public.
- SMTP đồng bộ: cần queue bền vững, payload mã hóa, timeout/retry, domain/TLS/SPF/DKIM/DMARC và thử hộp thư thật. Mailpit chỉ chứng minh đường SMTP local.
- Cần kiểm tra race trên MySQL/InnoDB nhiều worker, shared session/cache, cleanup OTP/tài khoản pending, quyền filesystem/quota/alerts log, HTTPS/reverse proxy theo checklist deploy. Chưa gọi deploy-ready.
- Bằng chứng thô: `frontend/test-results/`, mailbox/SQLite test và helper `tmp/security/` bị Git bỏ qua. Không đưa mã OTP, email thật hoặc secrets vào review.

## Tài liệu đối chiếu

### Kiểm tra trước push theo yêu cầu chủ dự án

Chọn34 file mã chức năng, model xác thực, fixture giả và tài liệu liên quan bằng allowlist cụ thể. Không kèm env/config database/SQL/migration/dump/log/mailbox/HANDOFF hoặc các thay đổi ngoài chức năng. Nội dung staged phải khớp byte với bản đã rà (chuẩn hóa CRLF) và `git diff --cached --check` đạt. Chạy lại PHPUnit55/502 và bộ18 test xác minh/responsive trước commit. Các kết quả build/HTTP/dependency ở trên thuộc cùng đợt hoàn thiện này; không gọi việc push là deploy-ready.

Laravel hướng dẫn lưu ngày xác minh và bảo vệ route bằng middleware; dự án triển khai mã OTP với schema riêng thay cho signed-link mặc định. [Laravel 12 Email Verification](https://laravel.com/docs/12.x/verification).

Rà giới hạn thử đăng nhập, lỗi không tiết lộ thông tin và kiểm soát phiên theo [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), truy cập 30/09/2026. Đây là đối chiếu hướng dẫn, không phải chứng nhận tuân thủ toàn bộ.
