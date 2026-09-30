<?php

namespace App\Http\Controllers;

use App\Models\NguoiDung;
use App\Support\PasswordSession;
use App\Support\SafeLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class AdminUserController extends Controller
{
    private const FIELDS = ['ma_nguoi_dung', 'ho_ten', 'thu_dien_tu', 'vai_tro', 'trang_thai', 'ngay_tao', 'ngay_cap_nhat', 'lan_dang_nhap_cuoi', 'ngay_xac_minh_email', 'duoc_mien_xac_minh_email'];

    private function revision(NguoiDung $user): string
    {
        // Opaque concurrency token; never disclose password or session revocation marker.
        return hash_hmac('sha256', json_encode($user->getRawOriginal(), JSON_THROW_ON_ERROR), config('app.key'));
    }

    private function serialize(NguoiDung $user): array
    {
        return [...$user->only(self::FIELDS), 'revision' => $this->revision($user), 'so_hoi_thoai' => (int) DB::table('hoi_thoai')->where('ma_nguoi_dung', $user->getKey())->count()];
    }

    public function index(Request $request)
    {
        $v = $request->validate(['q' => 'nullable|string|max:120', 'role' => ['nullable', Rule::in(['admin', 'user'])], 'status' => ['nullable', Rule::in(['active', 'blocked'])], 'page' => 'nullable|integer|min:1|max:100000']);
        $query = NguoiDung::query();
        if (! empty($v['q'])) {
            $q = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], trim($v['q'])).'%';
            $query->where(fn ($w) => $w->whereRaw("ho_ten LIKE ? ESCAPE '!'", [$q])->orWhereRaw("thu_dien_tu LIKE ? ESCAPE '!'", [$q]));
        }
        if (! empty($v['role'])) {
            $query->where('vai_tro', $v['role']);
        }
        if (! empty($v['status'])) {
            $query->where('trang_thai', $v['status']);
        }
        $total = $query->count();
        $page = min((int) ($v['page'] ?? 1), max(1, (int) ceil($total / 10)));
        $users = $query->orderBy('ma_nguoi_dung')->offset(($page - 1) * 10)->limit(10)->get();

        return response()->json(['users' => $users->map(fn ($u) => $this->serialize($u)), 'total' => $total, 'page' => $page, 'stats' => [
            'total' => NguoiDung::count(), 'adminCount' => NguoiDung::where('vai_tro', 'admin')->count(),
            'activeCount' => NguoiDung::where('trang_thai', 'active')->count(), 'blockedCount' => NguoiDung::where('trang_thai', 'blocked')->count(),
        ]]);
    }

    public function write(Request $request, ?int $id = null)
    {
        $data = $request->validate([
            'ho_ten' => 'required|string|min:2|max:100', 'thu_dien_tu' => 'required|string|email|max:191',
            'vai_tro' => ['required', Rule::in(['user', 'admin'])], 'trang_thai' => ['required', Rule::in(['active', 'blocked'])],
            'mat_khau' => [$id ? 'nullable' : 'required', 'string', 'min:8', 'max:72', function ($attribute, $value, $fail) {
                if (is_string($value) && (strlen($value) > 72 || str_contains($value, "\0"))) {
                    $fail('Mật khẩu tối đa 72 byte và không chứa ký tự null.');
                }
            }], 'revision' => [$id ? 'required' : 'sometimes', 'string', 'size:64'],
        ]);
        $data['thu_dien_tu'] = mb_strtolower(trim($data['thu_dien_tu']));

        return $this->mutate($request, $id, 'save', $data);
    }

    public function status(Request $request, int $id)
    {
        return $this->mutate($request, $id, 'status', $request->validate(['revision' => 'required|string|size:64', 'trang_thai' => ['required', Rule::in(['active', 'blocked'])]]));
    }

    public function destroy(Request $request, int $id)
    {
        return $this->mutate($request, $id, 'delete', $request->validate(['revision' => 'required|string|size:64']));
    }

    private function mutate(Request $request, ?int $id, string $action, array $data)
    {
        $mysql = DB::getDriverName() === 'mysql';
        if ($mysql) {
            abort_unless((int) DB::selectOne("SELECT GET_LOCK('cyberlaw_admin_users', 5) AS acquired")->acquired === 1, 409);
        }
        try {
            $result = DB::transaction(function () use ($request, $id, $action, $data) {
                // Same order on every admin mutation protects the last usable administrator.
                $admins = NguoiDung::where('vai_tro', 'admin')->orderBy('ma_nguoi_dung')->lockForUpdate()->get();
                $actor = $admins->firstWhere('ma_nguoi_dung', $request->user()->getKey());
                abort_unless($actor && $actor->isAdmin() && $actor->canUseAccount(), 403);
                abort_unless(hash_equals(PasswordSession::fingerprint($actor), (string) $request->session()->get('auth_password_fingerprint')), 401);
                $user = $id ? NguoiDung::whereKey($id)->lockForUpdate()->firstOrFail() : new NguoiDung;
                if ($id) {
                    abort_unless(hash_equals($this->revision($user), $data['revision']), 409);
                }
                $oldRole = $user->vai_tro;
                $oldStatus = $user->trang_thai;
                $emailChanged = $id && isset($data['thu_dien_tu']) && $user->thu_dien_tu !== $data['thu_dien_tu'];
                $newRole = $data['vai_tro'] ?? $user->vai_tro;
                $newStatus = $data['trang_thai'] ?? $user->trang_thai;
                $sensitive = $action === 'delete' || $emailChanged || $newRole !== $oldRole || $newStatus !== $oldStatus || ! empty($data['mat_khau']);
                if ($id === $actor->getKey() && $sensitive) {
                    $this->invalid('tai_khoan', 'Bạn không thể khóa, xóa hoặc đổi thông tin truy cập của chính mình ở trang quản trị. Đổi mật khẩu qua chức năng quên mật khẩu.');
                }
                if ($id && $user->isAdmin() && $user->canUseAccount() && ($action === 'delete' || $emailChanged || $newRole !== 'admin' || $newStatus !== 'active')) {
                    if ($admins->filter(fn ($a) => $a->isAdmin() && $a->canUseAccount() && $a->getKey() !== $id)->isEmpty()) {
                        $this->invalid('vai_tro', 'Không thể khóa, xóa hoặc hạ quyền quản trị viên hoạt động cuối cùng.');
                    }
                }
                if ($action === 'delete') {
                    if (DB::table('hoi_thoai')->where('ma_nguoi_dung', $id)->exists() || DB::table('nhat_ky_quan_tri')->where('ma_nguoi_thuc_hien', $id)->exists()) {
                        $this->invalid('tai_khoan', 'Tài khoản có lịch sử hoặc nhật ký quản trị. Bạn khóa tài khoản để giữ dữ liệu thay vì xóa nhé.');
                    }
                    $user->delete();
                } else {
                    if ($action === 'save') {
                        if (NguoiDung::where('thu_dien_tu', $data['thu_dien_tu'])->when($id, fn ($q) => $q->where('ma_nguoi_dung', '!=', $id))->exists()) {
                            $this->invalid('thu_dien_tu', 'Email này đã được sử dụng.');
                        }
                        $user->ho_ten = trim($data['ho_ten']);
                        $user->thu_dien_tu = $data['thu_dien_tu'];
                        if (! empty($data['mat_khau'])) {
                            $user->mat_khau = $data['mat_khau'];
                        }
                        $user->vai_tro = $data['vai_tro'];
                        if (! $id || $emailChanged) {
                            $user->ngay_xac_minh_email = null;
                            $user->duoc_mien_xac_minh_email = false;
                        }
                    }
                    $user->trang_thai = $data['trang_thai'];
                    if ($id && $sensitive) {
                        $user->ma_ghi_nho = Str::random(60);
                    }
                    $user->save();
                }
                if ($id && $sensitive && $action !== 'delete') {
                    foreach (['yeu_cau_dat_lai_mat_khau', 'yeu_cau_xac_minh_email'] as $table) {
                        DB::table($table)->where('ma_nguoi_dung', $id)->whereNull('ngay_su_dung')->whereNull('ngay_huy')->update(['ngay_huy' => now()]);
                    }
                }
                $target = $user->getKey();
                DB::table('nhat_ky_quan_tri')->insert([
                    'ma_nguoi_thuc_hien' => $actor->getKey(), 'hanh_dong' => 'admin.user.'.$action, 'loai_doi_tuong' => 'nguoi_dung',
                    'ma_doi_tuong' => $target, 'ma_yeu_cau' => $request->attributes->get('request_id'),
                    'du_lieu_them' => json_encode(['vai_tro_cu' => $oldRole, 'vai_tro_moi' => $newRole, 'trang_thai_cu' => $oldStatus, 'trang_thai_moi' => $newStatus, 'doi_email' => (bool) $emailChanged, 'doi_mat_khau' => ! empty($data['mat_khau'])]), 'ngay_tao' => now(),
                ]);

                return ['message' => $action === 'delete' ? 'Đã xóa tài khoản.' : 'Đã lưu tài khoản.', 'id' => $target];
            });
        } finally {
            if ($mysql) {
                DB::selectOne("SELECT RELEASE_LOCK('cyberlaw_admin_users') AS released");
            }
        }
        SafeLog::write('audit', 'admin.user.'.$action, 'success', ['actor_id' => $request->user()->getKey(), 'target_id' => $result['id'], 'target_type' => 'nguoi_dung', 'request_id' => $request->attributes->get('request_id')]);

        return response()->json($result, $id ? 200 : 201);
    }

    private function invalid(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
