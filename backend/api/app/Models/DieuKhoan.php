<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DieuKhoan extends Model
{
    protected $table = 'dieu_khoan';

    protected $primaryKey = 'ma_dieu_khoan';

    const CREATED_AT = 'ngay_tao';

    const UPDATED_AT = 'ngay_cap_nhat';

    // Chi cac truong nay duoc gan hang loat.
    protected $fillable = ['ma_van_ban', 'chuong', 'so_dieu', 'so_khoan', 'ky_hieu_diem', 'tieu_de', 'noi_dung', 'trang_nguon', 'thu_tu'];

    protected function casts(): array
    {
        return ['trang_nguon' => 'integer', 'thu_tu' => 'integer'];
    }
}
