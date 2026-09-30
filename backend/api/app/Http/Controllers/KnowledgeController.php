<?php

namespace App\Http\Controllers;

use App\Models\VanBan;
use App\Services\KnowledgeAdmin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class KnowledgeController extends Controller
{
    public function index(KnowledgeAdmin $knowledge)
    {
        return response()->json($knowledge->serialized(fn () => $knowledge->snapshot()));
    }

    public function listing(Request $request, KnowledgeAdmin $knowledge, string $table)
    {
        abort_unless(isset(KnowledgeAdmin::MODELS[$table]), 404);
        $input = $request->validate(['q' => 'nullable|string|max:120', 'document' => 'nullable|integer|min:1', 'type' => 'nullable|string|max:30', 'page' => 'nullable|integer|min:1|max:1000']);
        $data = $knowledge->serialized(fn () => $knowledge->snapshot());
        $clauses = collect($data['dieu_khoan'])->keyBy('ma_dieu_khoan');
        $documents = collect($data['van_ban'])->keyBy('ma_van_ban');
        $needle = Str::lower(Str::ascii(trim($input['q'] ?? '')));
        $rows = array_values(array_filter($data[$table], function ($row) use ($input, $data, $clauses, $documents, $needle) {
            $ids = [];
            if (isset($row['ma_van_ban'])) {
                $ids[] = $row['ma_van_ban'];
            } elseif (isset($row['ma_quy_dinh'])) {
                $ids[] = $clauses->get($row['ma_dieu_khoan'])['ma_van_ban'] ?? 0;
            } else {
                foreach ($data['dieu_khoan_tu_khoa'] as $link) {
                    if ($link->ma_tu_khoa === $row['ma_tu_khoa']) {
                        $ids[] = $clauses->get($link->ma_dieu_khoan)['ma_van_ban'] ?? 0;
                    }
                }
                $ids[] = $clauses->get($row['ma_dieu_khoan_dinh_nghia'])['ma_van_ban'] ?? 0;
            }
            if (isset($input['document']) && ! in_array((int) $input['document'], $ids)) {
                return false;
            }
            $type = $input['type'] ?? '';
            if ($type && isset($row['trang_thai']) && $row['trang_thai'] !== $type) {
                return false;
            }
            if ($type && isset($row['loai_quy_dinh']) && $row['loai_quy_dinh'] !== $type) {
                return false;
            }
            if ($type && array_key_exists('dinh_nghia', $row) && (($type === 'defined') !== (bool) $row['dinh_nghia'])) {
                return false;
            }
            $text = json_encode($row, JSON_UNESCAPED_UNICODE);
            foreach (array_unique($ids) as $id) {
                $text .= ' '.json_encode($documents->get($id), JSON_UNESCAPED_UNICODE);
            }
            if (isset($row['so_dieu'])) {
                $text .= ' Điều '.$row['so_dieu'].' Khoản '.$row['so_khoan'].' Điểm '.$row['ky_hieu_diem'];
            }

            return str_contains(Str::lower(Str::ascii($text)), $needle);
        }));
        $page = min((int) ($input['page'] ?? 1), max(1, (int) ceil(count($rows) / 6)));

        return response()->json(['items' => array_slice($rows, ($page - 1) * 6, 6), 'total' => count($rows), 'page' => $page, 'revision' => $data['revision']]);
    }

    public function write(Request $request, KnowledgeAdmin $knowledge, string $table, ?int $id = null)
    {
        return response()->json($knowledge->mutate($request, $table, $id, $id ? 'update' : 'create'), $id ? 200 : 201);
    }

    public function destroy(Request $request, KnowledgeAdmin $knowledge, string $table, int $id)
    {
        return response()->json($knowledge->mutate($request, $table, $id, 'delete'));
    }

    public function status(Request $request, KnowledgeAdmin $knowledge, int $id)
    {
        return response()->json($knowledge->mutate($request, 'van_ban', $id, 'status'));
    }

    public function pdf(int $id)
    {
        $document = VanBan::findOrFail($id);
        $relative = $document->duong_dan_tep;
        abort_unless(is_string($relative) && $relative !== '', 404);
        if (preg_match('~^knowledge/[A-Za-z0-9]+\.pdf$~D', $relative)) {
            $path = Storage::disk('local')->path($relative);
        } elseif ($relative === 'data/raw/laws/2025/official/116-2025-qh15-congbao.pdf') {
            $path = base_path('../../'.$relative);
        } else {
            abort(404);
        }
        abort_unless(is_file($path), 404);

        // Untrusted PDFs are downloaded, never embedded with the application's origin.
        return response()->download($path, 'van-ban-'.$id.'.pdf', [
            'Content-Type' => 'application/pdf', 'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "sandbox; default-src 'none'",
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
