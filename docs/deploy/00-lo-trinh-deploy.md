# Lộ trình triển khai (deploy) — CyberLaw Search

> **Trạng thái:** CHƯA deploy. Web hiện chỉ chạy ở môi trường phát triển (local).
> **Ngày lập:** 04/10/2026. **Người lập:** Claude Code, theo yêu cầu chủ dự án.
> **Mục đích:** Ghi lại toàn bộ việc còn phải làm trước khi mở trang ra Internet, để sau khi hoàn thành báo cáo đồ án chỉ cần đọc lại file này và tiếp tục.
> **Bối cảnh:** Ưu tiên trước mắt là **hoàn thành báo cáo đồ án (còn 4 ngày)**. Deploy sẽ làm sau. Web local đã chạy ổn nên không gấp.

**Tài liệu liên quan:**
- `docs/security/04-deployment.md` — checklist 19 ô phải tick trước khi mở Internet (hiện **chưa tick ô nào**).
- `docs/security/reviews/2026-10-03-ran-soat-deploy.md` — rà soát tổng thể, nguồn của các mã B1–B5, H1–H4, M1–M11, L1–L7.
- `docs/security/reviews/2026-10-04-sua-h1-h4.md` — đã sửa H1–H4.
- `deploy/README.md`, `deploy/production.env.example`, `deploy/nginx/*` — mẫu cấu hình đã soạn.

---

## 1. Trạng thái hiện tại

| Hạng mục | Trạng thái |
|---|---|
| Chạy local | ✅ Ổn định (Laravel `artisan serve` + Vite dev) |
| Test backend | ✅ PHPUnit **123 passed / 1323 assertions** |
| Test giao diện | ✅ Playwright **152 passed** (29 file spec, 88 test case) |
| Dependency | ✅ `npm audit` 0 lỗ hổng, `composer audit` 0 advisory |
| Bảo mật H1–H4 | ✅ Đã sửa và kiểm chứng (xem review 04/10) |
| Hạ tầng deploy | ❌ **Chưa có gì**: không web server, không Docker, không CI, không script backup |
| Cấu hình production | ❌ Chưa có `.env` production thật; chỉ có mẫu |
| Đánh dấu deploy-ready | ❌ **Chưa** |

---

## 2. Việc cần xử lý — theo nhóm

### Nhóm A — Quyết định và hạ tầng (làm trước tiên, chặn mọi thứ khác)

- [ ] **A1. Chọn nhà cung cấp máy chủ.** Gợi ý: VPS Ubuntu 22.04/24.04, tối thiểu 2GB RAM. Cần biết rõ nhà cung cấp để viết lệnh chính xác.
- [ ] **A2. Mua/tên miền + cấu hình DNS.** Cần cho HTTPS và cookie bảo mật.
- [ ] **A3. Cài stack trên máy chủ:** Nginx + PHP-FPM 8.2 + MySQL 8 + Python 3 + Node (chỉ để build frontend).
- [ ] **A4. Extension PHP bắt buộc:** `mbstring`, `pdo_mysql`, `xml`, `curl`, `zip`, `bcmath`, `gd`, `openssl`, `tokenizer`.
- [ ] **A5. Tạo tài khoản MySQL riêng cho ứng dụng** với quyền tối thiểu (KHÔNG dùng `root`).
- [ ] **A6. Chứng chỉ HTTPS** (Let's Encrypt / Certbot).

> Đây chính là **B1** trong rà soát 03/10: "Chưa có môi trường/hạ tầng triển khai".

### Nhóm B — Lỗi bảo mật

**Đã sửa xong (không cần làm lại):**
- ✅ **H1** — danh tính khách trong hội thoại AI nay ký HMAC-SHA256 bằng `app.key`, có kiểm định dạng, giới hạn 20, ràng buộc session ID, fail closed. (`LocalAnswer.php`)
- ✅ **H2** — lỗi API nay được ghi log qua `SafeLog` event `api.exception`, không còn mù thông tin. (`bootstrap/app.php`)
- ✅ **H3** — mẫu CSP / `frame-ancestors` / `X-Frame-Options` / `Referrer-Policy` / HSTS đã soạn. **Nhưng chưa chạy thật** — xem Nhóm C.
- ✅ **H4** — log production mặc định `application,security,audit`, mức `info`, daily rotation, quyền 0600. (`config/logging.php`)
- ✅ **B3** — đã xoá credential mẫu `admin@cyberlaw.vn` / `admin12345` khỏi giao diện và bundle.
- ✅ **B4** — trang Thống kê không còn vẽ số demo khi API lỗi.
- ✅ **B5** — route `/` thực tế trả HTTP 200 (không phải 500); chỉ là trang mặc định của Laravel, mức thấp.
- ✅ **M5** — thẻ hồ sơ admin lấy từ `currentUser`, không hardcode.

**Còn tồn — nên sửa trước khi mở Internet:**

- [ ] **M2 — Thiếu `trustProxies`.** `bootstrap/app.php` không khai báo proxy tin cậy; mọi giới hạn theo IP dùng `$request->ip()`. Nếu đặt sau Cloudflare/CDN, IP thấy được là IP proxy → **một người spam khoá cả hệ thống**. Khai báo dải IP proxy tin cậy (không dùng `*`).
- [ ] **M6 — `laravel/tinker` nằm trong `require`.** Chuyển sang `require-dev` để không cài vào production (giảm bề mặt tấn công). Cần chạy `composer install --no-dev` sau khi sửa.
- [ ] **M9 — `'serve' => true` trong `config/filesystems.php:36`.** Laravel tự mở route `GET/PUT /storage/{path}`. Dự án đã có đường tải PDF riêng nên đặt `false`.
- [ ] **M1 — `GET_LOCK` toàn cục cho lượt đọc công khai.** `KnowledgeAdmin::serialized()` dùng `GET_LOCK` và đang được gọi ở `/api/library`, `/api/terms`. Ai đó spam liên tục là nghẽn. Nên chỉ giữ lock cho nhánh ghi/công bố.
- [ ] **M3 — `SearchStatistics` nuốt mọi exception.** `catch (\Throwable)` trắng → số liệu tra cứu có thể sai âm thầm mà không có tín hiệu. Nên ghi một dòng `SafeLog` để còn cảnh báo.
- [ ] **M11 — Chưa có job dọn dữ liệu.** Cần job dọn: hội thoại khách (`ma_nguoi_dung IS NULL`), yêu cầu đặt lại mật khẩu / xác minh email hết hạn, chính sách lưu `thong_ke_tra_cuu`.
- [ ] **M7 — Thiếu index cho truy vấn thống kê/audit** khi bảng lớn (xem chi tiết ở rà soát 03/10).
- [ ] **M4 — Dữ liệu demo còn trong `admin-data.ts` / `articles.ts`.** Đã kiểm chứng: bundle production hiện **sạch** (0 chuỗi demo), nhưng file nguồn vẫn còn dữ liệu mẫu. Nên chuyển sang fixtures e2e hoặc chặn bằng `import.meta.env.DEV`.

**Nhóm C — Cấu hình production (làm trên máy chủ)**

- [ ] **C1. Tạo `.env` production** dựa trên `deploy/production.env.example`. Bắt buộc: `APP_ENV=production`, `APP_DEBUG=false`, `APP_KEY` mới riêng cho production, `APP_URL` đúng miền, `SESSION_DRIVER=file`.
- [ ] **C2. Gỡ BOM nếu copy file mẫu** (đã gỡ sẵn trong repo; nếu tự tạo thì lưu UTF-8 không BOM).
- [ ] **C3. Cài Nginx** theo `deploy/nginx/cyberlaw.conf.example`: thay `example.invalid`, đường dẫn chứng chỉ, webroot `/srv/cyberlaw/frontend/dist`, socket PHP.
- [ ] **C4. Copy security headers** `deploy/nginx/security-headers.conf` → `/etc/nginx/snippets/cyberlaw-security-headers.conf`.
- [ ] **C5. Chạy `nginx -t` rồi reload.** (H3 chỉ được coi là đạt sau bước này + kiểm tra thật.)
- [ ] **C6. `php artisan config:cache && route:cache && view:cache`.**
- [ ] **C7. Phân quyền thư mục:** `storage/`, `bootstrap/cache/` cho PHP-FPM ghi; thư mục session ngoài webroot.
- [ ] **C8. Webroot chỉ gồm** frontend build + `backend/api/public`. Không để lộ `.git`, `.env`, log, backup.
- [ ] **C9. Kiểm tra header thật:** `curl -I` trên HTML, assets, API thành công, và lỗi 401/404/500.
- [ ] **C10. Mở Console trình duyệt** trên production build, xác nhận không có CSP violation (test login, chat, popup, tải PDF, font).

### Nhóm D — Dữ liệu và vận hành

- [ ] **D1. Copy PDF nguồn** `data/raw/laws/2025/` lên máy chủ đúng vị trí. **Giữ nguyên PDF gốc**, không sửa.
- [ ] **D2. Import dữ liệu luật** rồi **công bố văn bản trên trang quản trị**. Lưu ý: bundle nạp ghim `draft`/v1 nên API công khai vẫn rỗng/409 cho tới khi `published`. Nếu `cyberlaw:import-knowledge` báo `knowledge_existing_conflict` trên DB đã công bố thì đó là fail-closed đúng thiết kế, không phải sự cố.
- [ ] **D3. Xác nhận** `/api/search`, `/api/library`, `/api/terms` trả đúng Luật 116/2025/QH15 trước khi mở.
- [ ] **D4. Tạo tài khoản quản trị thật** cho production (không dùng tài khoản mẫu).
- [ ] **D5. Backup:** viết script `mysqldump` định kỳ + **test phục hồi vào DB riêng**. (Thuộc B1.)
- [ ] **D6. Log:** cấu hình quota/cảnh báo dung lượng; kiểm chứng quyền file trên Linux; xác nhận rotation chạy.
- [ ] **D7. Cron** cho Laravel scheduler (nếu bật job dọn dữ liệu ở M11).
- [ ] **D8. Cấu hình mail thật** cho xác minh email / quên mật khẩu (hiện dùng Mailpit local; production cần SMTP thật).

### Nhóm E — Kiểm thử trước khi mở

- [ ] **E1. Dựng staging** riêng biệt với production.
- [ ] **E2. Chạy lại PHPUnit + Playwright trên staging.**
- [ ] **E3. `npm audit` + `composer audit` + secret scan** worktree và lịch sử.
- [ ] **E4. DAST trên staging** (nếu có quyền thực hiện).
- [ ] **E5. Kiểm tra responsive** trên production build: 320px, 440px (iPhone 16 Pro Max), 834px (iPad), 1440px (desktop), landscape.
- [ ] **E6. Đi hết checklist** `docs/security/04-deployment.md` và ghi bằng chứng.

---

## 3. Hai cái bẫy đã phát hiện (dễ làm deploy thất bại)

### Bẫy 1 — Python trên Linux có thể không tên là `python`

`backend/api/config/ai.php:5` → `env('CYBERLAW_AI_PYTHON', 'python')`.
Ubuntu thường chỉ có `python3`, **không có `python`**. Không đặt biến này thì **tính năng hỏi đáp AI chết** trên máy chủ (không phải lỗi 500 rõ ràng, mà là lỗi khi gọi tiến trình con).

→ **Bắt buộc** thêm `CYBERLAW_AI_PYTHON=python3` vào `.env` production.
→ Kiểm tra trên máy chủ: `which python3` rồi test thật một câu hỏi.

### Bẫy 2 — `SESSION_DRIVER=database` phá mọi request (đã sửa)

Mẫu production ban đầu đặt `SESSION_DRIVER=database` nhưng schema **không có bảng `sessions`** (13 bảng, không bảng nào tên `sessions`; `database/migrations/` rỗng). Đã kiểm chứng thật: `QueryException ... Table 'cyberlaw_search.sessions' doesn't exist`.

→ Đã sửa thành `SESSION_DRIVER=file` ở cả 3 tầng: `deploy/production.env.example`, `config/session.php` (mặc định), `deploy/README.md`.
→ **Nếu nhiều máy chủ (load balancing):** phải chuyển sang Redis hoặc session store dùng chung đã kiểm thử. **Không** đổi sang `database` nếu chưa tạo và rà soát bảng `sessions`.

---

## 4. Thứ tự thực hiện đề xuất

```text
Chốt máy chủ + miền (A1–A2)
        ↓
Sửa M2, M6, M9, M1, M3, M11
        ↓
Cài Nginx + PHP-FPM + MySQL + HTTPS (A3–A6)
        ↓
Deploy mã + .env production + config:cache (C1–C8)
        ↓
Import & CÔNG BỐ luật (D1–D4)
        ↓
Backup + log + cron + mail (D5–D8)
        ↓
Staging test: CSP, responsive, DAST (E1–E6)
        ↓
Mở Internet
```

Ước lượng: **~2–3 tuần** nếu làm đều. Phần tốn thời gian nhất là Nhóm B (sửa mã) và Nhóm E (kiểm thử).

---

## 5. Ghi chú cho lần đọc lại

- Nhóm A chặn tất cả — chưa có máy chủ thì không làm được gì tiếp.
- Nhóm B có thể làm **ngay trên local**, không cần máy chủ.
- Nhóm C, D phải làm **trên máy chủ**, không sửa được từ local.
- Sau khi deploy xong: **cập nhật `HANDOFF.md`** và tick lại `docs/security/04-deployment.md`.
- Khi sửa xong mỗi mục bảo mật: viết review vào `docs/security/reviews/` theo quy ước dự án.

---

## 6. Việc git còn treo (kiểm tra lại trước khi deploy)

Các thay đổi sau **chưa commit** tại thời điểm lập file này:
- `HANDOFF.md`, `backend/api/app/Services/LocalAnswer.php`, `backend/api/app/Support/SafeLog.php`, `backend/api/bootstrap/app.php`, `backend/api/config/logging.php`, `backend/api/config/session.php`, `backend/api/tests/Feature/AuthLoggingTest.php`
- Chưa track: `backend/api/tests/Feature/SecurityHardeningTest.php`, `deploy/`, `docs/security/reviews/2026-10-04-sua-h1-h4.md`

→ Cần commit + push trước khi deploy để mã trên máy chủ khớp với mã đã kiểm thử.
