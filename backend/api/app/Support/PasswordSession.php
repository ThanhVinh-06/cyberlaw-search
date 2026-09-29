<?php

namespace App\Support;

use App\Models\NguoiDung;

final class PasswordSession
{
    public static function fingerprint(NguoiDung $user): string
    {
        return hash_hmac('sha256', $user->getAuthPassword(), config('app.key'));
    }
}
