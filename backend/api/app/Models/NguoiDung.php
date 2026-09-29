<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class NguoiDung extends Authenticatable
{
    protected $table = 'nguoi_dung';

    protected $primaryKey = 'ma_nguoi_dung';

    protected $authPasswordName = 'mat_khau';

    const CREATED_AT = 'ngay_tao';

    const UPDATED_AT = 'ngay_cap_nhat';

    // vai_tro, trang_thai, ma_ghi_nho, lan_dang_nhap_cuoi KHONG mass-assignable:
    // chi service phia server dat sau khi kiem tra quyen.
    protected $fillable = ['ho_ten', 'thu_dien_tu', 'mat_khau'];

    protected $hidden = ['mat_khau', 'ma_ghi_nho'];

    protected function casts(): array
    {
        return ['mat_khau' => 'hashed', 'lan_dang_nhap_cuoi' => 'datetime', 'ngay_xac_minh_email' => 'datetime', 'duoc_mien_xac_minh_email' => 'boolean'];
    }

    public function canUseAccount(): bool
    {
        return $this->getAttribute('ngay_xac_minh_email') !== null || $this->getAttribute('duoc_mien_xac_minh_email') === true;
    }

    public function getAuthPassword()
    {
        return $this->mat_khau;
    }

    public function getRememberTokenName()
    {
        return 'ma_ghi_nho';
    }

    public function isAdmin(): bool
    {
        return $this->vai_tro === 'admin' && $this->trang_thai === 'active';
    }
}
