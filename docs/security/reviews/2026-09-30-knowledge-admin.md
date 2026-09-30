# Rà soát bảo mật: quản trị Văn bản & Tri thức

- Ngày, agent: 30/09/2026, Codex
- Phạm vi: `/api/admin/knowledge`, Laravel session/CSRF, vai trò admin, dữ liệu luật 116/2025 draft, upload PDF và giao diện `/admin/documents`.
- Môi trường: PHPUnit SQLite in-memory; Playwright Edge localhost với SQLite riêng và Mailpit không dùng cho nghiệp vụ tri thức; MySQL thật chỉ đọc kiểm tra.

## Kết quả

| Kiểm tra | Cách chạy | Kết quả | Bằng chứng và giới hạn |
|---|---|---|---|
| Quyền, CSRF, Origin, input | `KnowledgeAdminTest` 8 bài | PASS | 148 assertions; guest/user/blocked bị chặn, revision chống ghi đè, allowlist trường, FK/unique và điểm `d`/`đ` được kiểm tra |
| CRUD, liên kết, công bố | `KnowledgeAdminTest` | PASS | Audit cùng transaction; xóa bị chặn khi còn căn cứ/trích dẫn; công bố yêu cầu đối chiếu, nguồn, ngày và trang |
| Upload/PDF | `KnowledgeAdminTest::test_upload...` | PASS | 20MB, PDF header, đường dẫn server sinh; PDF tải xuống attachment; path traversal bị 404; rollback xóa tệp |
| Log/audit | test rollback + audit | PASS | Không ghi body/PDF; audit DB nằm trong transaction. Structured log chỉ ghi ID/loại; rotation/collector production chưa chạy |
| Giao diện và responsive | `admin-knowledge.spec.ts` | PASS | 10/10 UI tests; 320, 440, 834, 900, 901, 956×440, 1440; keyboard, Axe, reduced motion và Fade In Up |
| HTTP thật | `knowledge-backend.spec.ts` | PASS | 6/6 với Laravel + SQLite riêng; CRUD sau reload, PDF attachment, stale revision, CSRF, công bố và responsive |
| Build/typecheck | `npm run build`, PHP lint/Pint | PASS | Build thành công; còn cảnh báo bundle JS >500kB |
| Dependency/production scan | chưa chạy | NOT RUN | Chưa có staging/lock review riêng cho chức năng này |

## Phát hiện đã sửa

- `KA-01` (Medium, đã sửa): API skeleton trước đó trả toàn bộ dữ liệu không giới hạn, nhận `duong_dan_tep` tùy ý và status không kiểm tra nguồn. Đã thay bằng snapshot bounded, phân trang/lọc server, đường dẫn PDF allowlist, review khi công bố và revision.
- `KA-02` (Medium, đã sửa): giới hạn đọc/ghi dùng chung làm thao tác công bố bị 429 sau nhiều lần chuyển tab. Tách `knowledge-read` và `knowledge-write`, có regression test.
- `KA-03` (Low, đã sửa): giao diện dùng dữ liệu demo khi API lỗi. Đã chuyển trạng thái rỗng/lỗi, khóa thao tác và nút tải lại; fixture demo chỉ còn trong test UI.

## Giới hạn còn mở

- Chưa có workflow nhiều người duyệt hoặc lịch sử phiên bản đầy đủ; hiện dùng draft/published/archived và yêu cầu admin xác nhận.
- Upload chỉ kiểm tra chữ ký PDF đầu tệp, chưa parse/antivirus/giới hạn thời gian trên hạ tầng triển khai.
- Snapshot quản trị vẫn bounded 5.000 bản ghi/16MB; corpus hiện 1/434/60/434 nên nằm trong giới hạn. Dự án lớn hơn cần endpoint lookup riêng.
- Chưa gọi là deploy-ready: cần staging, queue/collector log, backup/restore và kiểm tra dependency/deploy trước phát hành.
