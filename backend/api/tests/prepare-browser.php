<?php

use App\Models\NguoiDung;
use Illuminate\Contracts\Console\Kernel;
use Tests\Support\AccountSchema;

// Called only by the browser-test launcher with a dedicated SQLite file under storage.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$expected = str_replace('\\', '/', storage_path('framework/testing/auth-browser.sqlite'));
$actual = str_replace('\\', '/', (string) config('database.connections.sqlite.database'));
if (config('database.default') !== 'sqlite' || $actual !== $expected) {
    throw new RuntimeException('Refusing to prepare a database outside the isolated browser fixture.');
}
AccountSchema::create();
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
