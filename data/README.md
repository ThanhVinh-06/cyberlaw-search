# Dữ liệu đồ án

## Bộ nguyên bản 116/2025 đã chuẩn hóa — 30/09/2026

Xem [hướng dẫn dữ liệu và ánh xạ database](../docs/data/01-du-lieu-luat-116.md). Bộ `processed/luat-116-2025-v1/` có 45 điều / 207 khoản / 282 điểm, 434 đơn vị tra cứu, 60 từ khóa (23 định nghĩa), 1.326 liên kết, 434 bản ghi phân loại. Đã nạp MySQL ở trạng thái **draft**, chưa nối frontend/AI hoặc công bố thành văn bản hợp nhất hiện hành. Các trường ngữ nghĩa NULL là chưa tách riêng, không có nghĩa là không có điều kiện/ngoại lệ trong nguyên văn.

Nguồn chính mới là PDF Công báo có lớp chữ tại `raw/laws/2025/official/116-2025-qh15-congbao.pdf`. Bản scan được xem đủ 37 trang; khác biệt với bản web được lưu trong `interim/verification/law116/`. Bộ 28 tình huống `evaluation/luat-116-phat-trien-v1.jsonl` chỉ dành cho phát triển; chưa chạy mô hình.

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
- `interim/verification/`: kết quả đối chiếu nguồn, trích xuất có tọa độ, khác biệt và bằng chứng nạp MySQL; xem bộ `law116/` mới.
- `processed/`: bộ nguyên bản dạng nháp gồm dữ liệu nạp, toàn văn cấu trúc, chunks AI, manifest và báo cáo kiểm tra.
- `evaluation/`: dự kiến chứa câu hỏi, đáp án chuẩn, căn cứ và nhóm phân chia tập. Không dùng tập kiểm thử để điều chỉnh mô hình/ngưỡng.
- `indexes/`: chỉ mục TF-IDF, embedding; có thể tạo lại từ dữ liệu đã xử lý.
- `runtime/`: đầu ra tạm phục vụ chạy ứng dụng. Database MySQL `cyberlaw_search` hiện có 12 bảng, 111 cột; [schema và SQL dump](../database/README.md) nằm trong `database/`. Không đặt thư mục dữ liệu nội bộ của máy chủ MySQL vào Git.

## Kiểm kê nguồn

`sources.json` ghi lại đường dẫn nguồn ban đầu, đường dẫn bản sao tính từ **gốc dự án**, hash SHA-256 và trạng thái xử lý. Bao gồm cả đề bài ở `docs/references/` để có một bảng kiểm kê chung.

Các PDF ban đầu được sao chép từ thư mục người dùng cung cấp. Ngày 30/09 đã bổ sung PDF Công báo 116 làm nguồn chữ và PDF 143 chỉ để kiểm tra quan hệ văn bản. Hash, URL và trạng thái được ghi trong `sources.json`.

Nguồn Chính phủ dùng để đối chiếu luật 2025 trong giai đoạn chuẩn bị:
https://chinhphu.vn/?classid=1&docid=216499&orggroupid=1&pageid=27160

Khi xuất tri thức, từng đơn vị điều/khoản/điểm phải có `document_id`, thông tin nguồn, số trang hoặc vị trí văn bản và `review_status`. Không đánh dấu đã duyệt chỉ vì trích xuất thành công.
