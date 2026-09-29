<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use App\Models\YeuCauDatLaiMatKhau;
use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationModelTest extends TestCase
{
    public function test_password_rehash_writes_to_vietnamese_column_without_database_access(): void
    {
        $user = $this->getMockBuilder(NguoiDung::class)->onlyMethods(['save'])->getMock();
        $password = ' Synthetic-test-password! ';
        $user->setRawAttributes(['mat_khau' => Hash::make($password)]);
        $this->assertSame('mat_khau', $user->getAuthPasswordName());
        $user->expects($this->once())->method('save')->willReturnCallback(function () use ($user, $password) {
            $this->assertArrayNotHasKey('password', $user->getAttributes());
            $this->assertTrue(Hash::check($password, $user->getAuthPassword()));
            $this->assertArrayNotHasKey('mat_khau', $user->toArray());

            return true;
        });

        $provider = new EloquentUserProvider(app('hash'), NguoiDung::class);
        $provider->rehashPasswordIfRequired($user, ['password' => $password], true);
    }

    public function test_reset_hashes_are_not_serialized(): void
    {
        $request = new YeuCauDatLaiMatKhau;
        $request->setRawAttributes([
            'ma_yeu_cau' => 1,
            'ma_xac_nhan_bam' => 'synthetic-code-hash',
            'ma_phien_bam' => 'synthetic-grant-hash',
        ]);

        $this->assertSame(['ma_yeu_cau' => 1], $request->toArray());
        $this->assertStringNotContainsString('synthetic-', $request->toJson());
    }

    public function test_role_and_account_status_cannot_be_mass_assigned(): void
    {
        $user = new NguoiDung;
        $user->fill(['ho_ten' => 'Synthetic user', 'vai_tro' => 'admin', 'trang_thai' => 'active']);

        $this->assertSame('Synthetic user', $user->ho_ten);
        $this->assertArrayNotHasKey('vai_tro', $user->getAttributes());
        $this->assertArrayNotHasKey('trang_thai', $user->getAttributes());
        $this->assertFalse($user->isAdmin());
    }
}
