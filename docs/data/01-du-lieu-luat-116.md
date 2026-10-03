# Bộ dữ liệu nguyên bản Luật An ninh mạng 116/2025/QH15

Cập nhật 30/09/2026. Bộ nền phục vụ nạp MySQL và chuẩn bị truy hồi AI; bundle nạp ở trạng thái **draft** (công bố là bước riêng, xem mục 6). Đã đối chiếu dữ liệu nguyên bản, chưa chứng nhận đây là văn bản hợp nhất hiện hành, chưa đo độ chính xác AI.

## 1. Nguồn và phạm vi

- Nguyên bản ban hành 10/12/2025, ngày hiệu lực được ghi trong luật là 01/07/2026. Metadata đối chiếu [Công báo Chính phủ](https://congbao.chinhphu.vn/van-ban/luat-so-116-2025-qh15-468678/61574.htm) và [Cổng Chính phủ](https://chinhphu.vn/?classid=1&docid=216499&orggroupid=1&pageid=27160).
- Trích xuất từ PDF Công báo có lớp chữ, 37 trang; hash `8e19e14fd57666baec8f16b7ca2832cbf7f24030a5e6ee0c574e15d0d48ad971`. Giữ nguyên bản scan và bản xuất web người dùng cung cấp.
- Đã xem 37 trang scan, đối chiếu cấu trúc, đoạn nối trang và những khác biệt với bản web. So sánh tự động từng điều ghi 71 đoạn khác biệt trong `data/interim/verification/law116/source-differences.json`: 60 liên quan nhãn giao diện web, 8 chữ hoa/thường, 1 dấu trong “hoá/hóa”, 2 thao tác dịch chuyển khoản 17 Điều 43. Giữ cách viết của Công báo.
- Bản web đặt khoản 17 trước khoản 16 Điều 43. Bản scan trang 36 và Công báo xác nhận thứ tự 16 → 17.
- Bộ hiện tại chỉ chứa luật 116. Luật 2018 và PDF 143 tải để kiểm tra lịch sử không được đưa vào bộ truy hồi này. Điều 43 vẫn được giữ nguyên vì là một phần của luật 116; nội dung sửa luật khác được gắn cờ, không nhầm với toàn văn các luật được dẫn.
- Kiểm tra lịch sử sửa đổi chưa hoàn tất: kết quả lập chỉ mục từ CSDL văn bản pháp luật gắn quan hệ với 143/2025/QH15 nhưng trang lịch sử không truy cập được ổn định. Đọc Điều 50 luật 143 thấy thay đổi luật thuế và có nhắc luật 116 trong chuỗi văn bản liên quan; chưa đủ căn cứ để tự hợp nhất/sửa nội dung 116. Không tự kết luận metadata sai hoặc luật không có sửa đổi.

## 2. Kiểm kê

| Thành phần | Số lượng |
|---|---:|
| Văn bản | 1 |
| Chương / điều | 8 / 45 |
| Khoản / điểm | 207 / 282 |
| Đoạn nội dung gốc | 494 |
| Đơn vị tra cứu trong `dieu_khoan` | 434 |
| Từ khóa | 60 |
| Định nghĩa nguyên văn Điều 2 | 23 |
| Liên kết điều khoản–từ khóa | 1.326 |
| Bản ghi phân loại `quy_dinh` | 434 |
| Tình huống phát triển AI | 28 |

434 đơn vị = 282 điểm + 152 khoản không chia điểm. Không nạp thêm nguyên điều/nguyên khoản cha trùng với các điểm con. Toàn văn, tên chương, lời mở đầu và phần thông qua luật được lưu riêng trong bản cấu trúc để phục dựng và kiểm tra.

## 3. Tệp bàn giao

Trong `data/processed/luat-116-2025-v1/`:

- `du-lieu-nap.json`: dữ liệu 5 bảng, dùng khóa nguồn ổn định thay ID tự tăng.
- `toan-van-cau-truc.json`: toàn văn, cây điều–khoản–điểm và tọa độ dòng trong PDF.
- `ai-chunks.jsonl`: 434 đơn vị có số điều/khoản/điểm, phiên bản, hash, ngữ cảnh và nguồn. Tất cả `duoc_phuc_vu=false`.
- `manifest.json`: phiên bản, số lượng, giới hạn và SHA-256 từng tệp.
- `kiem-tra.json`: kết quả kiểm tra tự động gần nhất.

`data/evaluation/luat-116-phat-trien-v1.jsonl` có 24 câu truy hồi kèm đoạn đối chiếu và 4 tình huống không được suy diễn. Đây là tập **phát triển**, chưa phải bộ kiểm thử độc lập được chuyên gia duyệt. Không lấy nó làm bằng chứng “AI chính xác”.

## 4. Ánh xạ đầy đủ vào database

| Bảng / trường | Cách điền |
|---|---|
| `van_ban.ma_van_ban` | MySQL cấp ID khi nạp; không hard-code 1 |
| `so_hieu`, `tieu_de`, `co_quan_ban_hanh` | 116/2025/QH15, Luật An ninh mạng, Quốc hội |
| `ngay_ban_hanh`, `ngay_hieu_luc` | 2025-12-10, 2026-07-01, đối chiếu nguồn |
| `ngay_het_hieu_luc` | NULL = chưa ghi nhận; không phải chứng nhận còn hiệu lực toàn bộ |
| `lien_ket_nguon` | Trang Công báo |
| `duong_dan_tep` | Đường dẫn tương đối từ gốc dự án tới PDF Công báo; API tải PDF sẽ cần nối sau |
| `phien_ban_noi_dung`, `trang_thai` | 1, draft — bundle ghim cứng; công bố là thao tác riêng trên trang quản trị (xem mục 6) |
| `dieu_khoan.ma_dieu_khoan`, `ma_van_ban` | ID tự tăng và FK của văn bản vừa nạp |
| `chuong`, `so_dieu`, `so_khoan`, `ky_hieu_diem` | Vị trí đúng bản gốc; điểm rỗng khi là nguyên khoản; phân biệt `d` và `đ` |
| `tieu_de` | Tên đầy đủ của điều, không bịa tiêu đề cho từng điểm |
| `noi_dung` | Câu dẫn + nguyên văn đơn vị; giữ cả đoạn tiếp diễn của điểm/khoản |
| `trang_nguon` | Trang đầu phần trích có ngữ cảnh trong đúng PDF Công báo, đếm từ 1 |
| `thu_tu` | 1–434 theo thứ tự luật, không sắp xếp số điều bằng chuỗi |
| `tu_khoa.ma_tu_khoa` | MySQL cấp ID |
| `cum_tu` | 23 khái niệm Điều 2 + 37 cụm tìm kiếm thực sự có trong nguồn |
| `bien_the` | Mảng JSON dạng không dấu phục vụ tìm kiếm; không coi là đồng nghĩa pháp lý |
| `dinh_nghia`, `ma_dieu_khoan_dinh_nghia` | Nguyên văn định nghĩa + FK Điều 2. Từ khóa tìm kiếm khác để NULL, không tự tạo định nghĩa |
| `dieu_khoan_tu_khoa` hai FK | Liên kết bằng khóa nguồn → ID thật; khớp cụm từ theo ranh giới từ, có phân biệt dấu |
| `quy_dinh.ma_quy_dinh`, `ma_dieu_khoan` | ID tự tăng, FK đơn vị nguồn |
| `loai_quy_dinh` | Một nhãn chính để điều hướng; nhóm không thuần một loại giữ `other` |
| `chu_the` | Trích chủ thể khi đã chọn rõ từ câu dẫn/tiêu đề; các trường hợp chưa tách để NULL |
| `hanh_vi` | Giữ nguyên đơn vị có ngữ cảnh, chưa rút gọn thành mệnh đề suy diễn |
| `doi_tuong`, `dieu_kien`, `ngoai_le` | NULL khi chưa tách riêng; thông tin vẫn nằm đầy đủ trong nguyên văn |
| `trich_nguyen_van` | Nguyên văn đoạn chính, là đoạn thực sự có trong `noi_dung`; câu dẫn giữ trong đơn vị cha |
| `ngay_tao`, `ngay_cap_nhat` của 4 bảng nội dung | Thời điểm nạp, không giả làm ngày ban hành; giữ nguyên khi nạp lại |

**NULL ở các trường ngữ nghĩa không có nghĩa luật không có điều kiện/ngoại lệ.** Giai đoạn này đã giữ đầy đủ nguyên văn và phân loại, chưa hoàn thành mô hình suy diễn pháp lý. AI sau này phải đọc nguyên khoản/toàn điều và dẫn chiếu; không suy luận chỉ từ vài trường đã bóc tách. Bảng liên kết không có timestamp theo schema.

## 5. Quy tắc giữ nghĩa

- Chỉ chuẩn hóa Unicode NFC, khoảng trắng và xuống dòng trình bày; giữ dấu câu, phủ định, số liệu, chữ viết hoa theo nguồn.
- Điểm `b` khoản 4 Điều 20 có hai đoạn: đoạn về Bộ Quốc phòng thuộc chính điểm b, không gắn sang điểm c.
- Đoạn về chi nhánh doanh nghiệp nước ngoài thuộc khoản 3 Điều 25; đoạn Ban Cơ yếu thuộc khoản 6 Điều 27; đoạn về Bộ Quốc phòng/Ban Cơ yếu thuộc khoản 2 Điều 33.
- Giữ đầy đủ 24 giờ/03 giờ, 24 giờ/06 giờ ở Điều 25, ngoại lệ tập huấn Điều 34, 15% Điều 38, thời hạn 12 tháng Điều 45.
- `trang_pdf` nằm trong 1–37; số trang in Công báo = trang PDF + 3. Không dùng số trang bản xuất web 41 trang để mở Công báo.
- Dẫn chiếu “Điều này”, “khoản này”, luật khác vẫn nguyên văn. Chưa giải quyết toàn bộ đồ thị dẫn chiếu; không tự coi các luật ngoài kho là căn cứ đã truy hồi.

## 6. Tái tạo và nạp an toàn

Chạy tại gốc dự án, Python 3.11 và PyMuPDF 1.28.2 (requirements của công cụ trong `scripts/knowledge/requirements.txt`):

```powershell
python -X utf8 scripts/knowledge/extract_law.py
python -X utf8 scripts/knowledge/compare_sources.py
python -X utf8 scripts/knowledge/build_dataset.py
python -X utf8 scripts/knowledge/build_evaluation.py
python -X utf8 scripts/knowledge/validate_dataset.py
python -X utf8 -m unittest discover -s scripts/knowledge -p test_dataset.py -v
cd backend/api
& C:\xampp\php\php.exe artisan cyberlaw:import-knowledge
& C:\xampp\php\php.exe artisan cyberlaw:import-knowledge --apply
```

Lệnh đầu chỉ đối chiếu; `--apply` mới ghi. Chỉ nhận đúng tệp và digest đã rà trong mã; không nhận URL, upload, đường dẫn tùy ý hoặc bảng/cột do người dùng nhập. Đổi dữ liệu cần kiểm tra lại và cập nhật hash được duyệt, không bỏ kiểm tra hash để “chạy cho được”. Tệp JSON dùng LF để digest không đổi giữa Windows/Linux.

**Nạp xong phải công bố thủ công (quan trọng khi triển khai).** Bundle ghim cứng `van_ban.trang_thai = draft` và `phien_ban_noi_dung = 1` (đổi hai trường này trong tệp sẽ hỏng digest và bị `knowledge_bundle_mismatch`; test còn chủ động kiểm tra ca đó). Vì vậy sau `--apply`, mọi API công khai — tra cứu, thư viện, thuật ngữ, hỏi đáp AI — **vẫn trả rỗng/409** cho tới khi quản trị viên vào *Văn bản & Tri thức* công bố văn bản (`published`, tăng `phien_ban_noi_dung`). Đây là bước bắt buộc trong runbook deploy, không phải sự cố.

**Vì sao lệnh có thể báo `knowledge_existing_conflict`.** Trình nạp so **từng trường** của dòng `van_ban` hiện có với bundle (gồm `trang_thai`, `phien_ban_noi_dung`). Trên máy đã công bố, DB là `published`/v2 còn bundle là `draft`/1 nên lệnh dừng với `Khong ghi de du lieu cu` — **đúng thiết kế fail-closed**, không phải dữ liệu hỏng và không ảnh hưởng ứng dụng đang chạy. Muốn khôi phục đúng nghĩa “đối chiếu khớp” thì phải xuất lại bundle từ tri thức đã công bố (kèm cập nhật `BUNDLE_SHA256`, test tamper và review bảo mật); chưa làm ở thời điểm 03/10/2026.

Nạp trong transaction + khóa MySQL; ID được tra theo khóa nguồn, SQL có binding, audit bắt buộc cùng transaction. Lỗi audit hay ghi giữa chừng phải rollback. Nếu tồn tại đúng nội dung thì không ghi; nếu thiếu, thừa hoặc đã sửa thì dừng, không tự xóa/ghi đè/merge. Không nạp luật khác, tài khoản hay lịch sử hội thoại.

### Sửa lỗi collation thực tế

`ky_hieu_diem` ban đầu kế thừa `utf8mb4_0900_ai_ci`, khiến `d = đ` và khóa UNIQUE từ chối bản ghi. Lần nạp đã rollback hoàn toàn. Chủ dự án đã chạy `database/migrations/20260930_phan_biet_diem_d_va_dd.sql` ngày 30/09; đã kiểm tra cột là `utf8mb4_0900_as_ci` và phép so sánh trả 0. Không cấp quyền ALTER cho user ứng dụng. Không cần chạy lại trên máy hiện tại.

Đã nạp thành công bản nháp vào MySQL; trình nạp đọc lại và so từng trường. `data/interim/verification/law116/mysql-import.json` ghi số lượng và xác nhận các bảng tài khoản/hội thoại/OTP không đổi trong lần nạp. Không đưa SQL, env, dump hay dữ liệu riêng lên GitHub.

**Trạng thái hiện tại (03/10/2026):** văn bản đã được công bố — `van_ban` id 3 là `published`, `phien_ban_noi_dung = 2`, 434 điều khoản; API công khai trả dữ liệu Luật 116. Bundle ghim vẫn là bản nháp (`draft`/1) nên lệnh `cyberlaw:import-knowledge` báo `knowledge_existing_conflict` như giải thích ở mục 6 — đúng thiết kế, không cần xử lý gấp.

## 7. Trước khi công bố và làm AI

> Danh sách dưới đây là mốc 30/09/2026. Đến 03/10/2026 đã xong bước 3 (API tra cứu/thư viện/thuật ngữ/hỏi đáp đọc `published` và frontend dùng dữ liệu thật) và bước 4 phần công bố; bước 1–2 và bộ kiểm thử độc lập đo AI vẫn còn mở.

1. Rà lịch sử sửa đổi, xác định dùng nguyên bản theo thời điểm hay văn bản hợp nhất; ghi rõ phạm vi trên UI.
2. Duyệt nhãn phân loại và bóc tách ngữ nghĩa chi tiết nếu triển khai suy diễn. Dữ liệu nguyên văn đã chuẩn bị cho việc này.
3. Viết API quản trị/thư viện/tra cứu có quyền và lọc `published`. Frontend hiện vẫn là demo, chưa đọc 434 đơn vị mới.
4. Xuất bản dữ liệu + phiên bản chỉ mục nhất quán; resolve dẫn chiếu; tạo bộ kiểm thử độc lập trước đo AI. Không đổi `duoc_phuc_vu` thành true chỉ vì import thành công.
