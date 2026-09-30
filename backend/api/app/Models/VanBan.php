<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VanBan extends Model
{
    protected $table = 'van_ban';

    protected $primaryKey = 'ma_van_ban';

    const CREATED_AT = 'ngay_tao';

    const UPDATED_AT = 'ngay_cap_nhat';

    // Chi cac truong nay duoc gan hang loat.
    protected $fillable = ['so_hieu', 'tieu_de', 'co_quan_ban_hanh', 'ngay_ban_hanh', 'ngay_hieu_luc', 'ngay_het_hieu_luc', 'lien_ket_nguon', 'duong_dan_tep', 'phien_ban_noi_dung', 'trang_thai'];

    protected function casts(): array
    {
        return ['ngay_ban_hanh' => 'date', 'ngay_hieu_luc' => 'date', 'ngay_het_hieu_luc' => 'date', 'phien_ban_noi_dung' => 'integer'];
    }
}
