<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DieuKhoanTuKhoa extends Model
{
    protected $table = 'dieu_khoan_tu_khoa';

    public $incrementing = false;

    protected $primaryKey = null;

    public $timestamps = false;

    // Chi cac truong nay duoc gan hang loat.
    protected $fillable = ['ma_dieu_khoan', 'ma_tu_khoa'];
}
