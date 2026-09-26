# Backend và AI — khung chuẩn bị

Chưa có API hoặc mô hình chạy trong thư mục này. Backend dự kiến dùng Python/FastAPI; chỉ thêm cấu hình dependency và lệnh chạy sau khi triển khai chức năng thật.

| Thư mục | Trách nhiệm |
|---|---|
| `app/api/` | Endpoint tìm kiếm, hỏi đáp, đọc văn bản và thuật ngữ |
| `app/schemas/` | Kiểm tra dữ liệu đầu vào và mô tả phản hồi |
| `app/services/` | Điều phối truy hồi, căn cứ và trả lời; kết nối LLM nếu cần |
| `app/retrieval/` | Keyphrase, TF-IDF, embedding và xếp hạng kết quả |
| `app/knowledge/` | Truy cập điều khoản, khái niệm, quy định và nguồn |

Đầu vào lấy từ `../data/processed/`, chỉ mục nằm ở `../data/indexes/`, dữ liệu chạy nằm ở `../data/runtime/`. Khi viết mã, xác định đường dẫn từ vị trí dự án hoặc cấu hình, không phụ thuộc vào ổ D của máy tác giả.

Các API ưu tiên theo bản phân tích: `POST /search`, `POST /answer`, `GET /documents`, `GET /provisions/{id}`, `GET /concepts`. Đây là thiết kế dự kiến.

Khóa API nếu dùng phải ở biến môi trường backend, không ghi vào mã frontend. Chức năng tìm điều khoản cần hoạt động được trước khi thêm mô hình sinh câu trả lời.
