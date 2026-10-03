# Phương án công nghệ

Cập nhật: 29/09/2026. Phạm vi đã chốt là Luật An ninh mạng 116/2025/QH15; xem [bản chuẩn bị backend](requirements/03-chuan-bi-backend.md) để biết thứ tự triển khai và các phần chưa sẵn sàng.

## 1. Frontend đã được người dùng chốt

React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Motion for React.

Giữ hướng thiết kế CyberLaw: màu đỏ burgundy, vàng nhạt, menu trái luôn hiển thị trên desktop và hình robot mở chat. Khi triển khai, chuyển từng phần của bản mẫu thành component, thêm responsive và animation ngắn, đồng thời hỗ trợ giảm chuyển động.

Frontend đã chuyển sang React/TypeScript/Vite với Tailwind CSS, component shadcn/ui và Motion. Đăng nhập/me/logout đã nối Laravel bằng session cookie + CSRF và proxy cùng origin; đăng ký/quên mật khẩu và dữ liệu nghiệp vụ còn demo. Xem [triển khai đăng nhập](backend/01-dang-nhap.md). Mã HTML/CSS/JS cũ được lưu tại `experiments/archive/frontend-static/`.

## 2. Backend được đề xuất: PHP + Python

Người dùng muốn Python phụ trách AI và kết hợp PHP. Phương án đề xuất dùng **Laravel cho API nghiệp vụ**, **FastAPI cho dịch vụ AI**. Database theo lựa chọn tiếp theo của người dùng là **MySQL**. **Cập nhật 30/09/2026:** người dùng chốt Laravel 12 + PHP 8.2; đã khởi tạo `backend/api/` (mới có model, chưa có API). FastAPI/`backend/ai/` chưa khởi tạo.

```text
React → Laravel → FastAPI → Kho tri thức/chỉ mục AI
            ↕
        MySQL
```

### Laravel

- Là đầu mối API mà frontend gọi.
- Cung cấp danh sách văn bản, chi tiết điều khoản và phản hồi người dùng.
- Quản lý đăng ký, đăng nhập, đăng xuất và phân quyền theo yêu cầu bổ sung. Lịch sử chat cá nhân là chức năng đề xuất đi kèm; tra cứu công khai được đề xuất không yêu cầu đăng nhập.
- Kiểm tra yêu cầu, gọi dịch vụ AI, chuẩn hóa lỗi và trả kết quả cho frontend.
- Sở hữu thao tác ghi và migration của cơ sở dữ liệu nghiệp vụ.

### Python/FastAPI

- Chuẩn hóa câu hỏi, xử lý tiếng Việt, keyphrase, TF-IDF, embedding và xếp hạng.
- Tìm điều khoản và tạo câu trả lời có căn cứ; kết nối LLM khi cần.
- Pipeline trích xuất PDF/OCR, chia điều khoản và lập chỉ mục là bước chuẩn bị riêng, không chạy lại trong mỗi câu hỏi.
- Đọc bản tri thức đã duyệt; sở hữu chỉ mục AI. Không tự sửa các bảng tài khoản/lịch sử chat do Laravel quản lý.

## 3. Cách kết nối đề xuất

Hai dịch vụ trao đổi bằng HTTP/JSON. Ví dụ một câu hỏi từ frontend vào `POST /api/ask` của Laravel; Laravel gọi `POST /answer` của FastAPI. Các route là hợp đồng dự kiến.

Đầu vào tối thiểu: `request_id`, `question`, `document_id`, `knowledge_version`. Đầu ra: `status`, `answer`, `citations[]`, `knowledge_version`; mỗi citation chứa ID điều khoản và vị trí nguồn. Laravel kiểm tra dữ liệu trả về trước khi hiển thị hoặc lưu.

Laravel giữ bản nội dung đã duyệt làm dữ liệu chuẩn khi triển khai quản trị. Python nhận bản xuất có cùng ID và `knowledge_version` để lập chỉ mục. Bản đầu có thể xuất/nhập bằng lệnh thủ công; phát hành nội dung và chỉ mục cùng phiên bản. Chặn hoặc thông báo khi phiên bản không khớp, tránh dùng chỉ mục cũ với nội dung mới.

Trong phát triển, có thể chạy Laravel và FastAPI trên hai cổng localhost. Khi triển khai, chỉ API nghiệp vụ cần tiếp nhận truy cập từ frontend; kết nối tới AI dùng địa chỉ cấu hình và cơ chế xác thực nội bộ phù hợp môi trường. Không đưa khóa dịch vụ vào React.

Đặt thời gian chờ, xử lý lỗi rõ ràng; chỉ retry trường hợp phù hợp, có giới hạn. Tránh retry mù các tác vụ sinh câu trả lời có tính phí hoặc ghi dữ liệu. Nếu AI lỗi, thư viện văn bản vẫn truy cập được qua Laravel.

FastAPI chạy như một tiến trình dịch vụ và nạp mô hình theo vòng đời worker. Không khởi động Python và nạp mô hình từ đầu cho mỗi yêu cầu PHP. Cân nhắc bộ nhớ trước khi tăng số worker vì mỗi tiến trình có thể giữ một bản mô hình.

## 4. Quy mô đồ án

Hai backend làm tăng phần việc tích hợp: hai môi trường, hợp đồng API, thời gian chờ và cách cập nhật dữ liệu. Đổi lại, nhóm có ranh giới rõ giữa nghiệp vụ PHP và thuật toán Python.

Để giữ phạm vi vừa sức, bản đầu dùng hai dịch vụ cùng máy, HTTP/JSON, tiền xử lý dữ liệu bằng lệnh. Chỉ bổ sung hàng đợi, streaming hoặc hạ tầng khác khi có chức năng thực tế cần đến.

Nếu triển khai phương án này, cấu trúc dự kiến:

```text
frontend/                  React
backend/
  api/                     Laravel
  ai/                      FastAPI
data/                      Nguồn và tri thức đã xử lý
```

Chưa di chuyển `backend/app/`; đó vẫn là khung Python cũ. Việc đổi thư mục và cài công nghệ sẽ thực hiện trong bước triển khai.

## Nguồn kỹ thuật

- Laravel HTTP client, JSON, timeout và xử lý lỗi: https://laravel.com/framework/docs/13.x/http-client
- FastAPI deployment, tiến trình và bộ nhớ: https://fastapi.tiangolo.com/deployment/concepts/

## 5. Database và tài khoản

- Database `cyberlaw_search` trên MySQL 8.0.44 hiện có 13 bảng, 116 cột (bao gồm xác thực: xác minh email, đặt lại mật khẩu, audit quản trị, đếm lượt tra cứu); tên bảng/cột bằng tiếng Việt không dấu. [Thiết kế dữ liệu](design/04-co-so-du-lieu.md) và [SQL dump cục bộ](../database/cyberlaw_search.sql) là cơ sở để triển khai backend.
- MySQL lưu tài khoản, văn bản, điều khoản, quan hệ keyphrase và dữ liệu nghiệp vụ được triển khai.
- Laravel quản lý migration và quyền truy cập dữ liệu. Các model cần ánh xạ tên bảng, khóa, cột thời gian và trường auth theo schema tiếng Việt; không dùng nguyên quy ước tên mặc định của Laravel. Python nhận bản tri thức đã duyệt theo phiên bản để xử lý AI; không cần quyền truy cập bảng mật khẩu, session hoặc toàn bộ lịch sử người dùng.
- Chỉ mục tìm kiếm ngữ nghĩa do Python tạo và quản lý riêng trong giai đoạn đầu. Chọn MySQL cho dữ liệu nghiệp vụ không yêu cầu đưa toàn bộ tính toán vector vào MySQL.
- Đề xuất hai vai trò tài khoản `user`, `admin`; khách là trạng thái chưa đăng nhập. Tài khoản tự đăng ký luôn được server gán `user`.
- Đề xuất xác thực React bằng Laravel Sanctum theo cookie/session; kiểm tra quyền bằng middleware và Policies/Gates ở Laravel. Sanctum không tự cung cấp toàn bộ màn hình và xử lý đăng ký/đăng nhập; cần controller hoặc thành phần auth tương ứng khi triển khai.
- Frontend và API ưu tiên cùng origin qua proxy, hoặc các subdomain cùng tên miền gốc được cấu hình đúng cho Sanctum. Không mặc định lưu bearer token trong localStorage cho ứng dụng này.
- Tài liệu chi tiết: [Tài khoản và phân quyền](requirements/02-tai-khoan-phan-quyen.md).

Nguồn: [Database Laravel](https://laravel.com/framework/docs/13.x/database), [Sanctum SPA](https://laravel.com/framework/docs/13.x/sanctum#spa-authentication), [Authorization](https://laravel.com/framework/docs/13.x/authorization).
