<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $ma_xac_nhan_bam
 * @property int $so_lan_thu
 * @property Carbon $ngay_tao
 * @property Carbon $ngay_het_han
 * @property Carbon|null $ngay_su_dung
 * @property Carbon|null $ngay_huy
 */
class YeuCauXacMinhEmail extends Model
{
    protected $table = 'yeu_cau_xac_minh_email';

    protected $primaryKey = 'ma_yeu_cau';

    const CREATED_AT = 'ngay_tao';

    const UPDATED_AT = null;

    protected $hidden = ['ma_xac_nhan_bam'];

    protected $fillable = ['ma_nguoi_dung', 'ma_xac_nhan_bam', 'so_lan_thu', 'ngay_het_han', 'ngay_su_dung', 'ngay_huy'];

    protected function casts(): array
    {
        return ['so_lan_thu' => 'integer', 'ngay_tao' => 'datetime', 'ngay_het_han' => 'datetime', 'ngay_su_dung' => 'datetime', 'ngay_huy' => 'datetime'];
    }
}
