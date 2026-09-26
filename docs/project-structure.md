# Quy ước tổ chức dự án

## 1. Nguyên tắc

Một thư mục dự án chứa giao diện, backend, dữ liệu và tài liệu học phần. Chưa cần Docker, microservice hay nhiều kho Git cho quy mô một đồ án. Giao diện hiện tại dùng HTML/CSS/JavaScript; chưa chuyển sang React chỉ để thay cấu trúc thư mục.

| Khi cần làm việc gì | Sửa/lưu ở đâu |
|---|---|
| Bố cục trang, menu, form, chat | `frontend/index.html`, `frontend/styles.css`, `frontend/app.js` |
| Ảnh xuất hiện trên giao diện | `frontend/assets/` |
| Ảnh thiết kế, ảnh robot gốc, prompt tạo ảnh | `docs/design/` |
| Yêu cầu, phạm vi, tiêu chí đánh giá | `docs/requirements/` |
| Prompt cho AI lập trình hoặc Stitch | `docs/prompts/` |
| Tài liệu đề bài | `docs/references/` |
| PDF luật | `data/raw/laws/<năm>/` |
| Văn bản trích xuất chưa duyệt | `data/interim/extracted/` |
| Ảnh dùng kiểm tra nội dung trích xuất | `data/interim/verification/` |
| Tri thức đã duyệt | `data/processed/` |
| Câu hỏi và đáp án chuẩn | `data/evaluation/` |
| Điểm số thực nghiệm | `experiments/results/` |
| Báo cáo và slide nộp | `reports/` |

Các đường dẫn trong bảng tính từ thư mục gốc dự án.

## 2. Ranh giới mã chương trình

Luồng dự kiến khi triển khai backend:

```text
frontend
   ↓ yêu cầu HTTP
backend/app/api
   ↓ kiểm tra đầu vào bằng schemas
backend/app/services
   ├── retrieval → tìm, xếp hạng các điều khoản
   └── knowledge → đọc nội dung và metadata đã duyệt
   ↓
trả câu trả lời + căn cứ → frontend
```

- `api/`: nhận yêu cầu và trả phản hồi; không đặt thuật toán truy hồi trực tiếp trong route.
- `schemas/`: cấu trúc câu hỏi, kết quả, citation, trạng thái lỗi.
- `services/`: phối hợp tìm kiếm, kiểm tra căn cứ, tạo đáp án. Tích hợp LLM về sau ở lớp này.
- `retrieval/`: chuẩn hóa truy vấn, keyphrase, TF-IDF, embedding, kết hợp thứ hạng.
- `knowledge/`: truy cập kho tri thức, liên kết điều khoản và kiểm tra phiên bản nguồn.

Chưa có các module Python trong những thư mục này. Tạo từng module khi có chức năng thật; không thêm tệp rỗng giả làm API hoàn chỉnh.

## 3. Đặt tên và lưu dữ liệu

- Tên tệp không dấu, dùng chữ thường; ví dụ `116-2025-qh15-scan.pdf`, `provisions.jsonl`.
- Giữ ID văn bản/điều khoản ổn định trong dữ liệu; không dùng vị trí dòng hoặc tên tệp làm căn cứ pháp lý.
- Không ghi đè dữ liệu nguồn trong pipeline. Các bước xử lý có thể tái chạy từ PDF hoặc bản trích xuất.
- Các tên `provisions.jsonl`, `keyphrases.jsonl`, `rules.jsonl`, `qa-cases.jsonl` là quy ước cho giai đoạn sau, chưa có dữ liệu tương ứng.
- Hai PDF năm 2025 là hai bản thể hiện của cùng một luật; việc tách tệp không tạo thành hai bộ quy định độc lập.
- `data/indexes/` và `data/runtime/` là đầu ra sinh tự động; `.gitignore` loại nội dung của chúng khỏi Git.

## 4. Đường dẫn đã thay đổi

| Trước | Sau |
|---|---|
| `prototype/` | `frontend/` |
| `docs/01-phan-tich-yeu-cau.md` | `docs/requirements/01-phan-tich-yeu-cau.md` |
| `docs/02-bo-prompt.md` | `docs/prompts/02-bo-prompt.md` |
| `docs/03-dac-ta-form.md` | `docs/design/03-dac-ta-form.md` |
| `docs/04-prompt-stitch.md` | `docs/prompts/04-prompt-stitch.md` |
| `research/source-0.txt` | `docs/references/de-bai-trich-xuat.txt` |
| `research/source-1.txt` | `data/interim/extracted/luat-24-2018-qh14.txt` |
| `research/source-2.txt` | `data/interim/extracted/luat-116-2025-scan-extraction.txt` |
| `research/source-3.txt` | `data/interim/extracted/luat-116-2025-web-export.txt` |
| `research/cyberlaw-desktop-chat.png` | `docs/design/screenshots/cyberlaw-desktop-chat.png` |

Các đường dẫn khác được ghi trong `docs/file-migration.json`. SHA-256 trong tệp đó là giá trị tại thời điểm di chuyển, trước khi cập nhật nội dung README và các liên kết tài liệu. Đã kiểm tra nội dung ngay sau khi di chuyển.

## 5. Thứ tự phát triển tiếp

1. Hoàn thiện giao diện trong `frontend/` theo phản hồi của người dùng.
2. Duyệt dữ liệu, tạo bộ tri thức và bộ câu hỏi chuẩn.
3. Triển khai backend và baseline tìm kiếm từ khóa.
4. Thêm truy hồi ngữ nghĩa, đánh giá, sau đó tích hợp chat có căn cứ.
5. Đưa kết quả thật vào báo cáo, slide và demo.
