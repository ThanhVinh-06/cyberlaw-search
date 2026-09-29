<?php

namespace App\Http\Controllers;

use App\Services\EmailVerification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class EmailVerificationController extends Controller
{
    public function status(Request $request, EmailVerification $verification): JsonResponse
    {
        return response()->json($verification->status($request));
    }

    public function send(Request $request, EmailVerification $verification): JsonResponse
    {
        return response()->json($verification->send($request), 202);
    }

    public function verify(Request $request, EmailVerification $verification): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'regex:/^[0-9]{6}$/D']]);
        $result = $verification->verify($request, $data['code']);
        if ($result !== 'verified') {
            $request->attributes->set('auth_reason', $result);

            return response()->json(['code' => $result, 'message' => 'Bạn hãy kiểm tra mã xác nhận hoặc gửi mã mới.'], 422);
        }
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Xác minh email thành công. Bạn hãy đăng nhập để tiếp tục.']);
    }
}
