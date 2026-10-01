# Rà soát chuẩn hóa và nạp tri thức 116/2025

Ngày 30/09/2026. Phạm vi: trích xuất offline, bộ dữ liệu nháp, lệnh Laravel CLI nạp 5 bảng và một sửa CSS khi kiểm tra responsive. Không có API upload/CRUD/AI mới. Áp dụng `.agent/cyberlaw-security/SKILL.md`.

## Kết quả

- 8 chương, 45 điều, 207 khoản, 282 điểm → 434 đơn vị; 60 từ khóa, 1.326 liên kết, 434 bản ghi phân loại. Xem [mapping và giới hạn](../../data/01-du-lieu-luat-116.md).
- Đã nạp MySQL draft, đọc lại và so từng trường; nạp lại trả `unchanged`, không tạo bản sao.
- Audit cùng transaction có request ID `a10ae512-6b3e-43b0-8e5c-f1c658c330bb`; bundle hash `da64cec303b01741bc4e7773e7a470dfcd636faf632040486b2e21ebca1457ad`.
- So fingerprint trong bộ nhớ trước/sau: tài khoản, hội thoại, tin nhắn, trích dẫn, reset, xác minh email không đổi. Không xuất/lưu nội dung hoặc fingerprint riêng tư. Báo cáo `data/interim/verification/law116/mysql-import.json` chỉ có kết quả/counts/request ID/hash bộ luật.

## Kiểm soát

| Rủi ro | Kiểm soát / bằng chứng |
|---|---|
| Nạp nhầm luật/tệp đã sửa | Đường dẫn, SHA-256 của bundle và PDF cố định trong code; giới hạn 8MB trước decode |
| Mất khoản/điểm/ngữ cảnh | Tái trích PDF, kiểm kê 45/207/282, thứ tự, phục dựng 494 đoạn; regression đoạn nối, thời hạn, ngoại lệ |
| SQL injection / gán cột | Bindings; dữ liệu đã pin; không nhận URL/file/tên bảng/cột từ request; không có route gọi importer |
| Ghi đè đã duyệt | So từng trường/counts/liên kết, từ chối khác biệt; không UPDATE/DELETE/merge ngầm |
| Nạp dở, mất audit | Cùng transaction; trigger lỗi ở bản ghi 200 và audit đều rollback trong SQLite riêng |
| Nạp trùng | GET_LOCK MySQL, unique locator, nạp lại đối chiếu và không ghi. Chưa stress nhiều tiến trình |
| Công bố sớm | Văn bản draft, chunks `duoc_phuc_vu=false`, lệnh không có tùy chọn publish |
| Lộ dữ liệu qua log | SafeLog allowlist event/outcome/request ID/error code; không ghi exception/input/SQL bindings. Canary trong lỗi SQL không xuất ra output |
| Dữ liệu riêng vào AI | Công cụ xuất chỉ đọc luật công khai, không đọc tài khoản/chat/OTP |
| XSS/prompt injection sau này | Chưa có API/LLM mới; khi tích hợp cần encode text, kiểm tra citation và không cho nguồn truy hồi cấp quyền công cụ |

## Lỗi đã sửa

### MySQL coi điểm d và đ là một

`ky_hieu_diem` kế thừa `utf8mb4_0900_ai_ci`: SELECT thật trả d=đ là 1; nạp bị UNIQUE lỗi 1062. Hai lần thử/chẩn đoán đều rollback, kiểm tra 5 bảng vẫn 0. Auto-increment có thể có khoảng trống, không giả định ID liên tiếp.

Migration đổi một cột sang `utf8mb4_0900_as_ci` đã được chủ dự án chạy trong Workbench. Đọc metadata xác nhận collation mới và d=đ trả 0; cập nhật schema cài mới. Importer kiểm tra trước ghi; không cấp ALTER cho user app, không bỏ dấu để né lỗi. Nạp thật và đối chiếu 434 đơn vị đạt. SQLite không phát hiện đặc tính collation MySQL này; không dùng kết quả SQLite để thay thế kiểm thử MySQL.

### Tràn ngang 956×440

Áp dụng skill `.agent/skills/skills/emil-design-eng/SKILL.md` cho sửa bố trí nhỏ.

| Before | After | Why |
|---|---|---|
| `.sr-only` trong bảng làm document rộng 1012px ở viewport 956px vì containing block ở ngoài vùng cuộn | `.cl-knowledge-desktop-list { position: relative; }` | Giữ nhãn trợ năng trong vùng cuộn bảng; vẫn có thể cuộn đọc các cột |

Ca ngang từng FAIL đã PASS sau sửa. Thêm hồi quy 900/901px và ngang; không thay animation.

## Kiểm thử / giới hạn

- PHPUnit **63 tests / 550 assertions PASS**, gồm 8 test mới: dry-run, nạp/nạp lại, tài khoản không đổi, xung đột, thiếu/thừa quan hệ/rule, từ khóa có sẵn, rollback, hash/quá lớn. Fixture chỉ SQLite `:memory:`; không tạo/xóa tài khoản thử trên MySQL thật.
- Validator PASS: NFC, giới hạn ký tự VARCHAR/byte TEXT, keys/FK, quote, trang/hash/draft. Python **6/6 PASS** kiểm tra biến thể lỗi và tập QA phát triển. Không thấy canary lỗi SQL trong log cục bộ.
- Responsive ban đầu 12/12, bổ sung ca ngang phát hiện lỗi rồi sửa. Chạy lại **10/10 PASS** tại 320,440,834,900,901,956×440,1440. Touch menu/bàn phím/dialog/reduced motion/Axe theo test hiện có. **Giả lập Edge**, không phải thiết bị thật; UI demo/fixture không chứng minh API quản trị hoạt động.
- Build/typecheck PASS, còn cảnh báo bundle >500kB cũ. Pint PASS. Không sửa dependency runtime hoặc phát hành release; chưa audit lại toàn bộ dependency hay lịch sử Git.
- Logger dùng rotation và vị trí ngoài public webroot hiện có. Audit DB bền vững nếu ghi file lỗi. Chưa kiểm thử hết đĩa, rotation dung lượng, collector, ACL/alert hosting. Giới hạn deploy tài khoản trước đây vẫn còn.
- Hash chống tệp dữ liệu bị đổi riêng lẻ, không bảo vệ khi code tin cậy/repository cùng bị chiếm quyền. CLI và quyền sửa repo là ranh giới vận hành.
- Chưa xác minh toàn bộ lịch sử sửa đổi; trường ngữ nghĩa NULL là chưa bóc tách riêng. Không tuyên bố luật đúng 100%, AI sẵn sàng hoặc deploy-ready. Chưa commit/push; SQL/env/dump/thông tin riêng không đưa lên GitHub.
