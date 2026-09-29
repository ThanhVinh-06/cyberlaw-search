# Review đăng nhập backend

## Bổ sung: sửa kiểu logger trong test

- `AuthLoggingTest.php` trước đây gọi `getHandlers()` trực tiếp trên kết quả `Log::channel()`, trong khi facade khai báo trả `Psr\Log\LoggerInterface` không có phương thức này. PHPUnit chạy được nhờ Laravel chuyển tiếp lời gọi động, nhưng trình phân tích kiểu có thể báo lỗi.
- Đã kiểm tra kiểu Laravel logger, lấy logger bên trong bằng `getLogger()`, kiểm tra Monolog rồi mới gọi `getHandlers()`. Không tắt cảnh báo hoặc thay vendor.
- PASS: PHP lint và 3 test logging/expiry, 22 assertions. Thông báo `structured logger unavailable` là fallback được chủ động kiểm thử.
- Responsive N/A: chỉ sửa mã test PHP, không thay giao diện hoặc code chạy ứng dụng. Không thay DB, dependency hoặc chính sách log.

## Phạm vi và môi trường

- Worktree sau `7cb2918`, chưa commit. Laravel 12.69.2/PHP 8.2.12, React/Vite, MySQL 8.0.44. Giữ các thay đổi Claude và tài liệu có trước.
- API `/api/auth/{csrf,login,me,logout}`, controller, middleware, logger, lệnh tạo tài khoản và React auth. Chưa triển khai đăng ký/reset/CRUD/AI.
- PHPUnit dùng SQLite `:memory:` có guard từ chối MySQL. Test HTTP dùng PHP thật, Edge/Playwright, SQLite tại `storage/framework/testing/auth-browser.sqlite`, port 8001/5174, khóa phiên và cache test riêng. Không thay MySQL của người dùng.
- MySQL đọc metadata/count: 11 bảng/101 cột, 1 tài khoản active với bcrypt. Không đọc/in thông tin đăng nhập ra report. Không thêm schema trong lượt này.

## Kết quả

| Hạng mục | Trạng thái và bằng chứng |
|---|---|
| Đăng nhập đúng/sai, email chuẩn hóa, password giữ khoảng trắng, blocked | PASS — `tests/Feature/LoginTest.php`; lỗi 401 chung, không cập nhật timestamp khi thất bại |
| Session fixation/logout/replay | PASS — đổi ID trong PHPUnit; browser reload/tab mới giữ phiên, cookie cũ sau logout nhận 401 |
| Hết hạn file session | PASS — `AuthLoggingTest`, file quá lifetime không được đọc; không chờ đủ 120 phút trong browser |
| CSRF/origin | PASS — PHPUnit bật kiểm tra CSRF thật thay vì bypass mặc định; thiếu/sai token và origin lạ bị từ chối; HTTP thật thiếu CSRF nhận 419 |
| Cookie | PASS local — HttpOnly/SameSite=Lax, JS không đọc cookie phiên; Secure/HTTPS trên hosting NOT RUN |
| Quyền server | PASS — route test dùng `account.active` + `role.admin`: khách 401, user 403, admin được phép; khóa/hạ quyền có hiệu lực request tiếp theo. API quản trị nghiệp vụ chưa tồn tại |
| Client giả phiên | PASS — HTTP browser sửa sessionStorage không vào được admin; UI không dùng storage làm nguồn quyền |
| Rate limit | PASS — 5 lần/email-IP; 30 lần/IP dù đổi email; đổi hoa/thường hoặc X-Forwarded-For không vượt được; Retry-After có trong 429 |
| Validation/mass assignment/SQL | PASS — array thay string, email injection, body >8KB, trường vai trò/ID giả không tăng quyền hoặc ghi sai. Password >72 byte bị từ chối để tránh alias bcrypt |
| Lỗi DB | PASS — 500 JSON chung ngay cả debug=true, không SQL/stack; không giữ phiên thành công giả |
| CLI tạo tài khoản | PASS — mật khẩu băm, audit cùng transaction, rollback khi audit lỗi, không ghi đè email có sẵn. CLI lỗi trả thông báo chung, không in SQL bindings |
| Log | PASS trong phạm vi — JSON một dòng, allowlist, request ID; thử password/token/cookie/nested/exception canary không xuất hiện. Handler daily và cleanup retention được test bằng file giả; logger lỗi dùng thông báo stderr cố định |
| UI/UX | PASS — đang gửi khóa input/nút, 401/419/429/lỗi mạng, lỗi logout giữ thông báo và cho thử lại; keyboard/reduced motion/Axe trong suite hiện có |
| Responsive | PASS giả lập — điện thoại 320/360/390/440, tablet 768/834, desktop tới 1920, landscape 844×390/956×440 và mốc 760/761, 900/901; chưa thiết bị thật |
| Build/typecheck | PASS — Vite build, TypeScript app và e2e. Cảnh báo bundle >500KB đã có từ trước |
| Dependency | PASS — `composer audit --locked --format=json`: advisories/abandoned rỗng; `npm audit --json`: 0 vulnerabilities. Không nâng dependency |
| Secret hygiene | PASS kiểm tra giới hạn — `.env`, vendor, logs, test SQLite bị Git bỏ qua; rà diff/code mới không chép secret kết nối. Gitleaks toàn lịch sử/SAST/DAST tự động NOT RUN |

## Lệnh và kết quả chạy

- `php vendor/bin/phpunit`: **22 test đạt** (gồm model/scaffold và ca mới). Bật CSRF thật cho nhóm login; dữ liệu thử độc lập.
- `npm run test:e2e`: 55/56 đạt; ca responsive gộp 16 kích thước × 5 trang vượt timeout 60 giây. Tách ca theo từng kích thước để báo lỗi chính xác; chạy lại cả 16 đạt. Thêm `auth-errors.spec.ts`: 2/2 đạt. Tổng bộ UI sau sửa gồm **73 ca đã đạt qua các lượt chạy**; không giảm số kích thước/kiểm tra để tránh timeout.
- `npx playwright test --config=playwright.auth.config.ts`: 3/3 đạt. Auth backend thật; DB của test là SQLite, không gọi đây là kiểm thử toàn bộ hành vi MySQL trên production.
- `composer validate --no-check-publish`: đạt. Script setup không còn tự đổi APP_KEY/chạy migration.
- Quét 3 file log hiện có bằng marker nhạy cảm của fixture: không phát hiện; không đưa nội dung log vào repo.

## Các sửa bảo mật đáng chú ý

1. Auth demo tin sessionStorage đã được thay bằng server session. Không còn đường đăng nhập bằng danh sách người dùng mẫu.
2. Password không trim; giới hạn 72 byte phía server để không chấp nhận chuỗi có cùng 72 byte đầu khi dùng bcrypt.
3. Lỗi API không serialize exception/SQL; logger chỉ ghi trường cho phép, không request body hay header nhạy cảm.
4. Khi DB/audit tạo tài khoản lỗi, transaction rollback và CLI không in bindings. Quyền admin không nhận từ payload đăng nhập.

## Còn mở trước deploy

- Người triển khai hosting cần test HTTPS, Secure cookie, ACL file thực tế (0600 không thay thế ACL Windows), trusted proxy, CSP và webroot không lộ storage/.env. Chưa có môi trường production.
- Rotation 50MB, quota toàn đĩa, stress/concurrent logging, cảnh báo đã đến người vận hành, audit exporter/retry và collector độc lập chưa triển khai/test. Daily file retention hiện là số file ngày, không cam kết tự xóa theo tuổi ngày khi ứng dụng ngừng ghi log.
- Chưa triển khai register/reset thật, thu hồi mọi phiên sau đổi mật khẩu, lịch sử/CRUD server hay FastAPI. OTP minh họa còn ở trang reset, phải thay trước phát hành sản phẩm.
- Hiện một máy với file session/cache; khi chạy nhiều instance cần shared store, rate limit có khóa và thử cạnh tranh. Reverse proxy phải giới hạn body trước PHP.
- Chưa có MySQL test DB riêng để chạy suite ghi dữ liệu trên MySQL, quét SAST/Gitleaks/ZAP hoặc kiểm thử hosting. Không kết luận production-ready hay không có lỗ hổng ngoài phạm vi đã test.

Artifact browser/screenshots và log thô nằm trong thư mục test/runtime bị Git bỏ qua; ảnh login cập nhật trong `docs/design/screenshots/`. Hướng dẫn vận hành: [đăng nhập](../../backend/01-dang-nhap.md).
