<?php

namespace Tests\Support;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

final class KnowledgeSchema
{
    public static function create(bool $browser = false): void
    {
        $database = str_replace('\\', '/', DB::connection()->getDatabaseName());
        $allowed = $database === ':memory:' || ($browser && $database === str_replace('\\', '/', storage_path('framework/testing/auth-browser.sqlite')));
        if (DB::connection()->getDriverName() !== 'sqlite' || ! $allowed) {
            throw new RuntimeException('Knowledge fixtures require in-memory SQLite.');
        }
        AccountSchema::create();
        Schema::create('van_ban', function (Blueprint $t) {
            $t->id('ma_van_ban');
            $t->string('so_hieu', 100)->unique();
            $t->string('tieu_de', 500);
            $t->string('co_quan_ban_hanh', 255)->nullable();
            foreach (['ngay_ban_hanh', 'ngay_hieu_luc', 'ngay_het_hieu_luc'] as $c) {
                $t->date($c)->nullable();
            }
            $t->string('lien_ket_nguon', 2048)->nullable();
            $t->string('duong_dan_tep', 500)->nullable();
            $t->unsignedInteger('phien_ban_noi_dung')->default(1);
            $t->enum('trang_thai', ['draft', 'published', 'archived'])->default('draft');
            $t->dateTime('ngay_tao');
            $t->dateTime('ngay_cap_nhat');
        });
        Schema::create('dieu_khoan', function (Blueprint $t) {
            $t->id('ma_dieu_khoan');
            $t->foreignId('ma_van_ban')->constrained('van_ban', 'ma_van_ban')->restrictOnDelete();
            $t->string('chuong', 100)->nullable();
            $t->string('so_dieu', 10);
            $t->string('so_khoan', 10)->default('');
            $t->string('ky_hieu_diem', 10)->default('');
            $t->string('tieu_de', 500)->default('');
            $t->mediumText('noi_dung');
            $t->unsignedSmallInteger('trang_nguon')->nullable();
            $t->unsignedInteger('thu_tu')->default(0);
            $t->dateTime('ngay_tao');
            $t->dateTime('ngay_cap_nhat');
            $t->unique(['ma_van_ban', 'so_dieu', 'so_khoan', 'ky_hieu_diem']);
        });
        Schema::create('tu_khoa', function (Blueprint $t) {
            $t->id('ma_tu_khoa');
            $t->string('cum_tu', 191)->unique();
            $t->json('bien_the')->nullable();
            $t->text('dinh_nghia')->nullable();
            $t->foreignId('ma_dieu_khoan_dinh_nghia')->nullable()->constrained('dieu_khoan', 'ma_dieu_khoan')->restrictOnDelete();
            $t->dateTime('ngay_tao');
            $t->dateTime('ngay_cap_nhat');
        });
        Schema::create('dieu_khoan_tu_khoa', function (Blueprint $t) {
            $t->foreignId('ma_dieu_khoan')->constrained('dieu_khoan', 'ma_dieu_khoan')->cascadeOnDelete();
            $t->foreignId('ma_tu_khoa')->constrained('tu_khoa', 'ma_tu_khoa')->cascadeOnDelete();
            $t->primary(['ma_dieu_khoan', 'ma_tu_khoa']);
        });
        Schema::create('quy_dinh', function (Blueprint $t) {
            $t->id('ma_quy_dinh');
            $t->foreignId('ma_dieu_khoan')->constrained('dieu_khoan', 'ma_dieu_khoan')->restrictOnDelete();
            $t->enum('loai_quy_dinh', ['prohibition', 'right', 'obligation', 'authority', 'measure', 'procedure', 'effectiveness', 'other']);
            foreach (['chu_the', 'doi_tuong', 'dieu_kien', 'ngoai_le'] as $c) {
                $t->text($c)->nullable();
            }
            $t->text('hanh_vi');
            $t->text('trich_nguyen_van');
            $t->dateTime('ngay_tao');
            $t->dateTime('ngay_cap_nhat');
        });
    }
}
