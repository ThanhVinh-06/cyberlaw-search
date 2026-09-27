# Dữ liệu đồ án

## Luồng dữ liệu

```text
raw/laws → interim/extracted → processed → indexes
                    ↑             ↓
           interim/verification   runtime

evaluation → công cụ đánh giá → ../experiments/results
```

## Các thư mục

- `raw/laws/2025/`: PDF scan và bản xuất từ web của Luật 116/2025/QH15; giữ nguyên tệp nguồn.
- `raw/laws/2018/`: luật 2018 để tham khảo lịch sử, không đưa vào chỉ mục mặc định của luật 2025.
- `interim/extracted/`: kết quả trích xuất thô. Bản scan chỉ trích được rất ít ký tự, cần OCR; bản xuất web có header/footer cần làm sạch. Các tệp này **chưa được kiểm duyệt toàn bộ**.
- `interim/verification/`: ảnh trang 36 đã dùng đối chiếu Điều 44. Đây là minh chứng đối chiếu một trang, không xác nhận toàn bộ luật đã được kiểm định.
- `processed/`: dự kiến chứa `provisions.jsonl`, `keyphrases.jsonl`, `concepts.jsonl`, `rules.jsonl` sau khi duyệt.
- `evaluation/`: dự kiến chứa câu hỏi, đáp án chuẩn, căn cứ và nhóm phân chia tập. Không dùng tập kiểm thử để điều chỉnh mô hình/ngưỡng.
- `indexes/`: chỉ mục TF-IDF, embedding; có thể tạo lại từ dữ liệu đã xử lý.
- `runtime/`: đầu ra tạm phục vụ chạy ứng dụng. Đã tạo database MySQL `cyberlaw_search` với 9 bảng rỗng; [schema và SQL dump](../database/README.md) nằm trong `database/`. Khi triển khai Laravel, cần tạo migrations tương ứng. Không đặt thư mục dữ liệu nội bộ của máy chủ MySQL vào Git.

## Kiểm kê nguồn

`sources.json` ghi lại đường dẫn nguồn ban đầu, đường dẫn bản sao tính từ **gốc dự án**, hash SHA-256 và trạng thái xử lý. Bao gồm cả đề bài ở `docs/references/` để có một bảng kiểm kê chung.

Các PDF được sao chép từ thư mục tài liệu người dùng cung cấp, không tải lại từ Internet trong lần tổ chức này. Hash của bản sao đã được so với bản gốc.

Nguồn Chính phủ dùng để đối chiếu luật 2025 trong giai đoạn chuẩn bị:
https://chinhphu.vn/?classid=1&docid=216499&orggroupid=1&pageid=27160

Khi xuất tri thức, từng đơn vị điều/khoản/điểm phải có `document_id`, thông tin nguồn, số trang hoặc vị trí văn bản và `review_status`. Không đánh dấu đã duyệt chỉ vì trích xuất thành công.
