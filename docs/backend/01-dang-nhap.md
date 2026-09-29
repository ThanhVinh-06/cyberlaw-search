# Đăng nhập Laravel và React

## Trạng thái

Đăng ký, đăng nhập, lấy phiên, đăng xuất và quên mật khẩu đã dùng Laravel/MySQL. React không đọc tài khoản demo hoặc vai trò từ `sessionStorage` để xác thực. Quên mật khẩu dùng SMTP Mailpit local; xem [hướng dẫn thử và cấu hình](02-quen-mat-khau.md). CRUD quản trị và AI vẫn demo.

### Đăng ký tài khoản

POST `/api/auth/register` với JSON `{name, email, password, password_confirmation}` và CSRF như đăng nhập. Thành công trả 201 rồi giao diện chuyển đến `/verify-email`. Nhập đúng mã gửi qua SMTP mới được đăng nhập. Giữ ý định `next=history`. Mật khẩu không lưu vào URL/storage. Xem [xác minh email](03-xac-minh-email.md).

Server chỉ nhận bốn trường trên: tên 2–100 ký tự, email hợp lệ tối đa 191 ký tự, mật khẩu tối thiểu 8 ký tự/tối đa 72 byte UTF-8 do bcrypt, xác nhận trùng khớp. Email được trim/chuyển chữ thường; mật khẩu giữ nguyên khoảng trắng, cấm byte null. Luôn gán `vai_tro=user`, `trang_thai=active`. Không cấp quyền admin từ payload.

Tài khoản được tạo bằng một INSERT; chỉ mục UNIQUE email ngăn bản ghi trùng. Lỗi trùng trả 409 và giữ nguyên tài khoản cũ. Đang đăng nhập cũng trả 409 để không thay phiên đang có. Giới hạn 5 yêu cầu/phút/IP và 20/giờ/IP; lỗi nhập liệu 422, CSRF 419, body quá lớn 413. Log `auth.register` ghi kết quả/request ID và ID tài khoản mới; không ghi dữ liệu form. Sau đó tạo yêu cầu xác minh và gửi mã. Phản hồi trùng khác thành công nên vẫn có thể dùng để suy đoán email đã đăng ký; trước public deployment cần kiểm soát chống bot và đánh giá rủi ro này.

API dùng session guard `web` của Laravel 12, trong nhóm middleware `web` để có cookie, session và CSRF. Frontend và API dùng **cùng origin**: Vite proxy `/api` sang Laravel khi phát triển; khi deploy, reverse proxy `/api` sang `backend/api/public` và phục vụ frontend tại cùng tên miền. Chưa cài Sanctum vì chưa cung cấp bearer token/mobile API hoặc SPA khác origin. Đây là lựa chọn hiện tại thay cho đề xuất Sanctum trước đây.

## Chạy trên máy anh

Terminal 1:

```powershell
cd E:\cyberlaw-search\backend\api
& C:\xampp\php\php.exe artisan serve --host=127.0.0.1 --port=8000
```

Terminal 2:

```powershell
cd E:\cyberlaw-search\frontend
npm run dev
```

Mở `http://127.0.0.1:5173/login`. Nếu Vite chạy từ trước khi sửa proxy, khởi động lại đúng tiến trình Vite đó. Không chạy Live Server/Go Live với frontend React.

### Tạo tài khoản đầu tiên

Lần kiểm tra chỉ đọc ngày 30/09/2026 có **2 tài khoản trong MySQL**; giữ nguyên cả hai. Dùng email/mật khẩu đã tạo, hoặc tạo tài khoản mới bằng lệnh bên dưới nếu cần. Không seed mật khẩu mặc định. Trong terminal mới:

```powershell
cd E:\cyberlaw-search\backend\api
& C:\xampp\php\php.exe artisan cyberlaw:create-account --admin
```

Nhập họ tên, email và mật khẩu hai lần. Mật khẩu được nhập ẩn, không truyền trên dòng lệnh và không lưu bản rõ. Tối thiểu 12 ký tự, tối đa 72 byte do giới hạn bcrypt; khoảng trắng là một phần mật khẩu. Bỏ `--admin` để tạo người dùng thường. Email đã có bị từ chối, không ghi đè tài khoản. Tạo tài khoản và bản ghi `nhat_ky_quan_tri` nằm trong cùng transaction.

CLI dành cho người vận hành tin cậy: cấp cờ miễn xác minh email và ghi vào audit, không ghi ngày xác minh giả. Database cần migration xác minh email ngày 30/09/2026 (máy hiện tại đã áp dụng). Session/cache lưu file ngoài webroot. Không chạy lại SQL migration đã áp dụng hoặc `migrate:fresh`.

## Hợp đồng API

| Method / route | Nội dung |
|---|---|
| GET `/api/auth/csrf` | Trả `csrf_token`, khởi tạo cookie phiên. Không cache |
| POST `/api/auth/login` | JSON `{email, password}` và header `X-CSRF-TOKEN`; trả `{user}` |
| GET `/api/auth/me` | Thông tin người đang đăng nhập, hoặc 401 |
| POST `/api/auth/logout` | Header CSRF; xóa phiên phía server, đổi token |

`user` chỉ có ID, họ tên, email, vai trò, trạng thái và mốc thời gian; không trả `mat_khau`, `ma_ghi_nho`. Cookie phiên HttpOnly/SameSite=Lax, Secure mặc định khi `APP_ENV=production`. Thời gian không hoạt động theo `SESSION_LIFETIME` (120 phút mặc định). Đăng nhập đổi session ID; đăng xuất hủy phiên hiện tại. `account.active` kiểm tra tài khoản còn hoạt động trên mỗi request; `role.admin` dành cho API quản trị sau này, đi sau middleware tài khoản hoạt động.

Sai email, sai mật khẩu hoặc tài khoản khóa cùng phản hồi 401. Đúng mật khẩu nhưng chưa xác minh trả 403 `email_unverified`, không cấp phiên đăng nhập. `account.active` kiểm tra cả xác minh/miễn xác minh trên mỗi API bảo vệ. Rate limit: 5 lần/phút/cặp email-IP và 30 lần/phút/IP, tính cả thành công; khóa cache dùng HMAC. Không tin `X-Forwarded-For` từ client; khi deploy cần khai báo đúng reverse proxy. HTTP khác: 419 CSRF, 422 dữ liệu không hợp lệ, 429 giới hạn, 413 body quá 8KB, 500 thông báo chung. Mỗi phản hồi API có `X-Request-ID`.

`FRONTEND_ORIGINS` trong `.env` là danh sách origin chính xác, phân cách dấu phẩy. Mặc định localhost/127.0.0.1 cổng 5173. Production phải đổi sang origin HTTPS thật; không dùng wildcard. PHP/MySQL chỉ lắng nghe nội bộ.

## Log và giới hạn trước deploy

Log JSON Lines tại `backend/api/storage/logs/application-YYYY-MM-DD.log` và `security-YYYY-MM-DD.log`; có request/event ID, route name, status, thời gian, actor ID/role và mã lỗi đã cho phép. Không ghi body, email thô, password, cookie, CSRF token hoặc SQL bindings. Giữ tối đa 14 file ngày application, 90 file ngày security. Logger lỗi ghi thông báo cố định vào stderr; hosting cần monitoring stderr.

Chưa có audit exporter/retry, rotation theo 50MB/quota toàn đĩa, cảnh báo đến người vận hành, kiểm tra ACL/HTTPS trên hosting. Phải hoàn thiện trước deploy theo `docs/security/`. Reverse proxy cũng cần giới hạn body trước khi PHP đọc vào bộ nhớ. File session/cache phù hợp một máy; nhiều instance cần shared store và khóa phù hợp.

`composer setup` chỉ xóa config cache. Theo yêu cầu chủ dự án, đợt push đăng nhập không kèm `.env`/`.env.example`, cấu hình database, SQL hoặc migration/seed. Máy mới phải tự chuẩn bị cấu hình môi trường và database trước khi chạy; bản Git không phải gói triển khai đầy đủ. Không đổi APP_KEY của môi trường đang có phiên.

## Kiểm thử

```powershell
# Tại backend/api: SQLite :memory:, không dùng MySQL đang phát triển
& C:\xampp\php\php.exe vendor/bin/phpunit

# Tại frontend: UI bằng API fixture
npm run test:e2e

# HTTP thật: tự bật backend 8001, Vite 5174, SQLite riêng
npx playwright test --config=playwright.auth.config.ts
```

`PHP_BINARY` ghi đè đường dẫn PHP trong launcher test khi cần. Tài khoản `@example.test`/mật khẩu fixture chỉ thuộc test DB, không tạo trong MySQL hoặc dùng ở production. Test tích hợp không import `auth-fixtures.ts`. Artifact test được Git bỏ qua. Responsive là giả lập, chưa thay thế kiểm tra thiết bị thật.

Nguồn: [Laravel 12 Authentication](https://laravel.com/docs/12.x/authentication), [CSRF](https://laravel.com/docs/12.x/csrf), [Rate Limiting](https://laravel.com/docs/12.x/rate-limiting).
