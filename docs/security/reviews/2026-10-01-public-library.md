# Rà soát bảo mật: Thư viện văn bản

Ngày 01/10/2026. Phạm vi: API công khai `/api/library`, `/api/library/articles/{number}`, `/api/library/pdf` và giao diện thư viện. Không dùng hoặc sửa dữ liệu MySQL thật trong test.

| Before | After | Why |
|---|---|---|
| Thư viện dùng ba bài mẫu trong frontend | Chỉ tải metadata, mục lục và điều khoản đã `published` của `116/2025/QH15` | Không hiển thị nhầm bản nháp hoặc luật ngoài phạm vi |
| Không có endpoint đọc theo điều | API giới hạn số dòng, kiểm tra trạng thái công bố và phiên bản | Giảm payload và tránh trả dữ liệu ngoài tài liệu đã duyệt |
| Chưa có đường tải PDF công khai | Chỉ cho tải PDF của văn bản đã công bố, đường dẫn qua allowlist và kiểm tra canonical path | Chặn path traversal và không lộ đường dẫn nội bộ |

## Kết quả

- PASS: `PublicLibraryTest` 6 tests / 97 assertions trên SQLite in-memory: bản nháp trả mục lục rỗng, công bố trả điều theo thứ tự, không lộ `duong_dan_tep`, đường dẫn PDF không tin cậy bị từ chối, kiểm tra thu hồi, rate limit, Origin và log request ID.
- PASS: `PublicSearchTest` 6 tests / 115 assertions.
- PASS: frontend build và E2E typecheck.
- PASS: `main-site.spec.ts` 2/2 và `public-reveal.spec.ts` 10/10; responsive giả lập 320/440/760/761/834/956×440/1150/1151/1440.
- PASS: `library.spec.ts` 2/2 và `public-reveal.spec.ts` 12/12; kiểm tra mục lục 45 điều, nội dung dài, phản hồi đến muộn, lỗi 404 và retry ở 320/440/760/761/834/956×440/1150/1151/1440.
- PASS: animation giữ `AdminTabReveal` 950ms với delay mục lục 80ms và nội dung 160ms; đổi điều và tải lại dữ liệu không replay Fade In Up, node nội dung được giữ ổn định.
- CHƯA CHẠY: thiết bị thật, production DAST/ZAP, backup/restore và antivirus PDF; hiện chưa có staging được ủy quyền.

Không thay đổi dependency, auth hoặc schema. Log chỉ ghi sự kiện, route và request ID qua allowlist; không ghi nội dung điều khoản, đường dẫn riêng hoặc query người dùng.
