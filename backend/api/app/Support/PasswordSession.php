<?php

namespace App\Support;

use App\Models\NguoiDung;

final class PasswordSession
{
    public static function fingerprint(NguoiDung $user): string
    {
        $marker = $user->getAttribute('ma_ghi_nho');

        return hash_hmac('sha256', $user->getAuthPassword().($marker ? '|'.$marker : ''), config('app.key'));
    }
}
