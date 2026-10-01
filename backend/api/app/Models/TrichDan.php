<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrichDan extends Model
{
    protected $table = 'trich_dan';

    protected $primaryKey = 'ma_trich_dan';

    const UPDATED_AT = null;

    const CREATED_AT = 'ngay_tao';

    // Chi cac truong nay duoc gan hang loat.
    protected $fillable = ['ma_tin_nhan', 'ma_dieu_khoan', 'thu_tu_trich_dan', 'so_hieu', 'tieu_de_van_ban', 'phien_ban_noi_dung', 'so_dieu', 'so_khoan', 'ky_hieu_diem', 'noi_dung_trich_dan', 'lien_ket_nguon', 'trang_nguon'];
}
