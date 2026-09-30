# Animation Không gian tra cứu

## Thay đổi

| Before | After | Why |
| --- | --- | --- |
| Tra cứu, thư viện, từ điển thiếu reveal khi chuyển tab | Các khối Fade In Up 950ms, delay nối tiếp 80ms; lịch sử cũng dùng 950ms | Đồng bộ nhịp xuất hiện |
| Các section ẩn vẫn giữ shared layout ID | Chỉ mount section đang xem, state bộ lọc vẫn giữ ở MainSite | Không trùng ID giữa thẻ từ điển và kết quả tìm kiếm |
| Popup thuật ngữ chỉ scale tại chỗ | Shared layout từ thẻ thuật ngữ đến ArticleDialog, cùng spring 190/25/0.85 như kết quả | Mở rộng từ thẻ nguồn và thu về khi đóng |
| Dừng reveal khi pointerdown có thể làm nút lệch trước mouseup | Vùng công khai dừng ở click capture | Bấm nhanh sau chuyển trang vẫn mở popup |

Không thêm reveal cho ChatPopover. Gõ tìm kiếm hoặc đổi mục lục không replay entrance trang; tìm kiếm/đặt lại giữ ResultReveal cũ. Reduced motion chỉ fade, bàn phím giữ Escape/focus trap/khôi phục focus.

## Kiểm tra và giới hạn

- Build/TypeScript PASS (cảnh báo bundle >500KB cũ).
- 10 ca mới về reveal, không replay khi gõ/chat và responsive đạt; 2 ca main-site chạy lại đạt sau sửa click. 7 ca article/search animation đạt ở lượt hồi quy trước sửa click.
- Edge giả lập 320,440,760,761,834,956×440,1150,1151,1440: trang tra cứu/thư viện/lịch sử/từ điển, popup, reduced motion và bàn phím. Không thử thiết bị thật.
- Chỉ frontend; không sửa API, xác thực, database, nguồn luật hoặc dependency. Không áp dụng kiểm thử tấn công backend cho lượt này; không kết luận deploy-ready. Dữ liệu test dùng fixture, không đụng MySQL.
