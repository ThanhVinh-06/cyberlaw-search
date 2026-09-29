<?php

namespace Tests\Support;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class AccountSchema
{
    public static function create(): void
    {
        // Guard against accidentally running test fixtures against the developer's MySQL database.
        if (DB::connection()->getDriverName() !== 'sqlite') {
            throw new \RuntimeException('Auth fixtures require isolated SQLite.');
        }
        Schema::create('nguoi_dung', function (Blueprint $table) {
            $table->id('ma_nguoi_dung');
            $table->string('ho_ten', 100);
            $table->string('thu_dien_tu', 191)->unique();
            $table->string('mat_khau');
            $table->string('vai_tro')->default('user');
            $table->string('trang_thai')->default('active');
            $table->string('ma_ghi_nho', 100)->nullable();
            $table->dateTime('lan_dang_nhap_cuoi')->nullable();
            $table->dateTime('ngay_xac_minh_email')->nullable();
            $table->boolean('duoc_mien_xac_minh_email')->default(false);
            $table->dateTime('ngay_tao')->nullable();
            $table->dateTime('ngay_cap_nhat')->nullable();
        });
        Schema::create('yeu_cau_xac_minh_email', function (Blueprint $table) {
            $table->id('ma_yeu_cau');
            $table->foreignId('ma_nguoi_dung')->constrained('nguoi_dung', 'ma_nguoi_dung')->cascadeOnDelete();
            $table->string('ma_xac_nhan_bam');
            $table->unsignedTinyInteger('so_lan_thu')->default(0);
            $table->dateTime('ngay_tao');
            $table->dateTime('ngay_het_han');
            $table->dateTime('ngay_su_dung')->nullable();
            $table->dateTime('ngay_huy')->nullable();
        });
        Schema::create('yeu_cau_dat_lai_mat_khau', function (Blueprint $table) {
            $table->id('ma_yeu_cau');
            $table->foreignId('ma_nguoi_dung')->constrained('nguoi_dung', 'ma_nguoi_dung')->cascadeOnDelete();
            $table->string('ma_xac_nhan_bam');
            $table->char('ma_phien_bam', 64)->nullable()->unique();
            $table->unsignedTinyInteger('so_lan_thu')->default(0);
            $table->dateTime('ngay_tao');
            $table->dateTime('ngay_het_han');
            $table->dateTime('ngay_xac_nhan')->nullable();
            $table->dateTime('ngay_su_dung')->nullable();
            $table->dateTime('ngay_huy')->nullable();
        });
        Schema::create('nhat_ky_quan_tri', function (Blueprint $table) {
            $table->id('ma_nhat_ky');
            $table->unsignedBigInteger('ma_nguoi_thuc_hien')->nullable();
            $table->string('hanh_dong');
            $table->string('loai_doi_tuong');
            $table->unsignedBigInteger('ma_doi_tuong')->nullable();
            $table->string('ma_yeu_cau')->nullable();
            $table->json('du_lieu_them')->nullable();
            $table->dateTime('ngay_tao');
        });
    }
}
