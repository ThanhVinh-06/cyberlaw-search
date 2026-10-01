<?php

namespace App\Http\Controllers;

use App\Models\TuKhoa;
use App\Services\KnowledgeAdmin;
use App\Services\PublicKnowledgeSearch;
use App\Support\SafeLog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class PublicTermsController extends Controller
{
    public function index(Request $request, KnowledgeAdmin $knowledge, PublicKnowledgeSearch $search)
    {
        $input = $request->validate([
            'q' => 'nullable|string|max:120',
            'page' => 'nullable|integer|min:1|max:1000',
        ]);
        $page = (int) ($input['page'] ?? 1);
        $normalize = fn (string $value) => mb_strtolower(Str::ascii(trim($value)));
        $needle = $normalize($input['q'] ?? '');
        $data = $knowledge->serialized(function () use ($search, $page, $normalize, $needle) {
            $rows = TuKhoa::query()
                ->join('dieu_khoan', 'dieu_khoan.ma_dieu_khoan', '=', 'tu_khoa.ma_dieu_khoan_dinh_nghia')
                ->join('van_ban', 'van_ban.ma_van_ban', '=', 'dieu_khoan.ma_van_ban')
                ->where('van_ban.so_hieu', PublicKnowledgeSearch::LAW_NUMBER)
                ->where('van_ban.trang_thai', 'published')
                ->orderBy('tu_khoa.cum_tu')->orderBy('tu_khoa.ma_tu_khoa')
                ->limit(5001)->get('tu_khoa.*');
            abort_if($rows->count() > 5000, 503);
            if ($needle !== '') {
                $rows = $rows->filter(fn ($row) => str_contains($normalize(
                    $row->cum_tu.' '.implode(' ', $row->bien_the ?? []).' '.($row->dinh_nghia ?? '')
                ), $needle));
            }
            return [
                'items' => $rows->slice(($page - 1) * 12, 12)->map(fn ($row) => [
                    'id' => (string) $row->ma_tu_khoa,
                    'cum_tu' => $row->cum_tu,
                    'bien_the' => $row->bien_the ?? [],
                    'dinh_nghia' => $row->dinh_nghia ?? '',
                    'article' => $search->detail((int) $row->ma_dieu_khoan_dinh_nghia),
                ])->values()->all(),
                'total' => $rows->count(), 'page' => $page, 'per_page' => 12,
            ];
        });
        SafeLog::write('application', 'public.terms.completed', 'success', [
            'request_id' => $request->attributes->get('request_id'),
            'route' => $request->route()?->getName(),
        ]);
        return response()->json($data)->header('Cache-Control', 'private, no-store');
    }
}
