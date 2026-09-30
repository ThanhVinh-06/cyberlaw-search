<?php

namespace App\Support;

final class PermissionMatrix
{
    public const VERSION = '2026-09-30';

    public static function rules(): array
    {
        return [
            ['ma_chuc_nang' => 'tra_cuu_luat', 'ten_chuc_nang' => 'Tra cứu pháp luật & xem điều khoản', 'mo_ta' => 'Tìm kiếm văn bản, điều khoản và trích đoạn Luật An ninh mạng', 'nhom' => 'cong_khai', 'khach' => true, 'user' => true, 'admin' => true, 'ghi_chu' => 'Tra cứu công khai.'],
            ['ma_chuc_nang' => 'tra_cuu_thuat_ngu', 'ten_chuc_nang' => 'Từ điển thuật ngữ pháp luật', 'mo_ta' => 'Xem từ khóa, biến thể và định nghĩa có dẫn chiếu', 'nhom' => 'cong_khai', 'khach' => true, 'user' => true, 'admin' => true],
            ['ma_chuc_nang' => 'chat_ai_cyberlaw', 'ten_chuc_nang' => 'Đặt câu hỏi với Trợ lý AI', 'mo_ta' => 'Hỏi đáp AI và nhận câu trả lời có căn cứ', 'nhom' => 'chat_ai', 'khach' => false, 'user' => true, 'admin' => true, 'ghi_chu' => 'Khách cần đăng nhập để lưu phiên.'],
            ['ma_chuc_nang' => 'xem_lich_su_chat', 'ten_chuc_nang' => 'Lưu & xem lịch sử hỏi đáp cá nhân', 'mo_ta' => 'Chỉ xem các phiên của chính tài khoản', 'nhom' => 'chat_ai', 'khach' => false, 'user' => true, 'admin' => true],
            ['ma_chuc_nang' => 'quan_ly_ho_so', 'ten_chuc_nang' => 'Quản lý hồ sơ cá nhân & đổi mật khẩu', 'mo_ta' => 'Cập nhật thông tin và mật khẩu của tài khoản', 'nhom' => 'tai_khoan', 'khach' => false, 'user' => true, 'admin' => true],
            ['ma_chuc_nang' => 'quan_ly_van_ban', 'ten_chuc_nang' => 'Quản lý văn bản & điều khoản pháp luật', 'mo_ta' => 'Thêm, sửa và cập nhật trạng thái tri thức', 'nhom' => 'tri_thuc', 'khach' => false, 'user' => false, 'admin' => true],
            ['ma_chuc_nang' => 'duyet_tri_thuc', 'ten_chuc_nang' => 'Duyệt tri thức & yêu cầu lập chỉ mục', 'mo_ta' => 'Phê duyệt quy định và đồng bộ chỉ mục AI', 'nhom' => 'tri_thuc', 'khach' => false, 'user' => false, 'admin' => true],
            ['ma_chuc_nang' => 'quan_ly_phan_quyen', 'ten_chuc_nang' => 'Quản lý tài khoản & phân quyền người dùng', 'mo_ta' => 'Thêm, đổi vai trò, khóa hoặc mở khóa tài khoản', 'nhom' => 'quan_tri', 'khach' => false, 'user' => false, 'admin' => true, 'ghi_chu' => 'Không tự hạ quyền tài khoản đang thao tác.'],
        ];
    }
}
