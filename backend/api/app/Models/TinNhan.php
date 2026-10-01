<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TinNhan extends Model
{
    protected $table = 'tin_nhan';

    protected $primaryKey = 'ma_tin_nhan';

    const CREATED_AT = 'ngay_tao';

    const UPDATED_AT = 'ngay_cap_nhat';

    // Chi cac truong nay duoc gan hang loat.
    protected $fillable = ['ma_hoi_thoai', 'nguoi_gui', 'noi_dung', 'trang_thai_tra_loi', 'do_tin_cay', 'thoi_gian_xu_ly_ms'];

    protected function casts(): array
    {
        return ['do_tin_cay' => 'float', 'thoi_gian_xu_ly_ms' => 'integer'];
    }
}
