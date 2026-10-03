<?php

use App\Models\NguoiDung;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\Support\KnowledgeSchema;

// Called only by the browser-test launcher with a dedicated SQLite file under storage.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$expected = str_replace('\\', '/', storage_path('framework/testing/auth-browser.sqlite'));
$actual = str_replace('\\', '/', (string) config('database.connections.sqlite.database'));
if (config('database.default') !== 'sqlite' || $actual !== $expected) {
    throw new RuntimeException('Refusing to prepare a database outside the isolated browser fixture.');
}
KnowledgeSchema::create(true);
Schema::create('hoi_thoai', function (Blueprint $t) {
    $t->id('ma_hoi_thoai');
    // Nullable mirrors production: NULL = a guest conversation (see 20261002 migration).
    $t->foreignId('ma_nguoi_dung')->nullable()->constrained('nguoi_dung', 'ma_nguoi_dung')->cascadeOnDelete();
});
Schema::create('trich_dan', function (Blueprint $t) {
    $t->id();
    $t->unsignedBigInteger('ma_dieu_khoan');
});
foreach (['admin', 'user'] as $role) {
    $user = new NguoiDung([
        'ho_ten' => 'Browser Test '.$role,
        'thu_dien_tu' => $role.'@example.test',
        'mat_khau' => 'Browser-fixture!123',
    ]);
    $user->vai_tro = $role;
    $user->trang_thai = 'active';
    $user->setAttribute('duoc_mien_xac_minh_email', true);
    $user->save();
}
echo "Isolated browser accounts ready.\n";
