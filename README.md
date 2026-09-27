# CyberLaw Search

Đồ án môn Trí tuệ nhân tạo: **Xây dựng hệ thống tra cứu kiến thức pháp luật về Luật An ninh mạng**.

**Tiếp tục từ phiên/agent khác:** đọc [bàn giao dự án](HANDOFF.md) để nắm các quyết định, trạng thái mã, database và việc còn lại.

## Quyết định công nghệ

- **Frontend đã chốt ngày 27/09/2026:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Motion for React.
- **Backend đang đề xuất theo yêu cầu kết hợp PHP và Python:** Laravel làm API nghiệp vụ, FastAPI làm dịch vụ xử lý AI.
- **Database theo lựa chọn của người dùng:** MySQL. Bổ sung yêu cầu đăng ký, đăng nhập, đăng xuất và phân quyền; thiết kế chi tiết trong [Tài khoản và phân quyền](docs/requirements/02-tai-khoan-phan-quyen.md).
- Mã frontend hiện vẫn là bản HTML/CSS/JavaScript thuần; chưa thực hiện chuyển đổi framework. Cây thư mục bên dưới phản ánh các tệp hiện có.

Chi tiết phân chia trách nhiệm và luồng kết nối: [Phương án công nghệ](docs/technology-decisions.md).

## Trạng thái hiện tại

- **Đã có:** giao diện HTML/CSS/JavaScript, hình trợ lý AI, tìm kiếm trên ba bản ghi minh họa, khung chat phản hồi mẫu; phân tích yêu cầu, đặc tả form và prompt thiết kế.
- **Đã lưu:** tài liệu đề bài, PDF luật và văn bản trích xuất ban đầu.
- **Database:** đã tạo `cyberlaw_search` trên MySQL 8.0.44 với 9 bảng; tên bảng/cột bằng tiếng Việt không dấu, các bảng đang rỗng. Xem [thiết kế dữ liệu](docs/design/04-co-so-du-lieu.md) và [file SQL đã xuất](database/cyberlaw_search.sql).
- **Chưa triển khai:** backend/API, cơ sở tri thức đã duyệt, tìm kiếm ngữ nghĩa, kết nối LLM và bộ đánh giá. Các thư mục tương ứng là khung chuẩn bị.

## Mở giao diện

Từ thư mục gốc dự án:

```powershell
python scripts/serve_frontend.py
```

Mở **http://127.0.0.1:4173**. Dừng bằng `Ctrl+C`. Có thể chọn cổng khác:

```powershell
python scripts/serve_frontend.py --port 4174
```

Lệnh chỉ dùng thư viện chuẩn Python 3 và chỉ phục vụ thư mục `frontend`, không công khai dữ liệu luật hay tài liệu dự án. Nếu không có Python, có thể mở trực tiếp `frontend/index.html`. Font trực tuyến có font hệ thống thay thế khi mất mạng.

## Cấu trúc thư mục

```text
cyberlaw-search/
├── frontend/                  # Giao diện hiện tại, chạy được
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── assets/                # Ảnh dùng trực tiếp trên giao diện
├── backend/                   # Khung cho Python/FastAPI, chưa có API
│   └── app/
│       ├── api/               # Các endpoint tra cứu, văn bản, hỏi đáp
│       ├── schemas/           # Cấu trúc dữ liệu vào/ra
│       ├── services/          # Điều phối tra cứu và tạo câu trả lời
│       ├── retrieval/         # TF-IDF, embedding, xếp hạng
│       └── knowledge/         # Đọc/lưu điều khoản, khái niệm, quy định
├── data/
│   ├── raw/laws/              # PDF nguyên bản, tách 2018 và 2025
│   ├── interim/               # Trích xuất thô và ảnh đối chiếu
│   ├── processed/             # Điều khoản, keyphrase, quy định đã duyệt
│   ├── evaluation/            # Bộ câu hỏi chuẩn và phân chia tập
│   ├── indexes/               # Chỉ mục sinh tự động, không đưa vào Git
│   ├── runtime/               # Đầu ra tạm khi chạy, không đưa vào Git
│   └── sources.json           # Nguồn, đường dẫn, SHA-256, trạng thái duyệt
├── database/                  # Schema, SQL dump và kết quả kiểm tra MySQL
├── docs/
│   ├── requirements/          # Phân tích yêu cầu
│   ├── design/                # Đặc tả form, ảnh thiết kế, ảnh robot gốc
│   ├── prompts/               # Prompt triển khai và prompt Stitch
│   ├── references/            # Đề bài và bản trích xuất/ảnh đối chiếu
│   ├── project-structure.md   # Quy ước đặt tệp và kiến trúc
│   └── file-migration.json    # Đối chiếu đường dẫn cũ → mới
├── experiments/
│   ├── results/               # Kết quả đo và phân tích thuật toán
│   └── archive/               # Thử nghiệm giao diện cũ được giữ lại
├── tests/
│   ├── frontend/              # Kiểm tra luồng giao diện khi phát triển
│   ├── backend/               # Kiểm tra API khi triển khai
│   └── retrieval/             # Kiểm tra truy hồi và dẫn chiếu
├── reports/
│   ├── word/                  # Báo cáo và hướng dẫn sử dụng
│   ├── slides/                # Slide bảo vệ
│   ├── demo/                  # Ảnh/video demo để nộp
│   └── team/                  # Danh sách nhóm
├── scripts/                   # Lệnh phục vụ phát triển và xử lý dữ liệu
├── .vscode/                   # Cấu hình trình soạn thảo hiện có
├── .gitignore
└── README.md
```

Các thư mục chưa có mã/dữ liệu có `.gitkeep` để giữ trong Git. Tệp này không phải chức năng đã triển khai.

## Đọc theo thứ tự

1. [Phân tích yêu cầu](docs/requirements/01-phan-tich-yeu-cau.md).
2. [Đặc tả form](docs/design/03-dac-ta-form.md) và [prompt Stitch theo hướng thiết kế mới](docs/prompts/04-prompt-stitch.md).
3. [Quy ước cấu trúc](docs/project-structure.md).
4. [Nguồn và luồng xử lý dữ liệu](data/README.md).
5. [Khung backend](backend/README.md), khi bắt đầu triển khai AI/API.

## Quy ước làm việc

- Chỉnh giao diện trong `frontend/`; giữ nguyên phong cách đỏ burgundy, vàng nhạt và menu trái đã chọn.
- Giữ PDF trong `data/raw/` nguyên vẹn. Làm sạch ở `data/interim/`; đưa bản đã kiểm duyệt vào `data/processed/`.
- Bản luật 2018 dùng tham khảo lịch sử; không trộn tự động với luật 2025.
- Không lưu khóa API vào frontend hoặc Git. Chỉ bổ sung cấu hình backend khi bắt đầu triển khai.
- Báo cáo và số đo phải ghi đúng phần đã làm; dữ liệu mẫu chưa phải bộ tri thức hoàn chỉnh.

Tài liệu nguồn tại ổ D đã được **sao chép**, không di chuyển hay sửa đổi. Bản sao trong dự án giúp bàn giao cho thành viên khác mà không phụ thuộc đường dẫn máy cá nhân.
