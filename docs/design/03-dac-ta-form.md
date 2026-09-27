# Đặc tả form và giao diện

**Bổ sung tài khoản ngày 27/09/2026:** Thêm màn hình đăng ký, đăng nhập, trạng thái tài khoản và giao diện theo vai trò. Xem [đặc tả tài khoản và phân quyền](../requirements/02-tai-khoan-phan-quyen.md). Chính sách đề xuất giữ tra cứu công khai, yêu cầu đăng nhập khi chat AI và truy cập lịch sử cá nhân.

**Cập nhật hướng thiết kế:** Theo yêu cầu tiếp theo, bản giao diện mới dùng đỏ burgundy, vàng nhạt và menu trái luôn hiện trên desktop, tham khảo trang tìm kiếm Bộ Công an. Xem [prompt Stitch](../prompts/04-prompt-stitch.md) và [giao diện](../../frontend/index.html). Các màu navy/teal ở mục 8 bên dưới thuộc đề xuất ban đầu và được thay bằng hướng thiết kế mới.

“Form thiết kế” được hiểu là các màn hình, trường nhập liệu, trạng thái và quy tắc tương tác. Tài liệu cũng có biểu mẫu đặc tả để dùng lại trong báo cáo. Mẫu trực quan đi kèm là mô phỏng giao diện; chưa nối cơ sở dữ liệu hoặc mô hình AI.

## 1. Cấu trúc điều hướng

Tra cứu • Thư viện luật • Từ điển keyphrase. Quản trị là mục riêng nếu nhóm làm chức năng nhập và duyệt. Người tra cứu không cần tài khoản trong bản tối thiểu.

## 2. F01 — Tra cứu

| Thành phần | Kiểu | Kiểm tra và hành vi |
|---|---|---|
| Câu hỏi hoặc từ khóa | textarea, bắt buộc | Trim, 1–1.000 ký tự; câu trống báo ngay dưới trường |
| Phạm vi văn bản | nhãn cố định ở MVP | Hiện 116/2025/QH15; chỉ làm dropdown khi có nhiều lựa chọn thật |
| Loại quy định | select | Tất cả, khái niệm, nghiêm cấm, trách nhiệm, loại khác |
| Cách tìm | select | Từ khóa / ngữ nghĩa / kết hợp; có thể đặt trong tùy chọn nâng cao |
| Tra cứu | button | Ctrl+Enter cũng gửi; khóa trong khi gửi để tránh lặp |
| Câu hỏi gợi ý | button | Điền câu hỏi vào ô; người dùng có thể sửa rồi gửi |

Đầu ra: câu trả lời ngắn và danh sách điều khoản. Mỗi kết quả gồm tên điều, đường dẫn chương–điều–khoản–điểm, trích đoạn, loại quy định, Xem nguyên văn. Khi không có kết quả, gợi ý diễn đạt lại; không tạo câu trả lời có vẻ chắc chắn.

## 3. F02 — Căn cứ và nguyên văn

Hiện số văn bản, tiêu đề điều, nội dung nguyên văn, nguồn, trang PDF và thời điểm kiểm chứng metadata. Câu dẫn và ngoại lệ không bị ẩn khỏi đoạn cần đọc. Từ khóa có thể được tô nổi bật nhưng không thay văn bản gốc.

Desktop mở khung cạnh kết quả; mobile mở trang chi tiết có nút Quay lại và giữ câu hỏi. Nút Sao chép căn cứ sao chép cả số văn bản và điều khoản; nút Mở nguồn chỉ dùng URL đã lưu từ nguồn hợp lệ.

## 4. F03 — Thư viện luật

Mục lục chương và điều; ô tìm số điều; nội dung chi tiết. Một văn bản mặc định để đúng phạm vi bài. Bản 2018 nếu bổ sung phải mang nhãn nghiên cứu lịch sử và dùng chỉ mục riêng. Không đặt số chương/điều giả để lấp chỗ trống.

## 5. F04 — Từ điển keyphrase

Danh sách cụm từ chuẩn, bộ lọc tên và loại quan hệ. Chi tiết gồm khái niệm, nguồn định nghĩa, biến thể truy vấn, các thuật ngữ liên quan và liên kết điều khoản. Phân biệt alias không dấu với quan hệ gần nghĩa hoặc có liên quan.

## 6. F05 — Nhập và duyệt tri thức (tùy chọn)

| Trường | Quy tắc |
|---|---|
| PDF nguồn | Chỉ PDF, giới hạn gợi ý 25 MB; kiểm tra nội dung tệp ở server |
| Số hiệu, tên văn bản | Bắt buộc; tránh nhập trùng document_id/hash |
| URL nguồn | Kiểm tra scheme/domain theo chính sách nguồn của dự án |
| Ngày ban hành, hiệu lực | Ngày hợp lệ; không tự suy ra tình trạng pháp lý đầy đủ |
| Chương/điều/khoản/điểm | Liên kết đúng cha; không tự bịa số khi OCR thiếu |
| Nguyên văn | Bắt buộc; hiển thị cạnh ảnh/trang nguồn để duyệt |
| Keyphrase, loại quy định | Chọn từ danh mục; hỗ trợ mục cần duyệt |
| Chủ thể, hành vi, điều kiện, ngoại lệ | Giữ đủ nội dung pháp lý; có thể rỗng nếu không áp dụng |
| Trạng thái | Nháp → Cần duyệt → Đã duyệt → Đã lập chỉ mục |

Nút: Lưu nháp, Xem lỗi, Duyệt, Lập lại chỉ mục. Nhập tệp không đồng nghĩa với công bố tri thức. Nếu có lỗi OCR hoặc mất điều, chặn xuất bản các bản ghi bị lỗi.

## 7. Trạng thái giao diện bắt buộc

| Trạng thái | Nội dung thể hiện |
|---|---|
| Ban đầu | Ô hỏi + phạm vi + 3 câu gợi ý |
| Đang tìm | “Đang tìm điều khoản phù hợp…”; giữ câu hỏi |
| Có kết quả | Câu trả lời + căn cứ có thể mở |
| Thiếu dữ kiện | Một câu hỏi làm rõ cụ thể |
| Chưa đủ căn cứ | Chỉ ra phần chưa tìm được trong văn bản |
| Ngoài phạm vi | Nêu lĩnh vực/phạm vi hiện có |
| Lỗi dịch vụ | Giữ dữ liệu nhập; cho thử lại |
| LLM không khả dụng | Tiếp tục hiển thị kết quả truy hồi và nguyên văn |

## 8. Quy chuẩn thiết kế

- Màu đề xuất: navy #14384B, teal #087F73, nền #F4F7F8; biến thể tối có nền và chữ tương phản tương ứng.
- Chữ nội dung 16px; nhãn phụ tối thiểu 12px; font hệ thống hỗ trợ tiếng Việt.
- Thang khoảng cách 8/16/24/32px; độ rộng đọc nguyên văn khoảng 65–80 ký tự mỗi dòng.
- Desktop có thể dùng hai cột; dưới 760px xếp dọc. Điều hướng tự xuống hàng.
- Mọi trường có label; thao tác bằng bàn phím; trạng thái động có aria-live; lỗi không chỉ dùng màu.
- Không hiển thị phần trăm tin cậy pháp lý. Trong màn hình đánh giá kỹ thuật, ghi rõ điểm tương đồng và phương pháp nếu cần.

## 9. Mẫu đặc tả một form để điền trong báo cáo

```text
Mã form:
Tên form:
Mục đích:
Tác nhân sử dụng:
Điều kiện trước:
Danh sách trường (tên, kiểu, bắt buộc, mặc định, kiểm tra):
Các nút và hành động:
Luồng thành công:
Luồng thiếu dữ liệu/lỗi:
Dữ liệu đầu ra:
API liên quan:
Quyền truy cập:
Tiêu chí nghiệm thu:
Ảnh minh họa:
```

Tiêu chí nghiệm thu F01: nhập câu hỏi, tìm được kết quả từ chỉ mục thật, mở được căn cứ đúng; truy vấn rỗng không gọi API; lỗi không làm mất câu hỏi; dùng được trên màn hình hẹp và bằng bàn phím.
