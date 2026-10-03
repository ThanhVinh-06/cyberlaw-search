# Rà soát bảo mật — thống kê lượt tra cứu — 03/10/2026

- **Ngày, người/agent kiểm tra:** 03/10/2026, agent Claude Code (theo yêu cầu chủ dự án).
- **Commit/base và file chưa commit liên quan:** trên nền `f30ba3d`; các file đang sửa: `backend/api/app/Services/SearchStatistics.php` (mới), `backend/api/app/Services/PublicKnowledgeSearch.php`, `backend/api/app/Http/Controllers/AdminStatisticsController.php`, `backend/api/tests/Support/KnowledgeSchema.php`, `backend/api/tests/Feature/{SearchStatisticsTest,AdminStatisticsTest}.php`, `database/schema.sql`, `database/migrations/20261003_thong_ke_luot_tra_cuu.sql` (mới), frontend (`AdminStatsPage.tsx`, `admin-data.ts`, `e2e/admin-stats.spec.ts`).
- **Phạm vi route/dữ liệu/vai trò, ranh giới tin cậy:** `GET /api/search` (ghi đếm, khách công khai), `GET /api/admin/statistics` (đọc, admin active + Gate `quan_ly_van_ban`). Dữ liệu: bảng mới `thong_ke_tra_cuu`. Ranh giới tin cậy: trình duyệt công khai → Laravel; bảng chỉ nhận số đếm do server sinh, **không** nhận dữ liệu từ client.
- **Môi trường/URL test được phép, phiên bản tool, dữ liệu giả:** SQLite in-memory trong `backend/api`; tài khoản giả, luật fixture. PHP 8.2.12 (XAMPP), Laravel 12. **Bổ sung sau khi chủ dự án áp migration:** kiểm tra chỉ-đọc và kiểm tra đồng thời trên MySQL phát triển (`cyberlaw_search`), có xoá sạch dòng test sau khi đo (xem hàng "Đồng thời trên MySQL thật").
- **Thay đổi cần bảo vệ và mã CL/API liên quan:** thêm bảng đếm gộp giờ; gọi đếm trong `PublicKnowledgeSearch::search()`; đọc số thật trong `AdminStatisticsController::overview()`; bỏ nhánh `null`/"chưa thu thập" ở frontend.

## Kết quả

| Kiểm tra | Cách chạy/test ID | Kết quả | Bằng chứng và giới hạn |
|---|---|---|---|
| Review code và kiểm tra đầu vào/quyền | Đọc diff `SearchStatistics`/`PublicKnowledgeSearch`/`AdminStatisticsController` | PASS | Đếm nằm trong `search()` (chỉ route danh sách); `detail()` không đụng nên `/api/search/{id}` và `/api/terms` không đếm; trang thống kê vẫn qua `account.active`+`role.admin`+Gate |
| Chỉ đếm đúng endpoint danh sách | `SearchStatisticsTest::test_only_the_list_endpoint_is_counted` | PASS | Gọi `/api/search/1`, `/api/library`, `/api/terms` ⇒ `so_luot` không đổi |
| Gộp theo giờ, không tạo dòng vô hạn | `test_each_successful_list_search_adds_one_and_is_grouped_by_hour` | PASS | 3 lượt cùng giờ ⇒ **1 dòng**, `so_luot = 3`; UNIQUE `gio` chặn dòng trùng |
| Không lưu PII/từ khóa | `test_counter_stores_no_pii_or_query_text` | PASS | Cột bảng đúng `[ma_thong_ke, gio, so_luot, ngay_tao, ngay_cap_nhat]`; canary `PRIVATE-COUNTER-CANARY` trong `?q=` **không** xuất hiện; `gio` đã cắt phút/giây = 0 |
| Chịu lỗi khi thiếu bảng (fail-open) | `test_counting_failure_is_open_and_does_not_break_search` | PASS | Drop bảng rồi gọi `/api/search` ⇒ vẫn `200`, `total` đúng; lỗi đếm không lộ ra ngoài |
| Trang thống kê trả số thật | `AdminStatisticsTest::test_search_counts_come_from_the_hourly_counter` | PASS | `search_available = true`; `overview.tong_tra_cuu` = 7; `months[].tra_cuu` là số (không null), cộng đúng theo bucket; dữ liệu ngoài kỳ không lọt vào tổng |
| Injection / tham số hóa | Review truy vấn | PASS | `insertOrIgnore`/`increment`/`sum` dùng query builder tham số hóa; endpoint đọc không nhận sort/filter từ client; không nối chuỗi SQL |
| Log không rò nội dung | Đọc `SafeLog` + test canary hiện có | PASS | Sự kiện `public.search.completed` chỉ có request ID/route; **không** log từ khóa; bảng đếm không chứa nội dung truy vấn |
| Giới hạn tài nguyên | `public-search` limiter | PASS | `throttle:public-search` 60/phút/IP (khoá HMAC) vẫn áp; request bị 429 không chạy `search()` nên không đếm; bảng có biên ~24 dòng/ngày |
| Regression bảo mật hiện có | `php artisan test` toàn bộ | PASS | **121 PASS (1296 assertions)**; `PublicSearchTest` (nháp/nguồn/log canary/rate limit) và `AdminStatisticsTest` giữ nguyên kỳ vọng |
| Animation giữ nguyên trước/sau | `admin-stats.spec.ts` + `admin-users-reveal.spec.ts` | PASS | Trước sửa **10/10**, sau sửa **10/10** (frames `[{opacity:'0',translate:'0 14px'},{opacity:1,translate:'0 0'}]`, duration 1200, recent delay 300) |
| Responsive | `admin-responsive.spec.ts` | PASS | 320/440/834/900/901/956/1024/1440 + ngang 956×440 **9/9**; thẻ thêm dòng phụ không tràn (kiểm tra giả lập, chưa test máy thật) |
| Đồng thời trên MySQL thật | 8 tiến trình PHP song song × 5 lượt vào cùng giờ | PASS | Sau khi áp migration: `sum` tăng đúng **+40** (3→43), vẫn **1 dòng** cho giờ đó — không mất lượt. Cấu trúc khớp thiết kế: 5 cột, `gio` UNIQUE `duy_nhat_thong_ke_tra_cuu_gio`, `so_luot` default 0. Đã xoá dòng test, bảng về 0 |
| Dependency/secret/SAST | — | NOT RUN | Không đổi dependency trong lần này; chưa có staging và công cụ quét phù hợp |

## Phát hiện

### F1 — Trang thống kê có thể 500 nếu bảng đếm chưa được migrate — ĐÃ XỬ LÝ (fail-open phía đọc)

- **Trạng thái:** đã xác nhận và đã phòng ngừa.
- **Điều kiện ảnh hưởng:** `AdminStatisticsController::overview()` truy vấn `thong_ke_tra_cuu`; nếu chủ dự án chưa chạy migration trên MySQL, SELECT sẽ lỗi và trang thống kê trả 500.
- **Cách sửa:** `SearchStatistics::sumBetween()` bọc `try/catch` trả `0` khi bảng thiếu/lỗi; `record()` cũng fail-open nên luồng tìm kiếm không bị ảnh hưởng.
- **Test lại:** `test_counting_failure_is_open_and_does_not_break_search` PASS; `AdminStatisticsTest` PASS khi bảng rỗng.

### F2 — Ghi đếm là thao tác phụ, không được làm hỏng nghiệp vụ chính — ĐÃ XỬ LÝ

- **Trạng thái:** đã xác nhận, đã thiết kế fail-open.
- **Ràng buộc:** bảng đếm tách khỏi `hoi_thoai`/`tin_nhan`; lỗi ghi chỉ bị nuốt (không ghi chi tiết, không lộ stack). Số liệu có thể thiếu nếu DB lỗi tạm thời — chấp nhận được vì là số liệu thống kê, không phải dữ liệu nghiệp vụ.

## Kết luận

- **Đã sửa/đã test lại:** backend **121 PASS (1296 assertions)** (thêm `SearchStatisticsTest` 4 test + 1 test trong `AdminStatisticsTest`); frontend `npm run build` + `typecheck:e2e` PASS; Playwright animation 10/10 và responsive 9/9 PASS. Không đổi dependency.
- **Còn mở:** (1) ~~Migration `20261003_thong_ke_luot_tra_cuu.sql` phải chạy tay trên MySQL~~ **Đã áp 03/10/2026** — đã kiểm tra cấu trúc (5 cột, UNIQUE `gio`) và ghi đồng thời thật trên MySQL, bảng đã xoá về 0 sau test. (2) ~~Chưa test đồng thời thật trên MySQL~~ **Đã xác nhận**: 8 tiến trình × 5 lượt song song cùng giờ ⇒ +40 đúng, không mất lượt, 1 dòng/giờ. (3) Chưa có job dọn/lưu trữ bảng đếm theo thời hạn (biên tự nhiên ~24 dòng/ngày nên chưa gấp).
- **Thiếu công cụ/môi trường:** chưa chạy dependency/secret/SAST (không đổi dependency); chưa có staging để DAST.
- **Chức năng hoàn thành trong phạm vi nào?** Biểu đồ tra cứu và dòng phụ "N lượt tra cứu" dùng số thật từ bảng gộp giờ; chỉ đếm `GET /api/search`; không lưu PII; animation/responsive giữ nguyên. Migration đã áp và đã kiểm tra đồng thời trên MySQL; **vẫn chưa deploy-ready** vì các mục tồn khác của dự án (retention, staging/DAST, review tài khoản).
- **Bằng chứng thô:** output test local (không commit); tài liệu này đã che dữ liệu, không chứa secret hay nội dung truy vấn thật.
