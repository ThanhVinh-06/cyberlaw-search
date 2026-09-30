<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TuKhoa extends Model
{
    protected $table = 'tu_khoa';

    protected $primaryKey = 'ma_tu_khoa';

    const CREATED_AT = 'ngay_tao';

    const UPDATED_AT = 'ngay_cap_nhat';

    // Chi cac truong nay duoc gan hang loat.
    protected $fillable = ['cum_tu', 'bien_the', 'dinh_nghia', 'ma_dieu_khoan_dinh_nghia'];

    protected function casts(): array
    {
        return ['bien_the' => 'array'];
    }
}
