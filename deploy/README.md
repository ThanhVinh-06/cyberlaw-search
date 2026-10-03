# Chuẩn bị production

Mẫu cấu hình chưa được cài trên máy chủ. Không chứa bí mật và không thay `.env` local.

## Log

Đặt trong môi trường production (không commit file `.env`):

```dotenv
APP_ENV=production
APP_DEBUG=false
LOG_CHANNEL=stack
LOG_STACK=application,security,audit
LOG_LEVEL=info
SESSION_SECURE_COOKIE=true
```

Giữ APP_KEY riêng cho môi trường, không đổi khóa đang dùng để áp dụng bản vá. Chạy `php artisan config:cache` sau khi cấu hình. Ba kênh JSON dùng daily rotation, quyền 0600, lưu application 14 ngày và security/audit 90 ngày. Stack này sao chép log mặc định vào cả ba kênh; SafeLog vẫn định tuyến sự kiện tới kênh tương ứng. Cần cấu hình quota/cảnh báo dung lượng và kiểm chứng quyền trên Linux trước release.

## Session storage

Ứng dụng hiện dùng `SESSION_DRIVER=file` vì schema chưa có bảng `sessions`. Với một máy chủ, đặt thư mục session ngoài webroot và cho PHP-FPM quyền ghi. Nếu chạy nhiều máy chủ, phải chuyển sang Redis hoặc session store dùng chung đã kiểm thử; không đổi sang database nếu chưa tạo và rà soát bảng sessions.

The schema has no `sessions` table, so the production template uses `SESSION_DRIVER=file`. This is suitable for one server when the session directory is outside the webroot and writable by PHP-FPM. For multiple application servers, use a tested shared store such as Redis; do not switch to the database driver until a `sessions` table has been added and reviewed.

## Nginx và HTTPS

1. Build frontend, đặt webroot đúng `frontend/dist`; PHP chỉ nhận front controller `backend/api/public/index.php`. Không public thư mục dự án.
2. Điền domain, chứng chỉ, đường dẫn và PHP socket trong `nginx/cyberlaw.conf.example`. Copy `security-headers.conf` tới `/etc/nginx/snippets/cyberlaw-security-headers.conf`.
3. Chạy `nginx -t` rồi reload. Mẫu áp dụng cho Nginx kết thúc TLS trực tiếp; nếu dùng CDN/proxy cần cấu hình trusted proxy riêng.
4. Kiểm tra header ở HTML, assets, API thành công và lỗi 401/404/500 bằng `curl -I https://DOMAIN/` và các URL tương ứng. HSTS chỉ ở server HTTPS; chưa bật subdomain/preload.
5. CSP cho phép inline style để Motion/Radix hoạt động; không cho inline script/eval. Chạy trình duyệt trên production build: login, chat, popup, tải PDF, font và responsive; kiểm tra Console không có CSP violation. Vite dev cần WebSocket nên không dùng policy này cho dev server.
6. Khi thêm `add_header` trong location phải include lại snippet vì Nginx không tự kế thừa header cấp trên trong trường hợp đó. Tham khảo: https://nginx.org/en/docs/http/ngx_http_headers_module.html

Chưa có Nginx/HTTPS staging trong workspace: syntax/runtime header, TLS, quyền Linux và cảnh báo vận hành phải được xác minh trên đích deploy trước khi mở Internet.
