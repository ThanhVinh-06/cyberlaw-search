<?php

namespace App\Console\Commands;

use App\Models\NguoiDung;
use App\Support\SafeLog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CreateAccount extends Command
{
    protected $signature = 'cyberlaw:create-account {--admin : Tao tai khoan quan tri}';

    protected $description = 'Tao tai khoan bang terminal; mat khau nhap an, khong truyen qua tham so';

    public function handle(): int
    {
        try {
            return $this->createAccount();
        } catch (\Throwable) {
            SafeLog::write('application', 'account.create_cli', 'failure', ['error_code' => 'account_create_failed']);
            $this->error('Khong tao duoc tai khoan. Hay kiem tra ket noi database va audit; khong ghi de tai khoan cu.');

            return self::FAILURE;
        }
    }

    private function createAccount(): int
    {
        if (! $this->input->isInteractive()) {
            $this->error('Hay chay trong terminal tuong tac de nhap mat khau an.');

            return self::FAILURE;
        }
        $name = trim((string) $this->ask('Ho va ten'));
        $email = mb_strtolower(trim((string) $this->ask('Email')));
        $password = $this->secret('Mat khau (12-72 byte; khong hien tren man hinh)', false);
        $confirm = $this->secret('Nhap lai mat khau', false);
        $validator = Validator::make([
            'name' => $name, 'email' => $email, 'password' => $password,
            'password_confirmation' => $confirm,
        ], [
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'email', 'max:191', 'unique:nguoi_dung,thu_dien_tu'],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
        ]);
        if ($validator->fails() || strlen((string) $password) > 72) {
            $this->error('Du lieu chua hop le: ten 2-100 ky tu, email hop le va chua ton tai, mat khau 12-72 byte va xac nhan trung khop.');

            return self::FAILURE;
        }
        DB::transaction(function () use ($name, $email, $password) {
            $user = new NguoiDung(['ho_ten' => $name, 'thu_dien_tu' => $email, 'mat_khau' => $password]);
            $user->vai_tro = $this->option('admin') ? 'admin' : 'user';
            $user->trang_thai = 'active';
            $user->save();
            DB::table('nhat_ky_quan_tri')->insert([
                'ma_nguoi_thuc_hien' => null, 'hanh_dong' => 'account.created_cli',
                'loai_doi_tuong' => 'nguoi_dung', 'ma_doi_tuong' => $user->getKey(),
                'ma_yeu_cau' => (string) Str::uuid(),
                'du_lieu_them' => json_encode(['vai_tro' => $user->vai_tro]), 'ngay_tao' => now(),
            ]);
        });
        $this->info('Da tao tai khoan. Ban co the dang nhap tren giao dien.');

        return self::SUCCESS;
    }
}
