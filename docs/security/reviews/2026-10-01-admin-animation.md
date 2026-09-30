# Đồng bộ animation quản trị — 01/10/2026

## Phạm vi và rà soát

Chỉ sửa UI React, CSS và kiểm thử giao diện. Không sửa API, quyền truy cập, logging server, database hoặc dependency trong lượt này. Kiểm thử tấn công server và audit dependency không áp dụng cho thay đổi này; không dùng kết quả UI để kết luận bảo mật backend.

| Before | After | Why |
| --- | --- | --- |
| Nút tải lại ma trận đứng ngoài header | Nút nằm dưới nhãn chính sách trong cùng cột, xếp dọc cả trên mobile | Vị trí dễ tìm và không kéo giãn nút |
| Bảng rỗng xuất hiện trước dữ liệu, dòng loading làm đổi chiều cao bảng | Chờ lần tải đầu rồi Fade In Up 950ms; giữ bảng khi tải lại, thông báo ở vị trí riêng | Không thay bảng rỗng thành bảng thật giữa animation, không đẩy các hàng khi refresh |
| RecentQuestionsCard chỉ đi theo animation khung trang 350ms, box xu hướng chạy riêng 950ms | Các box thống kê cùng reveal 1200ms; recent bắt đầu sau 300ms, bỏ animation toàn khung chồng lên con | Các khối lớn xuất hiện nối tiếp, không hiện trước các khối còn lại |

Reveal lồng nhau chỉ quản lý phần tử thuộc chính vùng đó. `ready` chỉ chuyển một lần sau lần tải tài khoản đầu; thay bộ lọc/tải lại không khởi động lại animation. Reduced motion chỉ fade 160ms; bàn phím bỏ animation theo quy ước hiện có. Hover và animation modal chi tiết được giữ riêng.

## Kiểm tra

- Build/TypeScript PASS; cảnh báo bundle >500KB vẫn còn từ trước.
- Playwright: 16/16 ca bảng người dùng, responsive và modal đạt trong lượt đầu; 6/6 ca thống kê đạt sau khi chỉnh helper đợi animation vào trang kết thúc trước khi đo vị trí tooltip/modal. Hai lỗi ban đầu là phép đo lấy vị trí trong khi card đang trôi (lệch 1–2px); không nới ngưỡng sai số.
- Đã kiểm tra API đến chậm không hiện trạng thái rỗng, bảng không đổi y/chiều cao khi đang tải lại, reveal chạy một lần; các card thống kê cùng 1200ms và không replay khi đổi bộ lọc. Responsive giả lập Edge ở 320/440/834/900/901/956×440/1024/1440, modal, bàn phím và reduced motion đạt. Đã xem ảnh ma trận 440px xác nhận nút dưới nhãn. Chưa thử thiết bị vật lý.
- Dữ liệu UI dùng fixture tổng hợp, không ghi MySQL và không chụp thông tin tài khoản thật.

## Rà soát trước push

- PHPUnit toàn bộ 78 tests/812 assertions PASS, npm audit 0 findings. Dùng kết quả build và responsive vừa kiểm tra ở trên vì không sửa mã sau kiểm thử.
- Quét nội dung staging: đối chiếu bí mật trong env cục bộ bằng bộ nhớ và mẫu private key/token/email cá nhân; phát hiện email cá nhân trong tài liệu bàn giao cũ và đã ẩn trước commit. Không đưa env, SQL, migration, PDF, dữ liệu luật hay log vào commit.
- Composer và Gitleaks không có trong PATH; chưa chạy Composer audit hoặc quét toàn bộ lịch sử Git trong lượt này. Không kết luận đã xóa dữ liệu khỏi lịch sử hay sẵn sàng deploy.
