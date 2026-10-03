# Rà soát tổng thể chuẩn bị deploy — 03/10/2026

- **Ngày, người/agent kiểm tra:** 03/10/2026, agent Claude Code (theo yêu cầu chủ dự án: "rà soát, review lại toàn bộ project … để chuẩn bị deploy").
- **Base:** `main` = `origin/main` = `9d427de`; cây làm việc sạch khi bắt đầu (3 ảnh `docs/design/screenshots/*.png` do bộ e2e ghi lại trong lúc chạy).
- **Phạm vi:** toàn bộ `frontend/`, `backend/api/` (Laravel 12.69.2 / PHP 8.2.12), `database/`, `backend/ai/` (retriever Python), cấu hình deploy, tài liệu. **Không** sửa mã nguồn; chỉ chạy kiểm thử và kiểm tra chỉ đọc.
- **Ranh giới tin cậy:** trình duyệt công khai/tài khoản → Laravel; Laravel → MySQL; Laravel → tiến trình Python cục bộ (chỉ truy hồi, không LLM, không mạng).
- **Môi trường test:** PHPUnit SQLite in-memory; Playwright `msedge` headless + Vite dev; MySQL phát triển `cyberlaw_search` (chỉ đọc, trừ 1 lượt smoke test `/api/answer` đã dọn sạch sau đo).
- **Giới hạn:** chưa có staging/DAST, chưa chạy SAST/secret-scan toàn lịch sử; kết luận là **chưa deploy-ready**.

## 1. Kết quả kiểm thử đã chạy thật

| Kiểm tra | Lệnh | Kết quả |
|---|---|---|
| Backend PHPUnit | `php artisan test` | **121 PASS (1296 assertions)**, 13.63s |
| Frontend build | `npm run build` | PASS (cảnh báo bundle JS 714.87 kB > 500 kB) |
| Playwright toàn bộ | `npx playwright test` | **149 passed (12.6m)**, exit 0 — gồm responsive 320/440/761/834/956/1150/1151/1440 + landscape, reduced motion, bàn phím |
| `npm audit` | — | 0 lỗ hổng |
| `composer audit` | — | 0 advisory, 0 package bỏ hoang |
| Smoke HTTP thật (MySQL dev) | `GET /api/search`, `/api/library`, `/api/terms`, `POST /api/answer` | Trả **dữ liệu thật**: 116/2025/QH15, Điều 1…; `/api/answer` (khách) trả `status:"answered"` kèm trích dẫn Điều 8. Đã xoá dòng test khỏi `hoi_thoai/tin_nhan/trich_dan/nhat_ky_quan_tri` sau đo. |
| MySQL thật (chỉ đọc) | `van_ban` | `3 | 116/2025/QH15 | published | v2`; 434 điều khoản, 20 tin nhắn, 8 hội thoại, 16 audit |
| Secret scan | `git log -- '*.env'`, `git grep` mẫu | `.env` **chưa từng** commit; không có `APP_KEY`/`DB_PASSWORD` literal trong file track; `dist/` không track |

**Đính chính:** một báo cáo phụ trong đợt rà soát suy ra luật đang `draft` (409) từ file `data/processed/.../du-lieu-nap.json`. Kiểm tra **DB thật** cho thấy `van_ban` đã `published` v2 và các API công khai trả dữ liệu — kết luận đó **không đúng** với môi trường hiện tại.

**Theo dõi (03/10/2026):** bundle nạp vẫn ghim `draft`/v1 có chủ đích, nên `cyberlaw:import-knowledge` dừng với `knowledge_existing_conflict` trên DB đã công bố (đúng thiết kế fail-closed). Đã sửa **tài liệu** để phản ánh điều này (không đổi mã): `docs/data/01-du-lieu-luat-116.md` (runbook công bố thủ công + giải thích conflict), `docs/security/04-deployment.md` (ô checklist công bố sau import), `docs/design/04-co-so-du-lieu.md` (trạng thái `published` v2).

**Đính chính lần 2 (04/10/2026):** mục **B5** ("route `/` trả 500") **sai** — đã chạy thật, trả **HTTP 200**; chi tiết ở B5 bên dưới. Hai mục **B3** (lộ credential mẫu `admin@cyberlaw.vn`/`admin12345` ở `/admin`, xác nhận còn trong bundle production) và **B4** (trang Thống kê vẫn vẽ số demo khi API lỗi) đã **kiểm lại trên mã hiện tại và vẫn còn đúng**.

**Đã sửa B3 và B4 (03/10/2026, đợt sửa riêng):** xem [rà soát sửa B3/B4](2026-10-03-sua-b3-b4.md). Tóm tắt: B3 — xoá khối credential mẫu khỏi `AdminAccessDenied.tsx` và đổi thẻ hồ sơ admin trong `AdminStatsPage.tsx` sang `currentUser` (nếu không, `admin@cyberlaw.vn` vẫn còn trong bundle qua đường M5); bundle đã build lại, `grep` các chuỗi mẫu = 0. B4 — `statistics` khởi tạo `null`, `.catch` reset về `null`, mọi ô số hiện `—` và các khối có trạng thái rỗng khi chưa có phản hồi API; dữ liệu demo không còn là mặc định của `RecentQuestionsCard`/`RegulationBreakdownCard`. Test chống tái phát: `e2e/admin-access-denied.spec.ts` (mới) và `e2e/admin-stats.spec.ts` (2 test + 5 viewport). Hồi quy: PHPUnit 121 PASS, Playwright **152 passed**, typecheck sạch.

## 2. Phát hiện theo mức độ

### 2.1 Chặn deploy (BLOCKER)

**B1 — Chưa có môi trường/hạ tầng triển khai.** Không có cấu hình web server (nginx/apache vhost), Dockerfile, script backup/restore, hay CI (`.github/workflows` không tồn tại). `docs/security/04-deployment.md` toàn bộ ô chưa tick. Sản phẩm hiện chỉ chạy được ở chế độ dev (`artisan serve` + Vite).

**B2 — Không có mẫu cấu hình production.** `backend/api/.env.example` để mặc định dev và **bị Git bỏ qua** (`.gitignore` dòng `.env.*`; chủ dự án chủ ý giữ local). Nội dung hiện tại: `APP_ENV=local`, `APP_DEBUG=true`, `APP_KEY=` rỗng, `MAIL_MAILER=log`, `DB_PASSWORD=` rỗng, `LOG_CHANNEL=stack`/`LOG_STACK=single`/`LOG_LEVEL=debug`, `FRONTEND_ORIGINS` chỉ localhost. Người deploy không có template để điền, dễ dựng sai (bật debug, log ra file đơn không rotation).

**B3 — Credential quản trị mẫu hiển thị công khai và nằm trong bundle production.** `frontend/src/pages/admin/AdminAccessDenied.tsx:142-162` in khối "Tài khoản Quản trị viên mẫu để kiểm tra" (email dòng 153, mật khẩu dòng 159) ở route `/admin` khi **chưa đăng nhập**. Đã xác nhận có trong build: `grep -c admin12345 frontend/dist/assets/index-*.js` → `1`. Cùng mẫu còn ở `frontend/src/pages/admin/AdminStatsPage.tsx:423` và `frontend/src/lib/admin-data.ts:25`.
- **Đã kiểm tra DB thật:** KHÔNG có tài khoản `admin@cyberlaw.vn` (4 tài khoản thật là các email cá nhân, 1 admin active). Nên mức thực tế là **HIGH** (lộ mẫu + gây hiểu nhầm), không phải Critical — nhưng vẫn phải xoá trước deploy và xác nhận prod không tạo tài khoản trùng email này.
- **✅ ĐÃ SỬA (03/10/2026):** xoá khối credential; thẻ hồ sơ trong `AdminStatsPage.tsx` lấy `currentUser` thay vì hardcode. Build lại: `grep -c admin12345|admin@cyberlaw.vn|Quản trị viên Hệ thống|Super Admin` trên `dist/assets/index-*.js` đều = 0. Test chống tái phát `e2e/admin-access-denied.spec.ts`. Chi tiết: [rà soát sửa B3/B4](2026-10-03-sua-b3-b4.md).

**B4 — Số liệu thống kê giả vẫn hiển thị khi API lỗi.** `frontend/src/pages/admin/AdminStatsPage.tsx:49-84`: state khởi tạo bằng dữ liệu demo (`thongKeTongQuanData`, `thongKeTheoThangData`, `nhomQuyDinhData`, `danhSachCauHoiGanDay`, `danhSachNguoiDungNoiBat`, `tyLeTrichDanData`); khi `loadAdminStatistics` reject chỉ `setStatisticsError(...)` mà **không** reset — dashboard tiếp tục vẽ 1.280 người dùng / 3.450 hỏi đáp / 4.430 tra cứu như số thật, chỉ kèm một dòng `role="alert"` nhỏ.
- **✅ ĐÃ SỬA (03/10/2026):** `statistics` khởi tạo `null`, `.catch` reset `null`; ô số hiện `—`; biểu đồ/danh sách/donut/quy định/thẻ câu hỏi có trạng thái rỗng; bỏ mặc định demo ở hai card con. Test chống tái phát `e2e/admin-stats.spec.ts:310` và 5 viewport. Chi tiết: [rà soát sửa B3/B4](2026-10-03-sua-b3-b4.md).

**B5 — Route `/` phục vụ trang splash mặc định của Laravel.** `backend/api/routes/web.php:78-80` trả `view('welcome')`. **Đính chính (04/10/2026):** mục này KHÔNG trả 500 như ghi ban đầu. Đã chạy thật (`php -S 127.0.0.1:8099 -t public` + `curl /`) → **HTTP 200**, `<title>CyberLaw Search</title>`, 80.658 byte. Lý do: view có guard `@if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))` bọc `@vite(...)` (không có `public/build`/`public/hot` nên bỏ qua) và `@if (Route::has('login'))` bọc `route('login')`/`route('register')` (route thật tên `auth.login`/`auth.register` nên false). Không exception nào bị ném. Mức thực tế: **LOW** — trang mặc định không thuộc sản phẩm, lộ dấu framework; nên bỏ route hoặc chuyển hướng, không phải sự cố.

### 2.2 Cao (HIGH)

**H1 — Ranh giới sở hữu hội thoại khách dựa vào mảng session do client điều khiển.** `backend/api/app/Services/LocalAnswer.php:56-62` (`guestThreadIds`), `:81` (`owned`). Danh tính khách = "id hội thoại ∈ mảng `guest_chat_threads`" trong session, **không HMAC/chữ ký** và **không cắt lại `SESSION_CAP`** khi đọc. Kẻ kiểm soát được session của nạn nhân có thể chèn id hội thoại khách khác rồi đọc lại qua replay `GET/POST /api/answer`. Điều kiện tiên quyết bị HTTPS + `SameSite=Lax` giảm bớt. Đề xuất: ký danh sách bằng `hash_hmac(..., app.key)` (hoặc lưu server-side có chủ) và luôn cắt về cap khi đọc; thêm test xen hội thoại khách.

**H2 — Tắt toàn bộ ghi log lỗi server cho `api/*`.** `backend/api/bootstrap/app.php:31-36`: `$exceptions->report(...)` trả `false` cho mọi `api/*`, mà theo `Handler::reportThrowable` trả `false` sẽ **bỏ qua logger mặc định** → `QueryException`/`TypeError`/lỗi PHP **không được ghi log**; chỉ còn `http.completed` với `error_code` thô. Vi phạm `docs/security/03-logging.md` và làm mù sự cố khi vận hành. Đề xuất: chỉ chặn report với exception đã biết (validation/auth/http), để lỗi 500 đi qua logger có che dữ liệu.

**H3 — Thiếu security header ở tầng ứng dụng.** Ngoài `X-Content-Type-Options` và `Cache-Control` trong `ApiContext`, không có CSP, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `HSTS` trong mã. Phải cấu hình ở web server trước khi mở công khai (checklist `04-deployment.md` dòng 9).

**H4 — Cấu hình log production trong mẫu là không phù hợp.** `.env.example`: `LOG_CHANNEL=stack` + `LOG_STACK=single` + `LOG_LEVEL=debug` → ghi một file `laravel.log` không rotation, mức debug. Trong khi `config/logging.php` đã có sẵn các kênh `application` (14 ngày), `security`/`audit` (90 ngày), permission 0600, JSON. Production phải trỏ `LOG_STACK=application,security,audit` và `LOG_LEVEL=info`.

### 2.3 Trung bình (MEDIUM)

- **M1 — Khoá toàn cục MySQL cho mọi lượt đọc công khai.** `KnowledgeAdmin::serialized()` (`GET_LOCK('cyberlaw_knowledge_116_v1',5)`) được dùng ở `PublicLibraryController.php:40,95` và `PublicTermsController.php:23`. Mỗi request `/api/library`, `/api/terms` giành một named lock **toàn cục** (một request một lúc, chờ tới 5s rồi 409) — vector suy giảm khả dụng không cần auth. Nên chỉ giữ lock cho ghi/công bố; nhánh đọc dùng read view/`revision`.
- **M2 — Chưa cấu hình trusted proxy.** `bootstrap/app.php` không có `trustProxies(...)`; mọi bucket theo IP (`public-search`, `login`, `registration`, `email-send`, `reset-*`) dùng `$request->ip()`. Sau reverse proxy, IP = IP proxy → một client spam khoá cả hệ thống. Phải khai báo IP proxy tin cậy (không dùng `*`).
- **M3 — `SearchStatistics` nuốt mọi exception.** `backend/api/app/Services/SearchStatistics.php:32-34,45-47` bắt `\Throwable` trắng, trả `0`/bỏ qua → số tra cứu có thể âm thầm sai mà không có tín hiệu. Vẫn fail-open cho tìm kiếm nhưng nên ghi `SafeLog` một lần để còn cảnh báo.
- **M4 — Dữ liệu demo (gồm nội dung luật 2018) nằm trong bundle production.** `frontend/src/lib/admin-data.ts` (9 người dùng demo kèm token, thống kê demo, câu trả lời theo Luật 2018/Nghị định 15/2020 ở dòng 444,463) và `frontend/src/lib/articles.ts` (3 điều khoản hardcode). Đã xác nhận các chuỗi này có trong `dist/assets/index-*.js`. Trái phạm vi đã chốt (Luật 116/2025/QH15). Nên chuyển sang fixtures e2e hoặc gate `import.meta.env.DEV`.
- **M5 — Hồ sơ admin hardcode.** `frontend/src/pages/admin/AdminStatsPage.tsx:420-427` cứng "Quản trị viên Hệ thống" / `@admin • admin@cyberlaw.vn` / "Super Admin", trong khi `AdminLayout.tsx` đã lấy đúng `currentUser`. Mọi admin đều thấy thông tin sai.
- **✅ ĐÃ SỬA (03/10/2026):** thẻ hồ sơ lấy `currentUser` từ `useAuth()`, avatar là chữ cái đầu của họ tên, chưa có phiên thì để trống. Sửa kèm B3 vì đây là đường rò `admin@cyberlaw.vn` còn lại trong bundle.
- **M6 — `laravel/tinker` nằm trong `require`** (`backend/api/composer.json`), không phải `require-dev` → cài vào production.
- **M7 — Thiếu index cho truy vấn thống kê/audit.** `tin_nhan` chỉ có KEY `(ma_hoi_thoai, ma_tin_nhan)`; các truy vấn lọc `nguoi_gui='assistant'` + dải `ngay_tao` (`AdminStatisticsController.php`) full scan khi bảng lớn. `nhat_ky_quan_tri` không có index trên `ma_yeu_cau` trong khi `LocalAnswer::replay()` chạy 2 lần mỗi lượt hỏi.
- **M8 — Nhãn `confidence` dễ gây hiểu sai.** `frontend/src/components/admin/RecentQuestionsCard.tsx:216` in "Độ tin cậy: X%" (dữ liệu demo 92–99.4% ở `admin-data.ts:447…545`) trong khi retriever thật cap ở 88/95 và đây chỉ là tín hiệu truy hồi, không phải độ chính xác pháp lý.
- **M9 — `serve => true` trên disk `local`.** `config/filesystems.php:36` khiến framework tự đăng ký route `GET/PUT /storage/{path}`; dự án đã có đường tải riêng (`KnowledgePdf`) và không dùng signed URL → nên đặt `false`.
- **M10 — `/api/terms` N+1 + 404 dây chuyền.** `PublicTermsController.php:43` gọi `detail()` cho từng item (tới 12 truy vấn) và `detail()` dùng `firstOrFail()` → một điều khoản thiếu làm cả trang 404.
- **M11 — Chưa có job dọn dữ liệu.** Không có job dọn hội thoại khách (`ma_nguoi_dung IS NULL`), `yeu_cau_dat_lai_mat_khau`/`yeu_cau_xac_minh_email` hết hạn, hay chính sách lưu `thong_ke_tra_cuu`.

### 2.4 Thấp (LOW)

- **L1 — Tài liệu lệch số liệu.** Còn "12 bảng/111 cột" ở `data/README.md:28`, `docs/requirements/03-chuan-bi-backend.md:3,21`, `docs/requirements/02-tai-khoan-phan-quyen.md:3` (đúng hiện tại: 13 bảng/116 cột).
- **L2 — `database/cyberlaw_search.sql` đã cũ.** Chỉ 12 bảng, **thiếu `thong_ke_tra_cuu`** (`grep -c thong_ke_tra_cuu` = 0) dù `database/README.md` giới thiệu là bản bàn giao. File bị gitignore nên không lên repo, nhưng import nhầm sẽ mất bảng đếm.
- **L3 — `data/sources.json` lộ đường dẫn máy tác giả** (`D:\SLIDE\TRÍ TUỆ NHÂN TẠO\k25\ĐỒ ÁN\...`), file được track. Không phải secret nhưng là thông tin riêng.
- **L4 — Tiến trình Python con kế thừa toàn bộ env** (gồm `DB_PASSWORD`, `APP_KEY`) — nên `setEnv([...])` tối thiểu trong `LocalRetriever.php`.
- **L5 — Dead code/dependency thừa:** `App.tsx:966` (`{!auth && …}` không bao giờ chạy), `App.tsx:882-887` (`normalize()` không gọi), các gói `cn`, `@radix-ui/react-dialog`, `@radix-ui/react-label`, `@radix-ui/react-slot` không được import trong `src/`.
- **L6 — Ảnh trùng 1.2 MB:** `frontend/assets/ai-assistant.png` (không phục vụ) và `frontend/public/assets/ai-assistant.png` đều được track; repo track ~36.5 MB.
- **L7 — `backend/api/public/favicon.ico` rỗng 0 byte**; `README.md` còn mô tả trạng thái cũ ("Chưa có API Laravel…").

## 3. Điểm đã tốt (không cần sửa)

- SQL injection: mọi truy vấn dùng binding/định danh hằng; `whereRaw`/`selectRaw` an toàn.
- Mass assignment: `NguoiDung::$fillable` giới hạn; `vai_tro/trang_thai` gán tường minh.
- IDOR/lộ dữ liệu: `HistoryController::owned()` lọc theo chủ sở hữu; `$hidden` che `mat_khau`/`ma_ghi_nho`; `me` allowlist trường.
- CSRF/origin: mọi route ghi nằm trong nhóm `web` (CSRF bắt buộc); `ApiContext` chặn Origin ngoài allowlist; `trimStrings(except: ['mat_khau'])` đúng.
- Session cookie: `secure` mặc định `true` khi `APP_ENV=production`, `http_only=true`, `same_site=lax`.
- Python: `backend/ai/retriever.py` chỉ dùng stdlib, **không** mạng/DB/tải model; Laravel gọi bằng argument array cố định, JSON qua stdin, timeout 12s, validate biên `confidence`, fail-closed 503.
- `schema.sql` khớp đủ 6 migration (13 bảng/116 cột); seeder rỗng, không tài khoản/mật khẩu dựng sẵn.
- Không có `dangerouslySetInnerHTML`/`eval`; URL từ API đều lọc `^https?://` trước khi render `href`.

## 4. Kết luận

- **Chức năng:** phần nghiệp vụ cốt lõi (tra cứu, thư viện, thuật ngữ, hỏi đáp AI cục bộ, lịch sử, quản trị, thống kê) **đã chạy thật** với dữ liệu Luật 116/2025/QH15 đã công bố; 121 test backend và 152 test e2e đạt (152 sau khi thêm test chống tái phát cho B3/B4).
- **Chưa deploy-ready:** còn **2 mục chặn deploy** (B1–B2; **B3, B4 đã sửa ngày 03/10/2026** — xem [rà soát sửa B3/B4](2026-10-03-sua-b3-b4.md); B5 hạ xuống LOW sau đính chính 04/10/2026), 4 mục HIGH (H1–H4; **M5 đã sửa kèm B3**) và các mục trung bình còn lại ở trên. Không có lỗ hổng Critical đã xác nhận từ mã, nhưng **thiếu hạ tầng và cấu hình production**, chưa có staging/DAST, chưa rà dependency/secret toàn lịch sử.
- **Bằng chứng thô:** output test local (không commit); tài liệu này đã che dữ liệu, không chứa mật khẩu/secret.
