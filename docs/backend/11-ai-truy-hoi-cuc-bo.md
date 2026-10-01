# Hỏi đáp AI cục bộ (bản đầu)

## Phạm vi

Hỏi đáp dùng tài khoản đã xác thực và chỉ đọc văn bản `116/2025/QH15` có `trang_thai=published`. Laravel tạo snapshot có giới hạn, gửi JSON qua stdin cho `backend/ai/retriever.py`, rồi kiểm tra lại phiên bản trước khi lưu. Python không truy cập MySQL, mạng, shell, file nguồn hay công cụ khác.

Bản đầu là **truy hồi trích đoạn**, chưa phải mô hình sinh câu trả lời. Phản hồi nêu rõ khi chưa có căn cứ; giao diện hiển thị nguyên văn trích dẫn, số điều/khoản/điểm, phiên bản và trang nguồn. Bản nháp không được đưa vào truy hồi.

## Luồng request

1. `POST /api/answer` yêu cầu session cookie, CSRF, tài khoản active và quyền `chat_ai_cyberlaw`.
2. Validate câu hỏi 3–1000 ký tự, `request_id` UUID và `conversation_id` số nguyên dạng chuỗi.
3. Giới hạn 6 lần/phút, 60 lần/giờ mỗi tài khoản; khóa một request đang xử lý trong 30 giây.
4. Retriever lexical tìm tối đa bốn chunk. Câu hỏi ngoài phạm vi, prompt injection và câu hỏi cần suy đoán (ví dụ mức phạt) trả `no_basis`.
5. Laravel đối chiếu ID với snapshot và hash snapshot mới; chỉ sau đó mới ghi `hoi_thoai`, `tin_nhan`, `trich_dan` và audit.
6. Cùng `request_id` chỉ phát lại message đã lưu; dùng lại cho câu hỏi khác bị từ chối.

## Chạy cục bộ

```powershell
cd E:\cyberlaw-search\backend\ai
python -m unittest test_retriever.py
python -X utf8 evaluate.py
```

`evaluate.py` là tập phát triển nội bộ, không phải test độc lập và không chứng minh độ chính xác pháp lý. Bản thử nghiệm hiện không yêu cầu package Python hay API key; `CYBERLAW_AI_PYTHON` chỉ đổi executable khi máy dùng tên Python khác.

## Giới hạn cần xử lý trước khi deploy

- Chưa có semantic embeddings/reranker hoặc LLM diễn giải; chưa đo latency/load production.
- Cần chỉ mục phiên bản hóa, pipeline phê duyệt dữ liệu và bộ đánh giá độc lập có người rà soát.
- Cần cấu hình rotation/quyền đọc log, backup audit, timeout process và giám sát disk ở môi trường triển khai.
- Không gọi endpoint này là tư vấn pháp lý; người dùng phải đối chiếu toàn văn và văn bản được dẫn chiếu.
