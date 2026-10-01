<?php

namespace App\Http\Controllers;

use App\Models\DieuKhoan;
use App\Models\VanBan;
use App\Services\KnowledgeAdmin;
use App\Services\PublicKnowledgeSearch;
use App\Support\KnowledgePdf;
use App\Support\SafeLog;

final class PublicLibraryController extends Controller
{
    private function document(): ?VanBan
    {
        return VanBan::query()->where('so_hieu', PublicKnowledgeSearch::LAW_NUMBER)
            ->where('trang_thai', 'published')->first();
    }

    private function metadata(VanBan $document): array
    {
        $source = (string) $document->lien_ket_nguon;

        return [
            'so_hieu' => (string) $document->so_hieu,
            'tieu_de' => (string) $document->tieu_de,
            'co_quan_ban_hanh' => (string) ($document->co_quan_ban_hanh ?? ''),
            'ngay_ban_hanh' => $document->ngay_ban_hanh?->toDateString(),
            'ngay_hieu_luc' => $document->ngay_hieu_luc?->toDateString(),
            'phien_ban_noi_dung' => (int) $document->phien_ban_noi_dung,
            'source' => preg_match('~^https?://~i', $source) && filter_var($source, FILTER_VALIDATE_URL) ? $source : '',
            'pdf' => KnowledgePdf::path($document) !== null,
        ];
    }

    public function index(KnowledgeAdmin $knowledge)
    {
        // Use the same lock/transaction as publication and edits, so metadata
        // and contents describe one revision even during an admin update.
        $data = $knowledge->serialized(function () {
            $document = $this->document();
            if (! $document) {
                return ['document' => null, 'articles' => []];
            }
            $rows = DieuKhoan::where('ma_van_ban', $document->getKey())
                ->orderBy('thu_tu')->orderBy('ma_dieu_khoan')
                ->limit(5001)->get(['so_dieu', 'chuong', 'tieu_de']);
            abort_if($rows->count() > 5000, 503);

            return [
                'document' => $this->metadata($document),
                'articles' => $rows->unique('so_dieu')->map(fn ($row) => [
                    'so_dieu' => (string) $row->so_dieu,
                    'chuong' => (string) ($row->chuong ?? ''),
                    'tieu_de' => (string) $row->tieu_de,
                ])->values()->all(),
            ];
        });
        $this->log('public.library.completed');

        return response()->json($data)->header('Cache-Control', 'private, no-store');
    }

    public function article(KnowledgeAdmin $knowledge, string $number)
    {
        $data = $knowledge->serialized(function () use ($number) {
            $document = $this->document();
            abort_unless($document, 404);
            $rows = DieuKhoan::where('ma_van_ban', $document->getKey())
                ->where('so_dieu', $number)->orderBy('thu_tu')->orderBy('ma_dieu_khoan')
                ->limit(1001)->get();
            abort_if($rows->isEmpty(), 404);
            abort_if($rows->count() > 1000, 503);

            return [
                'document' => $this->metadata($document),
                'so_dieu' => $number,
                'tieu_de' => (string) $rows->first()->tieu_de,
                'units' => $rows->map(fn ($row) => [
                    'id' => (string) $row->getKey(),
                    'so_khoan' => (string) $row->so_khoan,
                    'ky_hieu_diem' => (string) $row->ky_hieu_diem,
                    'noi_dung' => (string) $row->noi_dung,
                    'trang_nguon' => $row->trang_nguon,
                ])->all(),
            ];
        });
        $this->log('public.library.article.completed');

        return response()->json($data)->header('Cache-Control', 'private, no-store');
    }

    public function pdf(KnowledgeAdmin $knowledge)
    {
        return $knowledge->serialized(function () {
            $document = $this->document();
            abort_unless($document, 404);
            $response = KnowledgePdf::download($document);
            $this->log('public.library.pdf.completed');

            return $response;
        });
    }

    private function log(string $event): void
    {
        SafeLog::write('application', $event, 'success', [
            'request_id' => request()->attributes->get('request_id'),
            'route' => request()->route()?->getName(),
        ]);
    }
}
