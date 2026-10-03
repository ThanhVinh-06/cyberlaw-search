<?php

namespace App\Http\Controllers;

use App\Support\SafeLog;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

final class AdminStatisticsController extends Controller
{
    public function overview(Request $request)
    {
        $period = $request->validate(['period' => ['sometimes', Rule::in(['year', '6m', '30d'])]])['period'] ?? 'year';
        $today = CarbonImmutable::now(config('app.timezone'))->startOfDay();
        $end = $today->addDay();
        $start = match ($period) {
            '30d' => $today->subDays(29),
            '6m' => $today->startOfMonth()->subMonths(5),
            default => $today->startOfYear(),
        };
        $docs = DB::table('van_ban')->where('so_hieu', '116/2025/QH15')->where('trang_thai', 'published');
        $clauses = DB::table('dieu_khoan')->whereIn('ma_van_ban', (clone $docs)->select('ma_van_ban'));
        $rules = DB::table('quy_dinh')->whereIn('ma_dieu_khoan', (clone $clauses)->select('ma_dieu_khoan'));
        $answers = DB::table('tin_nhan')->where('nguoi_gui', 'assistant')->where('ngay_tao', '>=', $start)->where('ngay_tao', '<', $end);
        $total = (clone $answers)->count();
        // Guest answers are part of the same system-wide figures; this is the guest-only slice.
        $guestAnswers = (clone $answers)->whereIn('ma_hoi_thoai',
            DB::table('hoi_thoai')->whereNull('ma_nguoi_dung')->select('ma_hoi_thoai'))->count();
        $cited = (clone $answers)->whereExists(fn ($q) => $q->selectRaw('1')->from('trich_dan')->whereColumn('trich_dan.ma_tin_nhan', 'tin_nhan.ma_tin_nhan'))->count();
        $buckets = [];
        if ($period === '30d') {
            $weekSpans = [
                ['label' => 'Tuần 1', 'days' => 7],
                ['label' => 'Tuần 2', 'days' => 7],
                ['label' => 'Tuần 3', 'days' => 7],
                ['label' => 'Tuần 4', 'days' => 9],
            ];
            $cursor = $start;
            foreach ($weekSpans as $index => $span) {
                $wStart = $cursor;
                $wStop = $index === 3 ? $end : $cursor->addDays($span['days']);
                $cursor = $wStop;
                $bucket = (clone $answers)->where('ngay_tao', '>=', $wStart)->where('ngay_tao', '<', $wStop);
                $dStart = $wStart->format('d/m');
                $dEnd = $wStop->subDay()->format('d/m');
                $buckets[] = [
                    'thang' => $span['label'],
                    'ten_thang' => "{$span['label']} ({$dStart} – {$dEnd})",
                    'hoi_dap' => $bucket->count(),
                    'tra_cuu' => null,
                    'trich_dan' => DB::table('trich_dan')->whereIn('ma_tin_nhan', (clone $bucket)->select('ma_tin_nhan'))->count(),
                ];
            }
        } elseif ($period === '6m') {
            for ($i = 0; $i < 3; $i++) {
                $pStart = $start->addMonths($i * 2);
                $pStop = $pStart->addMonths(2)->min($end);
                $bucket = (clone $answers)->where('ngay_tao', '>=', $pStart)->where('ngay_tao', '<', $pStop);
                $m1 = $pStart->month;
                $m2 = $pStart->addMonth()->month;
                $y = $pStart->addMonth()->year;
                $buckets[] = [
                    'thang' => sprintf('T%02d-%02d', $m1, $m2),
                    'ten_thang' => sprintf('Tháng %02d – %02d/%d', $m1, $m2, $y),
                    'hoi_dap' => $bucket->count(),
                    'tra_cuu' => null,
                    'trich_dan' => DB::table('trich_dan')->whereIn('ma_tin_nhan', (clone $bucket)->select('ma_tin_nhan'))->count(),
                ];
            }
        } else {
            for ($i = 0; $i < 6; $i++) {
                $pStart = $start->addMonths($i * 2);
                $pStop = $pStart->addMonths(2);
                $stop = $pStop->min($end);
                $bucket = $pStart->gte($end) ? null : (clone $answers)->where('ngay_tao', '>=', $pStart)->where('ngay_tao', '<', $stop);
                $m1 = $pStart->month;
                $m2 = $pStart->addMonth()->month;
                $y = $pStart->year;
                $buckets[] = [
                    'thang' => sprintf('T%02d-%02d', $m1, $m2),
                    'ten_thang' => sprintf('Tháng %02d – %02d/%d', $m1, $m2, $y),
                    'hoi_dap' => $bucket ? $bucket->count() : 0,
                    'tra_cuu' => null,
                    'trich_dan' => $bucket ? DB::table('trich_dan')->whereIn('ma_tin_nhan', (clone $bucket)->select('ma_tin_nhan'))->count() : 0,
                ];
            }
        }
        $labels = [
            'prohibition' => ['Hành vi bị nghiêm cấm', '#800020'],
            'right' => ['Quyền & Lợi ích hợp pháp', '#059669'],
            'obligation' => ['Trách nhiệm & Nghĩa vụ', '#d97706'],
            'authority' => ['Thẩm quyền', '#0284c7'],
            'measure' => ['Biện pháp', '#7c3aed'], 'procedure' => ['Thủ tục', '#9333ea'],
            'effectiveness' => ['Hiệu lực', '#475569'], 'other' => ['Quy định khác', '#6b7280'],
        ];
        $groups = [];
        $dates = [];
        for ($i = 6; $i >= 0; $i--) $dates[] = $today->subDays($i);
        foreach ($labels as $kind => [$label, $color]) {
            $query = (clone $rules)->where('loai_quy_dinh', $kind);
            $count = (clone $query)->count();
            if ($count === 0 && !in_array($kind, ['prohibition','right','obligation','authority'])) continue;
            $groups[] = ['ma_loai' => $kind, 'ten_loai' => $label, 'so_luong' => $count,
                'ti_le' => 'Bản ghi hiện còn, theo ngày tạo', 'mau_sac' => $color, 'bg_nhe' => $color.'14',
                'sparkline' => array_map(fn ($date) => (clone $query)->where('ngay_tao', '<', $date->addDay())->count(), $dates)];
        }
        $top = DB::table('tin_nhan AS t')->join('hoi_thoai AS h', 'h.ma_hoi_thoai', '=', 't.ma_hoi_thoai')
            // Left join so guest threads (ma_nguoi_dung IS NULL) still become one labelled row.
            ->leftJoin('nguoi_dung AS u', 'u.ma_nguoi_dung', '=', 'h.ma_nguoi_dung')
            ->where('t.nguoi_gui', 'user')->where('t.ngay_tao', '>=', $start)->where('t.ngay_tao', '<', $end)
            ->groupBy('u.ma_nguoi_dung', 'u.ho_ten', 'u.vai_tro')->orderByDesc('total')->orderBy('u.ma_nguoi_dung')
            ->limit(5)->get(['u.ma_nguoi_dung', 'u.ho_ten', 'u.vai_tro', DB::raw('COUNT(*) AS total')])
            ->map(fn ($u) => ['ma_nguoi_dung' => (int) ($u->ma_nguoi_dung ?? 0), 'ho_ten' => $u->ho_ten ?? 'Khách vãng lai',
                'avatar' => $u->ho_ten ? mb_substr($u->ho_ten, 0, 1) : 'KV', 'email' => '', 'so_cuoc_hoi' => (int) $u->total,
                'vai_tro_nhan' => match (true) { $u->vai_tro === 'admin' => 'Quản trị viên', $u->vai_tro === null => 'Không đăng nhập', default => 'Người dùng' },
                'trang_thai' => 'offline'])->all();
        $result = [
            'period' => $period, 'year' => $today->year, 'range' => $start->format('d/m/Y').' – '.$today->format('d/m/Y'),
            'search_available' => false, 'regulation_dates' => array_map(fn ($date) => $date->format('d/m'), $dates),
            'overview' => [
                'tong_nguoi_dung' => DB::table('nguoi_dung')->count(), 'tang_truong_nguoi_dung' => 'Tổng tài khoản hiện có',
                'tong_dieu_khoan' => (clone $clauses)->count(), 'tong_van_ban' => (clone $docs)->count(),
                'tong_quy_dinh' => (clone $rules)->count(), 'tang_truong_quy_dinh' => 'Luật 116/2025/QH15 đã công bố',
                'tong_cuoc_hoi_dap' => $total, 'tang_truong_hoi_dap' => 'Phản hồi đã lưu trong kỳ',
                'hoi_dap_khach' => $guestAnswers,
                'so_bang' => count(Schema::getTableListing()),
            ],
            'months' => $buckets, 'regulations' => $groups, 'top_users' => $top,
            // Aggregates above are system-wide, guests included. Guest message bodies are shown to
            // admins by product decision (see docs/security/reviews/2026-10-02-khach-vang-lai-chat.md);
            // registered users' message bodies remain owner-only.
            'recent_questions' => $this->recentQuestions($request, $start, $end),
            'citation_rates' => [
                ['nhom' => 'Có trích dẫn', 'ti_le' => $total ? round(100 * $cited / $total, 1) : 0, 'mau_sac' => '#059669', 'so_luot' => (string) $cited, 'mo_ta' => 'Có bản lưu căn cứ'],
                ['nhom' => 'Không có trích dẫn', 'ti_le' => $total ? round(100 * ($total - $cited) / $total, 1) : 0, 'mau_sac' => '#d97706', 'so_luot' => (string) ($total - $cited), 'mo_ta' => 'Chưa có bản lưu căn cứ'],
            ],
        ];
        SafeLog::write('audit', 'admin.statistics.viewed', 'success', ['request_id' => $request->attributes->get('request_id'), 'actor_id' => $request->user()->getKey(), 'route' => 'admin.statistics.overview']);
        return response()->json($result);
    }

    private function recentQuestions(Request $request, $start, $end): array
    {
        $messages = DB::table('tin_nhan AS a')->join('hoi_thoai AS h', 'h.ma_hoi_thoai', '=', 'a.ma_hoi_thoai')
            // This admin's own threads plus guest threads; never another account's messages.
            ->where(fn ($w) => $w->where('h.ma_nguoi_dung', $request->user()->getKey())->orWhereNull('h.ma_nguoi_dung'))
            ->where('a.nguoi_gui', 'assistant')
            ->where('a.ngay_tao', '>=', $start)->where('a.ngay_tao', '<', $end)
            ->orderByDesc('a.ma_tin_nhan')->limit(5)
            ->select('a.ma_tin_nhan','a.ma_hoi_thoai','a.ngay_tao','a.do_tin_cay','a.thoi_gian_xu_ly_ms','h.ma_nguoi_dung')
            ->selectRaw('SUBSTR(a.noi_dung, 1, 16000) AS noi_dung')->get();
        return $messages->map(function ($a) use ($request) {
            $question = DB::table('tin_nhan')->where('ma_hoi_thoai', $a->ma_hoi_thoai)->where('nguoi_gui', 'user')
                ->where('ma_tin_nhan', '<', $a->ma_tin_nhan)->orderByDesc('ma_tin_nhan')->selectRaw('SUBSTR(noi_dung, 1, 1000) AS text')->first();
            $citations = DB::table('trich_dan')->where('ma_tin_nhan', $a->ma_tin_nhan)->orderBy('thu_tu_trich_dan')->limit(4)
                ->select('so_hieu','so_dieu','so_khoan','ky_hieu_diem','phien_ban_noi_dung','trang_nguon')
                ->selectRaw('SUBSTR(noi_dung_trich_dan, 1, 16000) AS text')->get();
            $label = fn ($c) => $c->so_hieu.' · Điều '.$c->so_dieu.($c->so_khoan ? ' khoản '.$c->so_khoan : '').($c->ky_hieu_diem ? ' điểm '.$c->ky_hieu_diem : '');
            $isGuest = $a->ma_nguoi_dung === null;
            return ['ma_tin_nhan' => (int) $a->ma_tin_nhan, 'nguoi_gui' => $isGuest ? 'Khách vãng lai' : $request->user()->ho_ten,
                'avatar' => $isGuest ? 'KV' : 'AD',
                'cau_hoi' => $question->text ?? 'Không còn câu hỏi gốc', 'tra_loi_ai' => $a->noi_dung,
                'dieu_khoan_trich_dan' => $citations->map($label)->join('; ') ?: 'Chưa có trích dẫn',
                'trich_doan_luat' => $citations->map(fn ($c) => $label($c).' · Phiên bản '.$c->phien_ban_noi_dung.' · Trang '.($c->trang_nguon ?? '—')."\n".$c->text)->join("\n\n") ?: 'Phản hồi này không có căn cứ được lưu.',
                'thoi_gian' => $a->ngay_tao, 'vai_tro' => $isGuest ? 'Không đăng nhập' : 'Của bạn',
                'do_tin_cay' => $this->confidenceLabel($a->do_tin_cay),
                'thoi_gian_xu_ly' => $this->durationLabel($a->thoi_gian_xu_ly_ms),
                'confidence_note' => 'Điểm bằng chứng truy hồi, không phải độ chính xác pháp lý',
                'loai_quy_dinh' => 'Bản lưu khi trả lời', 'dieu_so' => 0];
        })->all();
    }

    /** Retrieval-evidence score (0-100) stored per assistant message; null when there was no basis. */
    private function confidenceLabel($value): string
    {
        return $value === null ? 'Chưa đánh giá' : round((float) $value, 1).'%';
    }

    private function durationLabel($value): string
    {
        return $value === null ? 'Chưa ghi nhận' : round((int) $value / 1000, 2).'s';
    }
}
