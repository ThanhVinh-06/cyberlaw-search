// Quản lý dữ liệu người dùng và phân quyền theo cấu trúc database/schema.sql (bảng nguoi_dung)

export type VaiTro = "admin" | "user";
export type TrangThai = "active" | "blocked";

export interface NguoiDung {
  ma_nguoi_dung: number;
  ho_ten: string;
  thu_dien_tu: string;
  mat_khau?: string;
  vai_tro: VaiTro;
  trang_thai: TrangThai;
  ma_ghi_nho?: string | null;
  ngay_tao: string;
  ngay_cap_nhat: string;
  // Trường thống kê mô phỏng hoạt động phục vụ hiển thị
  so_hoi_thoai?: number;
  lan_dang_nhap_cuoi?: string;
}

export const initialNguoiDungList: NguoiDung[] = [
  {
    ma_nguoi_dung: 1,
    ho_ten: "Quản trị viên Hệ thống",
    thu_dien_tu: "admin@cyberlaw.vn",
    vai_tro: "admin",
    trang_thai: "active",
    ma_ghi_nho: "token_adm_001_sys",
    ngay_tao: "2026-01-10 08:00:00",
    ngay_cap_nhat: "2026-03-25 10:15:00",
    so_hoi_thoai: 42,
    lan_dang_nhap_cuoi: "Vừa xong",
  },
  {
    ma_nguoi_dung: 2,
    ho_ten: "Trần Bảo Sơn",
    thu_dien_tu: "son.tran@cyberlaw.vn",
    vai_tro: "admin",
    trang_thai: "active",
    ma_ghi_nho: "token_adm_002_data",
    ngay_tao: "2026-01-15 09:30:00",
    ngay_cap_nhat: "2026-03-24 16:45:00",
    so_hoi_thoai: 28,
    lan_dang_nhap_cuoi: "2 giờ trước",
  },
  {
    ma_nguoi_dung: 3,
    ho_ten: "Nguyễn Thị Phương Mai",
    thu_dien_tu: "mai.nguyen@gmail.com",
    vai_tro: "user",
    trang_thai: "active",
    ma_ghi_nho: null,
    ngay_tao: "2026-02-01 14:20:00",
    ngay_cap_nhat: "2026-03-20 11:10:00",
    so_hoi_thoai: 15,
    lan_dang_nhap_cuoi: "Hôm qua",
  },
  {
    ma_nguoi_dung: 4,
    ho_ten: "Lê Hoàng Long",
    thu_dien_tu: "long.le@student.hcmut.edu.vn",
    vai_tro: "user",
    trang_thai: "active",
    ma_ghi_nho: "token_usr_004",
    ngay_tao: "2026-02-05 10:05:00",
    ngay_cap_nhat: "2026-03-22 09:40:00",
    so_hoi_thoai: 34,
    lan_dang_nhap_cuoi: "3 ngày trước",
  },
  {
    ma_nguoi_dung: 5,
    ho_ten: "Phạm Minh Tuấn",
    thu_dien_tu: "tuan.pham@techlaw.vn",
    vai_tro: "user",
    trang_thai: "active",
    ma_ghi_nho: null,
    ngay_tao: "2026-02-12 16:50:00",
    ngay_cap_nhat: "2026-03-18 15:30:00",
    so_hoi_thoai: 8,
    lan_dang_nhap_cuoi: "5 ngày trước",
  },
  {
    ma_nguoi_dung: 6,
    ho_ten: "Đặng Thu Thảo",
    thu_dien_tu: "thao.dang@lawyer.com",
    vai_tro: "user",
    trang_thai: "active",
    ma_ghi_nho: "token_usr_006",
    ngay_tao: "2026-02-20 08:15:00",
    ngay_cap_nhat: "2026-03-21 14:00:00",
    so_hoi_thoai: 19,
    lan_dang_nhap_cuoi: "1 tuần trước",
  },
  {
    ma_nguoi_dung: 7,
    ho_ten: "Vũ Đức Trọng",
    thu_dien_tu: "trong.vu@outlook.com",
    vai_tro: "user",
    trang_thai: "blocked",
    ma_ghi_nho: null,
    ngay_tao: "2026-02-28 11:30:00",
    ngay_cap_nhat: "2026-03-10 17:20:00",
    so_hoi_thoai: 3,
    lan_dang_nhap_cuoi: "17 ngày trước",
  },
  {
    ma_nguoi_dung: 8,
    ho_ten: "Bùi Quỳnh Anh",
    thu_dien_tu: "anh.bui@hcmulaw.edu.vn",
    vai_tro: "user",
    trang_thai: "active",
    ma_ghi_nho: "token_usr_008",
    ngay_tao: "2026-03-05 13:40:00",
    ngay_cap_nhat: "2026-03-25 08:50:00",
    so_hoi_thoai: 22,
    lan_dang_nhap_cuoi: "Hôm nay",
  },
  {
    ma_nguoi_dung: 9,
    ho_ten: "Hoàng Gia Huy",
    thu_dien_tu: "huy.hoang@security.io",
    vai_tro: "user",
    trang_thai: "blocked",
    ma_ghi_nho: null,
    ngay_tao: "2026-03-12 15:10:00",
    ngay_cap_nhat: "2026-03-19 12:00:00",
    so_hoi_thoai: 1,
    lan_dang_nhap_cuoi: "8 ngày trước",
  },
];

// Danh sách quyền hạn chi tiết theo ma trận docs/requirements/02-tai-khoan-phan-quyen.md
export interface QuyTacPhanQuyen {
  ma_chuc_nang: string;
  ten_chuc_nang: string;
  mo_ta: string;
  nhom: "cong_khai" | "tai_khoan" | "chat_ai" | "tri_thuc" | "quan_tri";
  khach: boolean;
  user: boolean;
  admin: boolean;
  ghi_chu?: string;
}

export const maTranPhanQuyen: QuyTacPhanQuyen[] = [
  {
    ma_chuc_nang: "tra_cuu_luat",
    ten_chuc_nang: "Tra cứu pháp luật & xem điều khoản",
    mo_ta:
      "Tìm kiếm văn bản, điều khoản, nguyên văn trích đoạn Luật An ninh mạng",
    nhom: "cong_khai",
    khach: true,
    user: true,
    admin: true,
    ghi_chu: "Mọi đối tượng đều được tra cứu công khai không cần tài khoản",
  },
  {
    ma_chuc_nang: "tra_cuu_thuat_ngu",
    ten_chuc_nang: "Từ điển thuật ngữ pháp luật",
    mo_ta: "Xem danh mục từ khóa, biến thể và định nghĩa có dẫn chiếu",
    nhom: "cong_khai",
    khach: true,
    user: true,
    admin: true,
  },
  {
    ma_chuc_nang: "chat_ai_cyberlaw",
    ten_chuc_nang: "Đặt câu hỏi với Trợ lý AI",
    mo_ta: "Hỏi đáp với AI và nhận câu trả lời có trích dẫn điều khoản căn cứ",
    nhom: "chat_ai",
    khach: false,
    user: true,
    admin: true,
    ghi_chu: "Khách được mời đăng nhập để lưu giữ phiên hỏi đáp",
  },
  {
    ma_chuc_nang: "xem_lich_su_chat",
    ten_chuc_nang: "Lưu & xem lịch sử hỏi đáp cá nhân",
    mo_ta: "Xem lại các phiên hỏi đáp trước đây của chính tài khoản mình",
    nhom: "chat_ai",
    khach: false,
    user: true,
    admin: true,
    ghi_chu: "Chỉ xem được lịch sử của chính mình (kiểm tra ma_nguoi_dung)",
  },
  {
    ma_chuc_nang: "quan_ly_ho_so",
    ten_chuc_nang: "Quản lý hồ sơ cá nhân & đổi mật khẩu",
    mo_ta: "Cập nhật họ tên, mật khẩu đăng nhập của tài khoản",
    nhom: "tai_khoan",
    khach: false,
    user: true,
    admin: true,
  },
  {
    ma_chuc_nang: "quan_ly_van_ban",
    ten_chuc_nang: "Quản lý văn bản & điều khoản pháp luật",
    mo_ta:
      "Thêm, sửa, cập nhật trạng thái văn bản luật và trích đoạn điều khoản",
    nhom: "tri_thuc",
    khach: false,
    user: false,
    admin: true,
    ghi_chu: "Quyền đặc thù của Quản trị viên",
  },
  {
    ma_chuc_nang: "duyet_tri_thuc",
    ten_chuc_nang: "Duyệt tri thức & yêu cầu lập chỉ mục",
    mo_ta: "Phê duyệt các quy định bóc tách và đồng bộ chỉ mục vector cho AI",
    nhom: "tri_thuc",
    khach: false,
    user: false,
    admin: true,
  },
  {
    ma_chuc_nang: "quan_ly_phan_quyen",
    ten_chuc_nang: "Quản lý tài khoản & phân quyền người dùng",
    mo_ta:
      "Thêm mới, thay đổi vai trò (user/admin), khóa hoặc mở khóa tài khoản",
    nhom: "quan_tri",
    khach: false,
    user: false,
    admin: true,
    ghi_chu: "Không cho phép tự khóa hoặc hạ quyền admin đang thao tác",
  },
];

// Dữ liệu Thống kê & Báo cáo hệ thống (phục vụ giao diện phong cách Mazer Dashboard)
export interface ThongKeTongQuan {
  tong_nguoi_dung: number;
  tang_truong_nguoi_dung: string;
  tong_dieu_khoan: number;
  tong_van_ban: number;
  tong_quy_dinh: number;
  tang_truong_quy_dinh: string;
  tong_cuoc_hoi_dap: number;
  tang_truong_hoi_dap: string;
}

export const thongKeTongQuanData: ThongKeTongQuan = {
  tong_nguoi_dung: 1280,
  tang_truong_nguoi_dung: "+14.2% so với tháng trước",
  tong_dieu_khoan: 47,
  tong_van_ban: 2,
  tong_quy_dinh: 328,
  tang_truong_quy_dinh: "+8.5% vừa chuẩn hóa",
  tong_cuoc_hoi_dap: 3450,
  tang_truong_hoi_dap: "+28.6% lượt truy vấn",
};

export interface DuLieuThang {
  thang: string;
  ten_thang: string;
  hoi_dap: number;
  tra_cuu: number | null;
  trich_dan: number;
}

export const thongKeTheoThangData: DuLieuThang[] = [
  {
    thang: "T01-02",
    ten_thang: "Tháng 01 – 02/2026",
    hoi_dap: 335,
    tra_cuu: 490,
    trich_dan: 310,
  },
  {
    thang: "T03-04",
    ten_thang: "Tháng 03 – 04/2026",
    hoi_dap: 550,
    tra_cuu: 790,
    trich_dan: 522,
  },
  {
    thang: "T05-06",
    ten_thang: "Tháng 05 – 06/2026",
    hoi_dap: 440,
    tra_cuu: 610,
    trich_dan: 420,
  },
  {
    thang: "T07-08",
    ten_thang: "Tháng 07 – 08/2026",
    hoi_dap: 700,
    tra_cuu: 910,
    trich_dan: 670,
  },
  {
    thang: "T09-10",
    ten_thang: "Tháng 09 – 10/2026",
    hoi_dap: 460,
    tra_cuu: 630,
    trich_dan: 436,
  },
  {
    thang: "T11-12",
    ten_thang: "Tháng 11 – 12/2026",
    hoi_dap: 760,
    tra_cuu: 1000,
    trich_dan: 730,
  },
];

export const thongKeTheo6ThangData: DuLieuThang[] = [
  {
    thang: "T05-06",
    ten_thang: "Tháng 05 – 06/2026",
    hoi_dap: 440,
    tra_cuu: 610,
    trich_dan: 420,
  },
  {
    thang: "T07-08",
    ten_thang: "Tháng 07 – 08/2026",
    hoi_dap: 700,
    tra_cuu: 910,
    trich_dan: 670,
  },
  {
    thang: "T09-10",
    ten_thang: "Tháng 09 – 10/2026",
    hoi_dap: 460,
    tra_cuu: 630,
    trich_dan: 436,
  },
];

export const thongKeTheo30NgayData: DuLieuThang[] = [
  {
    thang: "Tuần 1",
    ten_thang: "Tuần 1 (02/09 – 08/09)",
    hoi_dap: 95,
    tra_cuu: 140,
    trich_dan: 88,
  },
  {
    thang: "Tuần 2",
    ten_thang: "Tuần 2 (09/09 – 15/09)",
    hoi_dap: 130,
    tra_cuu: 185,
    trich_dan: 122,
  },
  {
    thang: "Tuần 3",
    ten_thang: "Tuần 3 (16/09 – 22/09)",
    hoi_dap: 110,
    tra_cuu: 160,
    trich_dan: 104,
  },
  {
    thang: "Tuần 4",
    ten_thang: "Tuần 4 (23/09 – 01/10)",
    hoi_dap: 145,
    tra_cuu: 210,
    trich_dan: 138,
  },
];

export interface NhomQuyDinhSparkline {
  ma_loai: string;
  ten_loai: string;
  so_luong: number;
  ti_le: string;
  mau_sac: string;
  bg_nhe: string;
  sparkline: number[];
}

export const nhomQuyDinhData: NhomQuyDinhSparkline[] = [
  {
    ma_loai: "prohibition",
    ten_loai: "Hành vi bị nghiêm cấm",
    so_luong: 48,
    ti_le: "+12% cập nhật",
    mau_sac: "#800020",
    bg_nhe: "rgba(128, 0, 32, 0.08)",
    sparkline: [20, 28, 25, 36, 32, 44, 48],
  },
  {
    ma_loai: "right",
    ten_loai: "Quyền & Lợi ích hợp pháp",
    so_luong: 74,
    ti_le: "+18% bổ sung",
    mau_sac: "#059669",
    bg_nhe: "rgba(5, 150, 105, 0.08)",
    sparkline: [35, 42, 38, 55, 50, 68, 74],
  },
  {
    ma_loai: "obligation",
    ten_loai: "Trách nhiệm & Nghĩa vụ",
    so_luong: 116,
    ti_le: "+24% chuẩn hóa",
    mau_sac: "#d97706",
    bg_nhe: "rgba(217, 119, 6, 0.08)",
    sparkline: [50, 65, 60, 85, 80, 105, 116],
  },
  {
    ma_loai: "authority",
    ten_loai: "Thẩm quyền & Biện pháp",
    so_luong: 90,
    ti_le: "+15% hoàn thiện",
    mau_sac: "#0284c7",
    bg_nhe: "rgba(2, 132, 199, 0.08)",
    sparkline: [40, 48, 45, 62, 58, 80, 90],
  },
];

export interface CauHoiGanDay {
  ma_tin_nhan: number;
  nguoi_gui: string;
  avatar: string;
  cau_hoi: string;
  dieu_khoan_trich_dan: string;
  thoi_gian: string;
  vai_tro: string;
  tra_loi_ai: string;
  trich_doan_luat: string;
  do_tin_cay: string;
  thoi_gian_xu_ly: string;
  loai_quy_dinh: string;
  muc_phat?: string;
  dieu_so: number;
}

export const danhSachCauHoiGanDay: CauHoiGanDay[] = [
  {
    ma_tin_nhan: 101,
    nguoi_gui: "Lê Hoàng Long",
    avatar: "HL",
    cau_hoi:
      "Mức xử phạt đối với hành vi phát tán thông tin sai sự thật trên không gian mạng được quy định thế nào?",
    dieu_khoan_trich_dan: "Điều 8, Khoản 1 & Điều 16",
    thoi_gian: "5 phút trước",
    vai_tro: "Sinh viên CNTT",
    tra_loi_ai:
      "Căn cứ Điều 8 & 16 Luật An ninh mạng 2018 kết hợp Nghị định 15/2020/NĐ-CP (Điều 101), hành vi cung cấp, chia sẻ thông tin giả mạo, sai sự thật trên mạng xã hội bị xử phạt vi phạm hành chính từ 10.000.000đ - 20.000.000đ đối với tổ chức (cá nhân phạt 1/2 mức này), đồng thời áp dụng biện pháp khắc phục buộc gỡ bỏ thông tin sai sự thật. Trường hợp gây hậu quả đặc biệt nghiêm trọng có thể bị truy cứu trách nhiệm hình sự theo Điều 288 hoặc 331 Bộ luật Hình sự.",
    trich_doan_luat:
      '"Nghiêm cấm hành vi đưa thông tin sai sự thật gây hoang mang trong Nhân dân, gây thiệt hại cho hoạt động kinh tế - xã hội, gây khó khăn cho hoạt động của cơ quan nhà nước hoặc người thi hành công vụ, xâm phạm quyền và lợi ích hợp pháp của cơ quan, tổ chức, cá nhân khác." (Điều 8 Khoản 1 Điểm d)',
    do_tin_cay: "98.5%",
    thoi_gian_xu_ly: "0.74s",
    loai_quy_dinh: "Hành vi bị nghiêm cấm",
    muc_phat: "Phạt tiền 10 - 20 triệu VNĐ & buộc gỡ bỏ thông tin vi phạm",
    dieu_so: 8,
  },
  {
    ma_tin_nhan: 102,
    nguoi_gui: "Đặng Thu Thảo",
    avatar: "TT",
    cau_hoi:
      "Doanh nghiệp cung cấp dịch vụ viễn thông tại Việt Nam phải lưu trữ dữ liệu người dùng trong thời hạn bao lâu?",
    dieu_khoan_trich_dan: "Điều 26, Khoản 3",
    thoi_gian: "18 phút trước",
    vai_tro: "Luật sư tư vấn",
    tra_loi_ai:
      "Theo Điều 26 Khoản 3 Luật An ninh mạng 2018 và Nghị định số 53/2022/NĐ-CP, doanh nghiệp trong nước và doanh nghiệp nước ngoài cung cấp dịch vụ mạng viễn thông, mạng internet, các dịch vụ gia tăng trên không gian mạng tại Việt Nam có hoạt động thu thập, khai thác dữ liệu phải lưu trữ dữ liệu người dùng (thông tin cá nhân, tài khoản, nhật ký thanh toán) tại Việt Nam trong thời hạn tối thiểu 24 tháng (2 năm).",
    trich_doan_luat:
      '"Doanh nghiệp trong nước và ngoài nước cung cấp dịch vụ trên mạng viễn thông, mạng internet... phải lưu trữ dữ liệu về thông tin cá nhân, dữ liệu về mối quan hệ của người sử dụng dịch vụ, dữ liệu do người sử dụng dịch vụ tại Việt Nam tạo ra tại Việt Nam theo quy định của Chính phủ." (Điều 26 Khoản 3)',
    do_tin_cay: "99.1%",
    thoi_gian_xu_ly: "0.62s",
    loai_quy_dinh: "Nghĩa vụ doanh nghiệp",
    muc_phat:
      "Yêu cầu đặt chi nhánh / văn phòng đại diện & lưu trữ dữ liệu tại VN",
    dieu_so: 26,
  },
  {
    ma_tin_nhan: 103,
    nguoi_gui: "Phạm Minh Tuấn",
    avatar: "MT",
    cau_hoi:
      "Cơ quan chuyên trách bảo vệ an ninh mạng có những thẩm quyền gì khi xử lý sự cố an ninh quốc gia?",
    dieu_khoan_trich_dan: "Điều 5 & Điều 19",
    thoi_gian: "42 phút trước",
    vai_tro: "Chuyên viên ATTT",
    tra_loi_ai:
      "Cơ quan chuyên trách gồm Cục An ninh mạng và phòng chống tội phạm công nghệ cao (A05 - Bộ Công an) và Bộ Tư lệnh Tác chiến không gian mạng (Bộ Quốc phòng) có thẩm quyền: Yêu cầu cơ quan, tổ chức áp dụng ngay biện pháp ngăn chặn; phong tỏa hoặc tạm dừng hoạt động phần cứng, phần mềm liên quan; thu giữ chứng cứ kỹ thuật số; và điều phối lực lượng ứng phó khẩn cấp quốc gia.",
    trich_doan_luat:
      '"Khi xảy ra tình huống nguy hiểm về an ninh mạng, lực lượng chuyên trách được quyền áp dụng các biện pháp: phong tỏa, hạn chế hoạt động của hệ thống thông tin; đình chỉ, tạm đình chỉ hoặc yêu cầu ngừng cung cấp thông tin, dịch vụ mạng." (Điều 19 Khoản 2)',
    do_tin_cay: "97.8%",
    thoi_gian_xu_ly: "0.81s",
    loai_quy_dinh: "Thẩm quyền cơ quan",
    muc_phat: "Quyền phong tỏa hệ thống & áp dụng biện pháp cưỡng chế khẩn cấp",
    dieu_so: 19,
  },
  {
    ma_tin_nhan: 104,
    nguoi_gui: "Bùi Quỳnh Anh",
    avatar: "QA",
    cau_hoi:
      "Trẻ em được bảo vệ như thế nào trước các thông tin độc hại và xâm hại trên không gian mạng?",
    dieu_khoan_trich_dan: "Điều 29, Khoản 1 & 2",
    thoi_gian: "1 giờ trước",
    vai_tro: "Nghiên cứu sinh Luật",
    tra_loi_ai:
      "Trẻ em có quyền được bảo vệ, tiếp cận thông tin lành mạnh trên không gian mạng. Chủ quản hệ thống thông tin và doanh nghiệp cung cấp dịch vụ mạng có trách nhiệm kiểm soát nội dung không để gây nguy hại cho trẻ em, xâm hại đời sống riêng tư. Đồng thời phải ngăn chặn, chia sẻ và kịp thời gỡ bỏ các nội dung bạo lực, khiêu dâm, lừa đảo xâm phạm đến quyền trẻ em.",
    trich_doan_luat:
      '"Trẻ em có quyền được bảo vệ, tiếp cận thông tin, tham gia hoạt động xã hội, vui chơi, giải trí, giữ bí mật cá nhân, đời sống riêng tư và các quyền khác khi tham gia trên không gian mạng." (Điều 29 Khoản 1)',
    do_tin_cay: "98.9%",
    thoi_gian_xu_ly: "0.68s",
    loai_quy_dinh: "Bảo vệ trẻ em",
    muc_phat:
      "Buộc gỡ bỏ ngay lập tức thông tin & xử lý nghiêm hành vi xâm hại",
    dieu_so: 29,
  },
  {
    ma_tin_nhan: 105,
    nguoi_gui: "Vũ Đức Trọng",
    avatar: "ĐT",
    cau_hoi:
      "Quy trình kiểm tra an ninh mạng đối với hệ thống thông tin quan trọng về an ninh quốc gia gồm những bước nào?",
    dieu_khoan_trich_dan: "Điều 13, Khoản 4",
    thoi_gian: "2 giờ trước",
    vai_tro: "Quản trị mạng DN",
    tra_loi_ai:
      "Quy trình kiểm tra định kỳ hoặc đột xuất bao gồm: 1) Thông báo bằng văn bản trước ít nhất 12 giờ cho chủ quản hệ thống; 2) Tiến hành kiểm tra thực tế cấu hình, lỗ hổng mã nguồn, phân quyền tài trị và nhật ký log; 3) Lập biên bản hiện trạng kỹ thuật và kiến nghị thời hạn khắc phục; 4) Giám sát, đánh giá lại sau khi khắc phục.",
    trich_doan_luat:
      '"Chủ quản hệ thống thông tin quan trọng về an ninh quốc gia có trách nhiệm phối hợp với lực lượng chuyên trách thực hiện kiểm tra an ninh mạng theo đúng trình tự, quy chuẩn kỹ thuật." (Điều 13 Khoản 4)',
    do_tin_cay: "99.4%",
    thoi_gian_xu_ly: "0.92s",
    loai_quy_dinh: "Quy trình kiểm tra",
    muc_phat: "Bắt buộc chấp hành lệnh kiểm tra của lực lượng chuyên trách",
    dieu_so: 13,
  },
];

export interface NguoiDungNoiBat {
  ma_nguoi_dung: number;
  ho_ten: string;
  email: string;
  avatar: string;
  so_cuoc_hoi: number;
  vai_tro_nhan: string;
  trang_thai: "online" | "idle" | "offline";
}

export const danhSachNguoiDungNoiBat: NguoiDungNoiBat[] = [
  {
    ma_nguoi_dung: 4,
    ho_ten: "Lê Hoàng Long",
    email: "long.le@student.hcmut.edu.vn",
    avatar: "HL",
    so_cuoc_hoi: 34,
    vai_tro_nhan: "Đại học Bách Khoa",
    trang_thai: "online",
  },
  {
    ma_nguoi_dung: 2,
    ho_ten: "Trần Bảo Sơn",
    email: "son.tran@cyberlaw.vn",
    avatar: "BS",
    so_cuoc_hoi: 28,
    vai_tro_nhan: "Quản trị viên Dữ liệu",
    trang_thai: "online",
  },
  {
    ma_nguoi_dung: 8,
    ho_ten: "Bùi Quỳnh Anh",
    email: "anh.bui@hcmulaw.edu.vn",
    avatar: "QA",
    so_cuoc_hoi: 22,
    vai_tro_nhan: "Đại học Luật TP.HCM",
    trang_thai: "idle",
  },
  {
    ma_nguoi_dung: 6,
    ho_ten: "Đặng Thu Thảo",
    email: "thao.dang@lawyer.com",
    avatar: "TT",
    so_cuoc_hoi: 19,
    vai_tro_nhan: "Đoàn Luật sư Hà Nội",
    trang_thai: "offline",
  },
];

export interface TyLeTrichDanPhapLy {
  nhom: string;
  ti_le: number;
  mau_sac: string;
  so_luot: string;
  mo_ta: string;
}

export const tyLeTrichDanData: TyLeTrichDanPhapLy[] = [
  {
    nhom: "Trích dẫn chính xác điều khoản",
    ti_le: 78,
    mau_sac: "#800020",
    so_luot: "2,691 lượt",
    mo_ta: "Đầy đủ số điều, khoản và trích nguyên văn căn cứ pháp luật",
  },
  {
    nhom: "Giải thích thuật ngữ & định nghĩa",
    ti_le: 16,
    mau_sac: "#0284c7",
    so_luot: "552 lượt",
    mo_ta: "Khái niệm an ninh mạng, không gian mạng, dữ liệu cá nhân",
  },
  {
    nhom: "Cần bổ sung thêm ngữ cảnh",
    ti_le: 6,
    mau_sac: "#d97706",
    so_luot: "207 lượt",
    mo_ta: "Câu hỏi tổng quát ngoài phạm vi văn bản luật hiện hành",
  },
];
