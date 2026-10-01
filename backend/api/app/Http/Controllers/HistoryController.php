<?php

namespace App\Http\Controllers;

use App\Models\HoiThoai;
use App\Models\TinNhan;
use App\Models\TrichDan;
use App\Support\SafeLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class HistoryController extends Controller
{
    private function owned(Request $request)
    {
        // No admin bypass: ownership is required for every read and delete.
        return HoiThoai::where('ma_nguoi_dung', $request->user()->getKey());
    }

    private function log(Request $request, string $event, ?string $id = null): void
    {
        SafeLog::write($event === 'deleted' ? 'audit' : 'application', 'history.'.$event, 'success', [
            'request_id' => $request->attributes->get('request_id'),
            'route' => $request->route()?->getName(), 'actor_id' => $request->user()->getKey(),
            'target_type' => 'hoi_thoai', 'target_id' => $id,
        ]);
    }

    public function index(Request $request)
    {
        $input = $request->validate(['page' => 'nullable|integer|min:1|max:10000']);
        $page = (int) ($input['page'] ?? 1);
        $rows = $this->owned($request)->orderByDesc('ngay_cap_nhat')->orderByDesc('ma_hoi_thoai')
            ->paginate(12, ['ma_hoi_thoai', 'tieu_de', 'ngay_cap_nhat'], 'page', $page);
        $this->log($request, 'listed');
        return response()->json([
            'items' => $rows->map(fn ($row) => ['id' => (string) $row->getKey(), 'title' => $row->tieu_de, 'updated_at' => $row->ngay_cap_nhat?->toISOString()]),
            'page' => $page, 'total' => $rows->total(), 'per_page' => 12,
        ])->header('Cache-Control', 'private, no-store');
    }

    public function show(Request $request, string $id)
    {
        $input = $request->validate(['page' => 'nullable|integer|min:1|max:10000']);
        $page = (int) ($input['page'] ?? 1);
        $data = DB::transaction(function () use ($request, $id, $page) {
            $thread = $this->owned($request)->whereKey($id)->sharedLock()->firstOrFail();
            $messages = TinNhan::where('ma_hoi_thoai', $thread->getKey())->orderBy('ma_tin_nhan')
                ->paginate(20, ['ma_tin_nhan', 'nguoi_gui', 'noi_dung', 'trang_thai_tra_loi', 'ngay_tao'], 'page', $page);
            $citations = TrichDan::whereIn('ma_tin_nhan', $messages->pluck('ma_tin_nhan'))
                ->orderBy('thu_tu_trich_dan')->limit(1001)->get();
            abort_if($citations->count() > 1000, 503);
            $citations = $citations->groupBy('ma_tin_nhan');
            return ['id' => (string) $thread->getKey(), 'title' => $thread->tieu_de,
                'page' => $page, 'total' => $messages->total(), 'per_page' => 20,
                'messages' => $messages->map(fn ($message) => [
                    'id' => (string) $message->getKey(), 'role' => $message->nguoi_gui, 'text' => $message->noi_dung,
                    'status' => $message->trang_thai_tra_loi, 'created_at' => $message->ngay_tao?->toISOString(),
                    // Historical snapshots, not silently replaced with current law text.
                    'citations' => ($citations->get($message->getKey()) ?? collect())->map(function ($c) {
                        $url = (string) $c->lien_ket_nguon;
                        return ['id' => (string) $c->getKey(), 'law' => $c->so_hieu, 'title' => $c->tieu_de_van_ban,
                            'version' => (int) $c->phien_ban_noi_dung, 'article' => $c->so_dieu,
                            'clause' => $c->so_khoan, 'point' => $c->ky_hieu_diem, 'text' => $c->noi_dung_trich_dan,
                            'source' => preg_match('~^https?://~i', $url) && filter_var($url, FILTER_VALIDATE_URL) ? $url : '',
                            'page' => $c->trang_nguon];
                    })->values(),
                ])->values(),
            ];
        });
        $this->log($request, 'viewed', $id);
        return response()->json($data)->header('Cache-Control', 'private, no-store');
    }

    public function destroy(Request $request, string $id)
    {
        DB::transaction(function () use ($request, $id) {
            $thread = $this->owned($request)->whereKey($id)->lockForUpdate()->firstOrFail();
            // Database foreign keys cascade to messages and citation snapshots.
            $thread->delete();
        });
        $this->log($request, 'deleted', $id);
        return response()->json(['deleted' => true])->header('Cache-Control', 'private, no-store');
    }
}
