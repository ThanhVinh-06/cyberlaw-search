# Prompt Stitch — CyberLaw Search

Sao chép toàn bộ khối dưới đây vào Stitch. Có thể đính kèm ảnh trang tham khảo và ảnh robot AI của dự án để truyền đạt bố cục, màu sắc và nhân vật chính xác hơn.

## Prompt dùng ngay

```text
Thiết kế giao diện web tiếng Việt cho “CyberLaw Search — Tra cứu Luật An ninh mạng”,
phục vụ đồ án môn Trí tuệ nhân tạo. Ưu tiên giao diện và luồng tương tác để nhóm
duyệt thiết kế trước. Thể hiện rõ nhãn “Bản mẫu đồ án • Dữ liệu minh họa”.

THAM KHẢO THỊ GIÁC
https://bocongan.gov.vn/tim-kiem?search=an+ninh+mang&searchTypeId=title
Lấy cảm hứng từ header đỏ đậm, thanh điều hướng vàng nhạt, nền sáng, khối tìm
kiếm trắng bo góc và nút tìm kiếm đỏ của cổng thông tin này. Tạo nhận diện riêng
cho CyberLaw Search bằng biểu tượng khiên kết hợp sách hoặc mạch điện đơn giản.
Không dùng quốc huy, huy hiệu ngành hoặc tên cơ quan để làm thương hiệu dự án.

HỆ THỐNG THỊ GIÁC
- Đỏ burgundy #801C2D, đỏ nhấn #B22638, vàng nhạt #F3E7C5,
  nền #F7F5F1, trắng #FFFFFF, chữ #25252B, viền #E5DED8.
- Dùng vàng làm nền hoặc điểm nhấn; chữ nội dung phải tương phản rõ.
- Font Be Vietnam Pro hoặc font sans-serif hỗ trợ tiếng Việt; nội dung 16px,
  tiêu đề trang 28–32px, nhãn trường 14px. Bo góc 12–16px; bóng nhẹ.
- Khoảng cách theo nhịp 8/16/24/32px. Bố cục trang trọng, dễ đọc, tiết chế trang trí.

BỐ CỤC DESKTOP 1440PX
1. Header cao khoảng 88px, nền burgundy; logo CyberLaw Search, tên sản phẩm và
   dòng phụ “Tra cứu kiến thức pháp luật về an ninh mạng”. Góc phải có nhãn đồ án.
2. Sidebar rộng 250px luôn hiển thị ở bên trái trên desktop, bên dưới header;
   giữ vị trí khi cuộn, cuộn riêng nếu cần. Không bắt người dùng mở hamburger
   để thấy menu desktop. Nội dung chính nằm bên phải, cách sidebar 24–32px.
3. Sidebar nền trắng, tiêu đề nhóm trên nền vàng nhạt; các mục có icon và chữ:
   Tra cứu pháp luật, Thư viện luật, Từ điển thuật ngữ, Hướng dẫn sử dụng.
   Mục hiện tại có nền đỏ nhạt, chữ burgundy và vạch nhấn; có hover/focus rõ.
4. Trên nội dung chính có breadcrumb và dải tiêu đề vàng nhạt. Chuyển các mục
   điều hướng chính từ mẫu tham khảo vào sidebar để tránh lặp menu ngang.

MÀN HÌNH TRA CỨU
- Tiêu đề “Tra cứu Luật An ninh mạng”; mô tả ngắn “Tìm theo từ khóa hoặc đặt câu
  hỏi để xem điều khoản liên quan”. Hiện phạm vi “116/2025/QH15” dưới dạng nhãn
  cố định vì bản đầu chỉ dùng một văn bản; không giả lập nhiều văn bản đã nhập.
- Khối tìm kiếm trắng bo góc: hàng đầu gồm “Tìm trong” (Toàn văn / Tiêu đề điều /
  Số điều) và ô rộng “Từ khóa hoặc câu hỏi”, placeholder “Nhập nội dung cần tra cứu…”.
- Hàng bộ lọc gồm “Chủ đề” (Tất cả / An ninh mạng / Dữ liệu cá nhân) và
  “Loại quy định” (Tất cả / Khái niệm / Hành vi bị nghiêm cấm / Trách nhiệm).
  Đây là lựa chọn minh họa để trình bày thiết kế, cần đối chiếu danh mục thật sau.
- Nút chính “Tra cứu” màu đỏ, nút phụ “Xóa bộ lọc”. “Tùy chọn nâng cao” chứa
  “Cách tìm”: Từ khóa / Ngữ nghĩa / Kết hợp. Không đưa danh mục tin tức hoặc
  sự kiện từ trang tham khảo vào form luật. Không ưu tiên lọc ngày trong kho một luật.
- Ba chip gợi ý: “Khái niệm an ninh mạng”, “Trách nhiệm của cá nhân”,
  “Tìm theo số điều”; chọn chip điền nội dung để người dùng sửa và gửi.

KẾT QUẢ VÀ CĂN CỨ
- Thiết kế một trạng thái có 3 thẻ kết quả mẫu, ghi rõ dữ liệu minh họa.
- Mỗi thẻ gồm tiêu đề [Tên điều đã kiểm chứng], số văn bản 116/2025/QH15,
  đường dẫn [Chương … • Điều … • Khoản … • Điểm …], nhãn loại quy định,
  [Trích đoạn nguyên văn đã kiểm chứng], nút “Xem nguyên văn” và “Sao chép căn cứ”.
- Dùng placeholder có dấu ngoặc vuông cho phần pháp lý chưa được cung cấp;
  không tự tạo số điều, trích dẫn, mức phạt, đáp án hoặc tình trạng hiệu lực.
- Khi mở một kết quả, hiện khung chi tiết cạnh danh sách trên màn hình đủ rộng:
  nguyên văn, đường dẫn điều khoản, [Nguồn văn bản], [Trang nguồn] và nút đóng.
  Màn hình hẹp dùng trang chi tiết có nút Quay lại, giữ truy vấn trước đó.
- Nếu hiển thị phần “Diễn giải”, tách rõ với “Nguyên văn căn cứ”, dùng nội dung
  placeholder và liên kết tới thẻ nguồn tương ứng. Không hiện % chính xác pháp lý.

ROBOT AI VÀ KHUNG CHAT
- Thay nhân vật cán bộ ở góc phải dưới của mẫu bằng hình minh họa robot AI
  nguyên bản, thân thiện: đầu bo tròn, mắt sáng hiền, thân trắng, điểm nhấn
  burgundy và vàng, một tay chào, có biểu tượng sách nhỏ. Không mặc đồng phục.
- Ưu tiên dùng ảnh robot đính kèm nếu có; giữ đúng nhân vật giữa launcher và
  avatar chat. Robot là ảnh minh họa riêng, không phải emoji hoặc icon chat chung.
- Launcher ở góc phải dưới, cách mép 24px, robot khoảng 80–96px và nhãn
  “Hỏi trợ lý AI”. Không che nút tra cứu, nội dung kết quả hoặc điều khiển phân trang.
- Chat đóng mặc định. Bấm launcher mở khung 390×560px ngay phía trên, cách
  launcher 12px. Header burgundy có avatar robot, “Trợ lý CyberLaw” và nút đóng.
- Lời chào: “Chào bạn! Bạn muốn tra cứu nội dung nào trong Luật An ninh mạng?”
  Có chip gợi ý, vùng hội thoại cuộn, ô “Nhập câu hỏi…” và nút Gửi.
- Phác thảo hội thoại bằng placeholder cho câu trả lời pháp lý và thẻ căn cứ
  có nút “Xem điều khoản”. Hiện nhãn “Hội thoại minh họa” trong bản mẫu.
- Thể hiện trạng thái đang xử lý, chưa đủ căn cứ, câu hỏi thiếu dữ kiện và lỗi
  có nút Thử lại; giữ nội dung người dùng đã nhập. Đóng chat rồi mở lại giữ hội thoại.

RESPONSIVE, TRẠNG THÁI VÀ KHẢ NĂNG TRUY CẬP
- Desktop từ 1200px: sidebar 250px luôn hiện. Tablet 768–1199px: sidebar gọn
  220px vẫn có nhãn; form giảm số cột. Dưới 768px: menu có thể thành drawer,
  form một cột, chat gần toàn màn hình, không cuộn ngang. Tạo mẫu mobile 390px.
- Thiết kế trạng thái ban đầu, đang tìm bằng skeleton, có kết quả, không tìm
  thấy, truy vấn trống, chưa đủ căn cứ, ngoài phạm vi và lỗi dịch vụ.
- Mọi trường có label; nút có tên rõ, focus dễ thấy, vùng bấm tối thiểu 44px.
  Tab đi theo thứ tự đọc, Enter/Space kích hoạt nút; Ctrl+Enter gửi truy vấn.
  Khi mở chat chuyển focus vào ô nhập, Escape đóng và trả focus về launcher.
  Drawer mobile giữ focus bên trong khi mở. Thông báo động được đọc bởi screen reader.
  Thể hiện lỗi bằng chữ kèm icon, không chỉ dựa vào màu. Tôn trọng giảm chuyển động.

ĐẦU RA THIẾT KẾ
Tạo bộ màn hình thống nhất: tra cứu ban đầu, tra cứu có kết quả, xem nguyên văn,
chat đang mở, thư viện luật, từ điển thuật ngữ; có biến thể mobile và các trạng
thái chính. Thư viện dùng mục lục chương–điều; từ điển dùng danh sách thuật ngữ
và khung chi tiết có nguồn. Dùng cùng sidebar, header, nút và hệ màu xuyên suốt.
Làm rõ tương tác của các nút trong bản mẫu. Chỉ mô tả giao diện và hành vi người
dùng; không bổ sung thiết kế backend, API, cơ sở dữ liệu hoặc đáp án pháp luật.
```

## Ghi chú điều chỉnh

- Đây là hướng hình ảnh cho lần thiết kế theo cổng thông tin Bộ Công an; thay bảng màu navy/teal trong prompt giao diện cũ bằng burgundy/vàng nhạt khi dùng prompt này.
- Giữ sidebar luôn mở trên desktop là yêu cầu chính. Chỉ dùng menu thu gọn cho màn hình nhỏ.
- Có thể đính kèm ảnh robot đã chọn khi gửi prompt. Nếu chưa có ảnh, yêu cầu phần robot trong prompt là mô tả hình cần dùng, không phải xác nhận Stitch đã tạo được tài nguyên.
- Thay các placeholder bằng nội dung có nguồn sau khi nhóm duyệt dữ liệu. Số 116/2025/QH15 xác định phạm vi minh họa; prompt không xác nhận hiệu lực hoặc tạo nội dung điều luật.
