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
