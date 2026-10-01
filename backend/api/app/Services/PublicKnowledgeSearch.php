<?php

namespace App\Services;

use App\Models\DieuKhoan;
use App\Support\SafeLog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Read-only, published knowledge surface for the public search UI. */
final class PublicKnowledgeSearch
{
    public const LAW_NUMBER = '116/2025/QH15';

    public function search(Request $request): array
    {
        $input = $request->validate([
            'q' => 'nullable|string|max:120',
            'mode' => 'nullable|in:all,title,article',
            'category' => 'nullable|in:all,general,definition,effect',
            'from' => 'nullable|date_format:Y-m-d',
            'to' => 'nullable|date_format:Y-m-d'.($request->filled('from') ? '|after_or_equal:from' : ''),
            'page' => 'nullable|integer|min:1|max:1000',
            'per_page' => 'nullable|integer|min:1|max:30',
        ]);
        $page = (int) ($input['page'] ?? 1);
        $perPage = (int) ($input['per_page'] ?? 10);
        $query = trim((string) ($input['q'] ?? ''));
        $mode = $input['mode'] ?? 'all';
        $category = $input['category'] ?? 'all';

        $builder = $this->baseQuery()
            ->when($input['from'] ?? null, fn ($q, $date) => $q->whereDate('van_ban.ngay_ban_hanh', '>=', $date))
            ->when($input['to'] ?? null, fn ($q, $date) => $q->whereDate('van_ban.ngay_ban_hanh', '<=', $date));

        if ($category === 'definition') {
            $builder->where('dieu_khoan.so_dieu', '2');
        } elseif ($category === 'effect') {
            $builder->where('dieu_khoan.so_dieu', '44');
        } elseif ($category === 'general') {
            $builder->whereNotIn('dieu_khoan.so_dieu', ['2', '44']);
        }

        $rows = collect($builder
            ->orderBy('dieu_khoan.thu_tu')
            ->orderBy('dieu_khoan.ma_dieu_khoan')
            ->get(['dieu_khoan.*', 'van_ban.so_hieu', 'van_ban.tieu_de as van_ban_tieu_de', 'van_ban.ngay_ban_hanh', 'van_ban.lien_ket_nguon as source_url']));

        if ($query !== '') {
            $needle = $this->normalize($query);
            $articleNumber = preg_match('/^(?:dieu\s*)?(\d{1,3})$/u', $needle, $match) ? (string) ((int) $match[1]) : null;
            $rows = $rows->filter(function (DieuKhoan $clause) use ($needle, $articleNumber, $mode) {
                if ($mode === 'article' || ($mode === 'all' && str_starts_with($needle, 'dieu ') && $articleNumber !== null)) {
                    return $articleNumber !== null && (string) ((int) $clause->so_dieu) === $articleNumber;
                }
                $haystack = $mode === 'title'
                    ? ($clause->tieu_de.' '.$clause->van_ban_tieu_de)
                    : ($clause->so_dieu.' '.$clause->tieu_de.' '.$clause->van_ban_tieu_de.' '.$clause->noi_dung);
                return str_contains($this->normalize($haystack), $needle);
            })->values();
        }

        $total = $rows->count();
        $items = $rows->slice(($page - 1) * $perPage, $perPage)->map(fn (DieuKhoan $clause) => $this->toDto($clause))->values()->all();
        SafeLog::write('application', 'public.search.completed', 'success', [
            'request_id' => $request->attributes->get('request_id'),
            'route' => $request->route()?->getName(),
        ]);

        return ['items' => $items, 'total' => $total, 'page' => $page, 'per_page' => $perPage, 'law' => self::LAW_NUMBER];
    }

    public function detail(int $id): array
    {
        $clause = $this->baseQuery()->where('dieu_khoan.ma_dieu_khoan', $id)->firstOrFail();
        return $this->toDto($clause);
    }

    private function baseQuery()
    {
        return DieuKhoan::query()
            ->join('van_ban', 'van_ban.ma_van_ban', '=', 'dieu_khoan.ma_van_ban')
            ->where('van_ban.trang_thai', 'published')
            ->where('van_ban.so_hieu', self::LAW_NUMBER)
            ->select('dieu_khoan.*', 'van_ban.tieu_de as van_ban_tieu_de', 'van_ban.lien_ket_nguon as source_url', 'van_ban.phien_ban_noi_dung', 'van_ban.ngay_ban_hanh', 'van_ban.co_quan_ban_hanh');
    }

    private function normalize(string $value): string
    {
        return mb_strtolower(Str::ascii(trim($value)));
    }

    private function toDto(DieuKhoan $clause): array
    {
        $title = 'Điều '.$clause->so_dieu;
        if ($clause->so_khoan !== '') {
            $title .= ' khoản '.$clause->so_khoan;
        }
        if ($clause->ky_hieu_diem !== '') {
            $title .= ' điểm '.$clause->ky_hieu_diem;
        }
        $category = ((string) $clause->so_dieu === '2') ? 'definition' : (((string) $clause->so_dieu === '44') ? 'effect' : 'general');
        $label = $category === 'definition' ? 'Khái niệm' : ($category === 'effect' ? 'Hiệu lực thi hành' : 'Quy định khác');
        $text = trim((string) $clause->noi_dung);
        return [
            'id' => (string) $clause->ma_dieu_khoan,
            'category' => $category,
            'label' => $label,
            'title' => $title.($clause->tieu_de ? '. '.$clause->tieu_de : ''),
            'summary' => Str::limit(preg_replace('/\s+/u', ' ', $text) ?: '', 240),
            'text' => $text,
            'note' => 'Luật số '.self::LAW_NUMBER.($clause->trang_nguon ? ', trang '.$clause->trang_nguon.'.' : '.'),
            'source' => preg_match('~^https?://~i', (string) $clause->source_url) && filter_var($clause->source_url, FILTER_VALIDATE_URL) ? $clause->source_url : '',
            'phien_ban_noi_dung' => (int) $clause->phien_ban_noi_dung,
            'ngay_ban_hanh' => $clause->ngay_ban_hanh,
            'co_quan_ban_hanh' => $clause->co_quan_ban_hanh,
            'so_dieu' => (string) $clause->so_dieu,
            'so_khoan' => (string) $clause->so_khoan,
        ];
    }
}
