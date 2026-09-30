<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuyDinh extends Model
{
    protected $table = 'quy_dinh';

    protected $primaryKey = 'ma_quy_dinh';

    const CREATED_AT = 'ngay_tao';

    const UPDATED_AT = 'ngay_cap_nhat';

    // Chi cac truong nay duoc gan hang loat.
    protected $fillable = ['ma_dieu_khoan', 'loai_quy_dinh', 'chu_the', 'hanh_vi', 'doi_tuong', 'dieu_kien', 'ngoai_le', 'trich_nguyen_van'];
}
