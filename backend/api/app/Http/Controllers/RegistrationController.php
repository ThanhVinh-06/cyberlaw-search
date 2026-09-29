<?php

namespace App\Http\Controllers;

use App\Models\NguoiDung;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RegistrationController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        if ($request->user()) {
            return response()->json(['code' => 'already_authenticated', 'message' => 'Bạn hãy đăng xuất trước khi tạo tài khoản mới.'], 409);
        }
        $validator = Validator::make($request->only(['name', 'email', 'password', 'password_confirmation']), [
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:191'],
            'password' => ['required', 'string', 'min:8', 'max:72', 'confirmed', function ($attribute, $value, $fail) {
                if (is_string($value) && (strlen($value) > 72 || str_contains($value, "\0"))) {
                    $fail('Mật khẩu tối đa 72 byte và không chứa ký tự null.');
                }
            }],
            'password_confirmation' => ['required', 'string', 'max:72'],
        ]);
        if ($validator->fails()) {
            $request->attributes->set('auth_reason', 'invalid_registration');

            return response()->json(['message' => 'Bạn hãy kiểm tra lại thông tin đăng ký.'], 422);
        }
        $data = $validator->validated();
        try {
            // One INSERT, protected against simultaneous duplicates by the existing UNIQUE email index.
            // Never mass-assign the payload or accept role/status/IDs from a browser.
            $user = new NguoiDung([
                'ho_ten' => trim($data['name']),
                'thu_dien_tu' => mb_strtolower(trim($data['email'])),
                'mat_khau' => $data['password'],
            ]);
            $user->vai_tro = 'user';
            $user->trang_thai = 'active';
            $user->save();
        } catch (UniqueConstraintViolationException) {
            $request->attributes->set('auth_reason', 'registration_conflict');

            return response()->json(['code' => 'registration_conflict', 'message' => 'Không thể đăng ký với email này. Bạn hãy thử đăng nhập hoặc dùng email khác.'], 409);
        }
        $request->attributes->set('auth_actor', ['ma_nguoi_dung' => $user->getKey(), 'vai_tro' => 'user']);

        // Registration does not replace a session or automatically sign in.
        return response()->json(['message' => 'Tạo tài khoản thành công. Bạn hãy đăng nhập.'], 201);
    }
}
