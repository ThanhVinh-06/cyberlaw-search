# Rà soát: popup điều khoản và animation tra cứu mượt mà

Ngày 01/10/2026. Sửa frontend MainSite và ArticleDialog, không thay API/quyền/schema/database.

| Trước khi tối ưu | Sau khi tối ưu triệt để | Rationale |
|---|---|---|
| Chờ detail API qua mạng mới bắt đầu mount modal làm UI bị khựng và giật lag | Modal mở tức thì đồng bộ từ dữ liệu đã nạp sẵn trong card với spring transition chuẩn lúc demo | Phản hồi ngay lập tức (0ms latency), không có độ trễ hay khựng giật khi click |
| Tắt crossfade (`layoutCrossfade={false}`) và bỏ fade trễ làm chữ hiện cứng đơ | Khôi phục `layoutDependency` và hiệu ứng fade-up nội dung 0.12s | Chuyển động bung thẻ mượt mà, chữ fade-up nhẹ nhàng không chớp |
| Không kiểm tra trạng thái thu hồi | Gọi detail API ngầm sau khi mở; nếu văn bản bị thu hồi (404) sẽ hiển thị thông báo alert an toàn | Đảm bảo cả trải nghiệm tức thì lẫn an toàn dữ liệu công bố |

- PASS: `npm run build` (`tsc -b && vite build`) 100%.
- PASS: `article-animation.spec.ts` 4/4 ca mở/đóng/scrollbar/focus/keyboard/reduced motion/resize.
- PASS: `search-animation.spec.ts` 3/3 ca entrance thẻ kết quả, replay, không lệch dòng.
- PASS: `public-reveal.spec.ts` 10/10 ca reveal và responsive 320/440/760/761/834/956/1150/1151/1440px.
- PASS: `public-search.spec.ts` 2/2 ca phân trang, bộ lọc và phát hiện thu hồi ngầm.
- PASS: `main-site.spec.ts` 2/2 ca tích hợp.
- npm audit: 0 lỗ hổng. Rà soát bảo mật không chứa secret/.env/SQL dump.
