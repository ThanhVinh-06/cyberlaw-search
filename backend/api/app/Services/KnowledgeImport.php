<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use RuntimeException;

/** Trusted CLI only. Never use this service as a public upload endpoint. */
final class KnowledgeImport
{
    public const BUNDLE_SHA256 = 'da64cec303b01741bc4e7773e7a470dfcd636faf632040486b2e21ebca1457ad';

    public const SOURCE_SHA256 = '8e19e14fd57666baec8f16b7ca2832cbf7f24030a5e6ee0c574e15d0d48ad971';

    public function load(): array
    {
        $path = base_path('../../data/processed/luat-116-2025-v1/du-lieu-nap.json');
        $bytes = file_get_contents($path);
        if ($bytes === false) {
            throw new RuntimeException('knowledge_bundle_mismatch');
        }
        $data = $this->decodeVerified($bytes);
        $source = base_path('../../data/raw/laws/2025/official/116-2025-qh15-congbao.pdf');
        if (! hash_equals(self::SOURCE_SHA256, (string) hash_file('sha256', $source))) {
            throw new RuntimeException('knowledge_source_mismatch');
        }

        return $data;
    }

    public function decodeVerified(string $bytes): array
    {
        if (strlen($bytes) > 8_000_000 || ! hash_equals(self::BUNDLE_SHA256, hash('sha256', $bytes))) {
            throw new RuntimeException('knowledge_bundle_mismatch');
        }

        return json_decode($bytes, true, 64, JSON_THROW_ON_ERROR);
    }

    public function run(bool $apply, string $requestId): string
    {
        // File path, digest and full input shape are pinned by code review + the Python validator.
        $data = $this->load();
        $mysql = DB::connection()->getDriverName() === 'mysql';
        if (! $mysql && ! (app()->environment('testing') && DB::connection()->getDriverName() === 'sqlite')) {
            throw new RuntimeException('knowledge_database_not_supported');
        }
        if ($mysql) {
            $column = DB::selectOne("SELECT COLLATION_NAME AS collation_name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='dieu_khoan' AND COLUMN_NAME='ky_hieu_diem'");
            if (($column->collation_name ?? null) !== 'utf8mb4_0900_as_ci') {
                throw new RuntimeException('knowledge_point_collation_required');
            }
        }
        $lock = false;
        try {
            if ($mysql) {
                $lock = (int) DB::selectOne("SELECT GET_LOCK('cyberlaw_knowledge_116_v1', 0) AS acquired")->acquired === 1;
                if (! $lock) {
                    throw new RuntimeException('knowledge_import_busy');
                }
            }

            return DB::transaction(function () use ($data, $apply, $requestId) {
                $document = DB::table('van_ban')->where('so_hieu', $data['van_ban']['so_hieu'])->first();
                if ($document) {
                    $this->verifyExisting($data, (int) $document->ma_van_ban);

                    return 'unchanged';
                }
                // Never overwrite or merge previously curated definitions implicitly.
                if (DB::table('tu_khoa')->whereIn('cum_tu', array_column(array_column($data['tu_khoa'], 'du_lieu'), 'cum_tu'))->exists()) {
                    throw new RuntimeException('knowledge_keyword_conflict');
                }
                if (! $apply) {
                    return 'ready';
                }
                $time = now();
                $timestamps = ['ngay_tao' => $time, 'ngay_cap_nhat' => $time];
                $documentId = DB::table('van_ban')->insertGetId($data['van_ban'] + $timestamps, 'ma_van_ban');
                $provisions = [];
                foreach ($data['dieu_khoan'] as $row) {
                    $provisions[$row['khoa']] = DB::table('dieu_khoan')->insertGetId(
                        $row['du_lieu'] + ['ma_van_ban' => $documentId] + $timestamps, 'ma_dieu_khoan');
                }
                $keywords = [];
                foreach ($data['tu_khoa'] as $row) {
                    $fields = $this->keywordFields($row, $provisions);
                    $fields['bien_the'] = json_encode($fields['bien_the'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
                    $keywords[$row['khoa']] = DB::table('tu_khoa')->insertGetId($fields + $timestamps, 'ma_tu_khoa');
                }
                foreach (array_chunk($data['dieu_khoan_tu_khoa'], 100) as $batch) {
                    DB::table('dieu_khoan_tu_khoa')->insert(array_map(fn ($r) => [
                        'ma_dieu_khoan' => $provisions[$r['dieu_khoan']], 'ma_tu_khoa' => $keywords[$r['tu_khoa']],
                    ], $batch));
                }
                foreach ($data['quy_dinh'] as $row) {
                    DB::table('quy_dinh')->insert($row['du_lieu'] + [
                        'ma_dieu_khoan' => $provisions[$row['dieu_khoan']],
                    ] + $timestamps);
                }
                // Mandatory audit in the SAME transaction: a failure rolls back all knowledge rows.
                DB::table('nhat_ky_quan_tri')->insert([
                    'ma_nguoi_thuc_hien' => null, 'hanh_dong' => 'knowledge.import_cli',
                    'loai_doi_tuong' => 'van_ban', 'ma_doi_tuong' => $documentId,
                    'ma_yeu_cau' => $requestId, 'ngay_tao' => $time,
                    'du_lieu_them' => json_encode([
                        'bundle_sha256' => self::BUNDLE_SHA256, 'source_sha256' => self::SOURCE_SHA256,
                        'phien_ban' => $data['phien_ban'], 'trang_thai' => 'draft',
                        'dieu_khoan' => count($provisions), 'tu_khoa' => count($keywords),
                        'quy_dinh' => count($data['quy_dinh']), 'lien_ket' => count($data['dieu_khoan_tu_khoa']),
                    ], JSON_THROW_ON_ERROR),
                ]);
                $this->verifyExisting($data, $documentId);

                return 'imported';
            });
        } finally {
            if ($lock) {
                DB::select("SELECT RELEASE_LOCK('cyberlaw_knowledge_116_v1')");
            }
        }
    }

    private function keywordFields(array $row, array $provisions): array
    {
        return $row['du_lieu'] + ['ma_dieu_khoan_dinh_nghia' => $row['dieu_khoan_dinh_nghia']
            ? $provisions[$row['dieu_khoan_dinh_nghia']] : null];
    }

    private function same(object $actual, array $expected): void
    {
        foreach ($expected as $name => $value) {
            $found = $actual->{$name};
            if ($name === 'bien_the') {
                $found = json_decode($found, true, 16, JSON_THROW_ON_ERROR);
            } elseif (is_int($value)) {
                $found = (int) $found;
            }
            if ($found !== $value) {
                throw new RuntimeException('knowledge_existing_conflict');
            }
        }
    }

    private function verifyExisting(array $data, int $documentId): void
    {
        $this->same(DB::table('van_ban')->where('ma_van_ban', $documentId)->first(), $data['van_ban']);
        $rows = DB::table('dieu_khoan')->where('ma_van_ban', $documentId)->orderBy('thu_tu')->get();
        if ($rows->count() !== count($data['dieu_khoan'])) {
            throw new RuntimeException('knowledge_existing_count');
        }
        $provisions = [];
        foreach ($data['dieu_khoan'] as $i => $row) {
            $this->same($rows[$i], $row['du_lieu']);
            $provisions[$row['khoa']] = (int) $rows[$i]->ma_dieu_khoan;
        }
        $keywords = [];
        foreach ($data['tu_khoa'] as $row) {
            $found = DB::table('tu_khoa')->where('cum_tu', $row['du_lieu']['cum_tu'])->first();
            if (! $found) {
                throw new RuntimeException('knowledge_missing_keyword');
            }
            $this->same($found, $this->keywordFields($row, $provisions));
            $keywords[$row['khoa']] = (int) $found->ma_tu_khoa;
        }
        $links = DB::table('dieu_khoan_tu_khoa')->whereIn('ma_dieu_khoan', array_values($provisions))->get()
            ->map(fn ($r) => $r->ma_dieu_khoan.':'.$r->ma_tu_khoa)->all();
        $expected = array_map(fn ($r) => $provisions[$r['dieu_khoan']].':'.$keywords[$r['tu_khoa']], $data['dieu_khoan_tu_khoa']);
        sort($links);
        sort($expected);
        if ($links !== $expected) {
            throw new RuntimeException('knowledge_link_conflict');
        }
        $rules = DB::table('quy_dinh')->whereIn('ma_dieu_khoan', array_values($provisions))->get();
        if ($rules->count() !== count($data['quy_dinh']) || $rules->unique('ma_dieu_khoan')->count() !== $rules->count()) {
            throw new RuntimeException('knowledge_rule_conflict');
        }
        $rules = $rules->keyBy('ma_dieu_khoan');
        foreach ($data['quy_dinh'] as $row) {
            $this->same($rules[$provisions[$row['dieu_khoan']]], $row['du_lieu']);
        }
    }
}
