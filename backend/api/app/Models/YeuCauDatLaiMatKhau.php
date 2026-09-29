<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class YeuCauDatLaiMatKhau extends Model
{
    protected $table = 'yeu_cau_dat_lai_mat_khau';

    protected $primaryKey = 'ma_yeu_cau';

    protected $hidden = ['ma_xac_nhan_bam', 'ma_phien_bam'];

    const UPDATED_AT = null;

    const CREATED_AT = 'ngay_tao';

    // Chi cac truong nay duoc gan hang loat.
    protected $fillable = ['ma_nguoi_dung', 'ma_xac_nhan_bam', 'ma_phien_bam', 'so_lan_thu', 'ngay_het_han', 'ngay_xac_nhan', 'ngay_su_dung', 'ngay_huy'];

    protected function casts(): array
    {
        return ['ngay_het_han' => 'datetime', 'ngay_xac_nhan' => 'datetime', 'ngay_su_dung' => 'datetime', 'ngay_huy' => 'datetime'];
    }
}
