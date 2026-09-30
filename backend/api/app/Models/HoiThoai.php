<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HoiThoai extends Model
{
    protected $table = 'hoi_thoai';

    protected $primaryKey = 'ma_hoi_thoai';

    const CREATED_AT = 'ngay_tao';

    const UPDATED_AT = 'ngay_cap_nhat';

    // Chi cac truong nay duoc gan hang loat.
    protected $fillable = ['ma_nguoi_dung', 'tieu_de'];
}
