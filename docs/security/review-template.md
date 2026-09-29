# Rà soát bảo mật: <chức năng>

- Ngày, người/agent kiểm tra:
- Commit/base và các file chưa commit liên quan:
- Phạm vi route/dữ liệu/vai trò, ranh giới tin cậy:
- Môi trường/URL test được phép, phiên bản tool, dữ liệu giả:
- Thay đổi cần bảo vệ và mã CL/API/LLM liên quan:

## Kết quả

| Kiểm tra | Cách chạy/test ID | PASS / FAIL / NOT RUN / N/A | Bằng chứng và giới hạn |
|---|---|---|---|
| Review code và kiểm tra đầu vào/quyền | | NOT RUN | |
| Test nghiệp vụ và test lạm dụng liên quan | | NOT RUN | |
| Dependency/secret/SAST | | NOT RUN | |
| Log: có sự kiện, che dữ liệu, xử lý lỗi | | NOT RUN | |
| Responsive/bàn phím (nếu có UI) | | NOT RUN | |

## Phát hiện

Với từng phát hiện ghi: ID, trạng thái xác nhận/giả thuyết/thiếu triển khai, mức độ và điều kiện ảnh hưởng; file/dòng/route; các bước tái hiện bằng dữ liệu giả; tác động; cách sửa; test lại và kết quả. Không dán mật khẩu, token, dữ liệu chat thật hoặc scanner output chưa che.

## Kết luận

- Đã sửa/đã test lại:
- Còn mở: ID, người xử lý, hạn/mốc xử lý:
- Thiếu công cụ/môi trường và ảnh hưởng đến kết luận:
- Chức năng hoàn thành trong phạm vi nào? Đủ điều kiện deploy chưa, vì sao?
- Bằng chứng thô ở đường dẫn local bị Git bỏ qua; liên kết tóm tắt đã che dữ liệu:

Không giữ trạng thái mặc định nếu đã chạy; N/A phải có lý do. PASS của dependency audit không thay PASS của auth/ownership/API.
