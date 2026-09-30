<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NhatKyQuanTri extends Model
{
    protected $table = 'nhat_ky_quan_tri';

    protected $primaryKey = 'ma_nhat_ky';

    const UPDATED_AT = null;

    const CREATED_AT = 'ngay_tao';

    // Chi cac truong nay duoc gan hang loat.
    protected $fillable = ['ma_nguoi_thuc_hien', 'hanh_dong', 'loai_doi_tuong', 'ma_doi_tuong', 'ma_yeu_cau', 'du_lieu_them'];

    protected function casts(): array
    {
        return ['du_lieu_them' => 'array'];
    }
}
