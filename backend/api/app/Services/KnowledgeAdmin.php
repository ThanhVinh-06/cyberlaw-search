<?php

namespace App\Services;

use App\Models\DieuKhoan;
use App\Models\QuyDinh;
use App\Models\TuKhoa;
use App\Models\VanBan;
use App\Support\SafeLog;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class KnowledgeAdmin
{
    public const MODELS = ['van_ban' => VanBan::class, 'dieu_khoan' => DieuKhoan::class, 'tu_khoa' => TuKhoa::class, 'quy_dinh' => QuyDinh::class];

    // This admin editor intentionally loads a small, bounded corpus for relationship selectors.
    // Never silently truncate: the UI must not edit an incomplete relationship graph.
    public function snapshot(): array
    {
        // Bound text volume before materializing Eloquent models into memory.
        $bytes = 0;
        $textColumns = [
            'van_ban' => ['so_hieu', 'tieu_de', 'co_quan_ban_hanh', 'lien_ket_nguon', 'duong_dan_tep'],
            'dieu_khoan' => ['chuong', 'tieu_de', 'noi_dung'],
            'tu_khoa' => ['cum_tu', 'bien_the', 'dinh_nghia'],
            'quy_dinh' => ['chu_the', 'hanh_vi', 'doi_tuong', 'dieu_kien', 'ngoai_le', 'trich_nguyen_van'],
        ];
        foreach ($textColumns as $table => $columns) {
            $lengths = array_map(fn ($column) => 'COALESCE(LENGTH('.$column.'), 0)', $columns);
            $bytes += (int) DB::table($table)->selectRaw('COALESCE(SUM('.implode(' + ', $lengths).'), 0) AS bytes')->value('bytes');
            abort_if($bytes > 8 * 1024 * 1024, 413);
        }
        $data = [];
        foreach (self::MODELS as $table => $class) {
            abort_if(DB::table($table)->count() > 5000, 413);
            $data[$table] = $class::orderBy((new $class)->getKeyName())->get()->map(function (Model $row) {
                $result = $row->toArray();
                foreach ($result as $key => &$value) {
                    if (str_starts_with($key, 'ngay_') && $value) {
                        $value = substr($value, 0, str_contains($key, 'tao') || str_contains($key, 'cap_nhat') ? 19 : 10);
                    }
                    if ($value === null && ! str_starts_with($key, 'ma_') && $key !== 'trang_nguon') {
                        $value = $key === 'bien_the' ? [] : '';
                    }
                }

                return $result;
            })->all();
        }
        abort_if(DB::table('dieu_khoan_tu_khoa')->count() > 20000, 413);
        $data['dieu_khoan_tu_khoa'] = DB::table('dieu_khoan_tu_khoa')->orderBy('ma_dieu_khoan')->orderBy('ma_tu_khoa')->get()->all();
        $json = json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        abort_if(strlen($json) > 16 * 1024 * 1024, 413);

        return [...$data, 'revision' => hash('sha256', $json)];
    }

    public function serialized(Closure $work): mixed
    {
        $mysql = DB::getDriverName() === 'mysql';
        if ($mysql) {
            abort_unless((int) DB::selectOne("SELECT GET_LOCK('cyberlaw_knowledge_116_v1', 5) AS acquired")->acquired === 1, 409);
        }
        try {
            return DB::transaction($work);
        } finally {
            if ($mysql) {
                DB::selectOne("SELECT RELEASE_LOCK('cyberlaw_knowledge_116_v1') AS released");
            }
        }
    }

    public function mutate(Request $request, string $table, ?int $id, string $action): array
    {
        abort_unless(isset(self::MODELS[$table]), 404);
        $storedFile = null;
        $targetId = $id;
        try {
            $result = $this->serialized(function () use ($request, $table, $id, $action, &$storedFile, &$targetId) {
                $revision = $request->validate(['revision' => 'required|string|size:64'])['revision'];
                abort_unless(hash_equals($this->snapshot()['revision'], $revision), 409);
                $class = self::MODELS[$table];
                $row = $id ? $class::findOrFail($id) : new $class;
                $affected = $this->documentIds($table, $row);
                if ($action === 'delete') {
                    $this->guardDelete($table, $row);
                    if ($table === 'tu_khoa' || $table === 'dieu_khoan') {
                        DB::table('dieu_khoan_tu_khoa')->where($row->getKeyName(), $id)->delete();
                    }
                    $row->delete();
                } elseif ($action === 'status') {
                    abort_unless($table === 'van_ban', 404);
                    $state = $request->validate(['trang_thai' => ['required', Rule::in(['draft', 'published', 'archived'])]])['trang_thai'];
                    if ($state === 'published') {
                        $this->guardPublish($request, $row);
                    }
                    $row->trang_thai = $state;
                    $row->save();
                    $affected = []; // Status does not change the legal text version.
                } else {
                    $data = $this->validate($request, $table, $row);
                    $links = $data['lien_ket'] ?? [];
                    unset($data['lien_ket']);
                    if ($table === 'van_ban') {
                        $request->validate(['tep' => 'sometimes|required|file|mimes:pdf|extensions:pdf|max:20480']);
                        if ($request->hasFile('tep')) {
                            $file = $request->file('tep');
                            $handle = fopen($file->getRealPath(), 'rb');
                            $header = fread($handle, 5);
                            fclose($handle);
                            if ($header !== '%PDF-') {
                                $this->invalid('tep', 'Bạn chọn tệp PDF hợp lệ nhé.');
                            }
                            $storedFile = $file->store('knowledge', 'local');
                            abort_unless(is_string($storedFile) && $storedFile !== '', 503);
                            $data['duong_dan_tep'] = $storedFile;
                        } elseif ($request->boolean('xoa_tep')) {
                            $data['duong_dan_tep'] = null;
                        }
                        $data['trang_thai'] = 'draft';
                        if (! $id) {
                            $data['phien_ban_noi_dung'] = 1;
                        }
                    }
                    if ($table === 'dieu_khoan' && $id && $data['noi_dung'] !== $row->noi_dung) {
                        foreach (QuyDinh::where('ma_dieu_khoan', $id)->get() as $rule) {
                            if (! str_contains($data['noi_dung'], $rule->trich_nguyen_van)) {
                                $this->invalid('noi_dung', 'Nội dung mới làm sai trích nguyên văn của quy định liên kết. Bạn sửa hoặc gỡ quy định đó trước.');
                            }
                        }
                    }
                    $row->fill($data)->save();
                    if ($table === 'tu_khoa') {
                        DB::table('dieu_khoan_tu_khoa')->where('ma_tu_khoa', $row->getKey())->delete();
                        foreach ($links as $clauseId) {
                            DB::table('dieu_khoan_tu_khoa')->insert(['ma_tu_khoa' => $row->getKey(), 'ma_dieu_khoan' => $clauseId]);
                        }
                    }
                    $affected = array_unique([...$affected, ...$this->documentIds($table, $row)]);
                    if ($table === 'van_ban' && ! $id) {
                        $affected = [];
                    }
                }
                foreach ($affected as $documentId) {
                    $document = VanBan::find($documentId);
                    if (! $document) {
                        continue;
                    }
                    $document->phien_ban_noi_dung++;
                    if ($document->trang_thai === 'published') {
                        $document->trang_thai = 'draft';
                    }
                    $document->save();
                }
                DB::table('nhat_ky_quan_tri')->insert([
                    'ma_nguoi_thuc_hien' => $request->user()->getKey(),
                    'hanh_dong' => 'knowledge.'.$action, 'loai_doi_tuong' => $table,
                    'ma_doi_tuong' => $row->getKey(), 'ma_yeu_cau' => $request->attributes->get('request_id'),
                    'du_lieu_them' => json_encode(['van_ban_lien_quan' => array_values($affected), 'trang_thai' => $action === 'status' ? $row->trang_thai : null, 'da_doi_chieu' => $action === 'status' && $row->trang_thai === 'published']),
                    'ngay_tao' => now(),
                ]);
                $targetId = $row->getKey();

                return $this->snapshot();
            });
        } catch (\Throwable $error) {
            if ($storedFile) {
                Storage::disk('local')->delete($storedFile);
            }
            throw $error;
        }
        SafeLog::write('audit', 'knowledge.'.$action, 'success', ['request_id' => $request->attributes->get('request_id'), 'actor_id' => $request->user()->getKey(), 'target_type' => $table, 'target_id' => $targetId]);
        if ($storedFile) {
            SafeLog::write('audit', 'knowledge.upload', 'success', ['request_id' => $request->attributes->get('request_id'), 'actor_id' => $request->user()->getKey(), 'target_type' => $table, 'target_id' => $targetId]);
        }

        return $result;
    }

    private function validate(Request $request, string $table, Model $row): array
    {
        $text = ['nullable', 'string', 'max:16000']; // Fits MySQL TEXT even with 4-byte Unicode.
        $rules = match ($table) {
            'van_ban' => [
                'so_hieu' => ['required', 'string', 'max:100', Rule::unique('van_ban', 'so_hieu')->ignore($row->getKey(), 'ma_van_ban')],
                'tieu_de' => 'required|string|max:500', 'co_quan_ban_hanh' => 'nullable|string|max:255',
                'ngay_ban_hanh' => 'nullable|date_format:Y-m-d', 'ngay_hieu_luc' => 'nullable|date_format:Y-m-d',
                'ngay_het_hieu_luc' => ['nullable', 'date_format:Y-m-d', ...($request->filled('ngay_hieu_luc') ? ['after_or_equal:ngay_hieu_luc'] : [])],
                'lien_ket_nguon' => 'nullable|url:http,https|max:2048', 'xoa_tep' => 'sometimes|boolean',
            ],
            'dieu_khoan' => [
                'ma_van_ban' => 'required|integer|exists:van_ban,ma_van_ban', 'chuong' => 'nullable|string|max:100',
                'so_dieu' => 'required|string|max:10', 'so_khoan' => 'nullable|string|max:10', 'ky_hieu_diem' => 'nullable|string|max:10',
                'tieu_de' => 'nullable|string|max:500', 'noi_dung' => 'required|string|max:100000',
                'trang_nguon' => 'nullable|integer|min:1|max:65535', 'thu_tu' => 'required|integer|min:0|max:4294967295',
            ],
            'tu_khoa' => [
                'cum_tu' => ['required', 'string', 'max:191', Rule::unique('tu_khoa', 'cum_tu')->ignore($row->getKey(), 'ma_tu_khoa')],
                'bien_the' => 'present|array|max:50', 'bien_the.*' => 'required|string|max:191|distinct',
                'dinh_nghia' => $text, 'ma_dieu_khoan_dinh_nghia' => 'nullable|required_with:dinh_nghia|integer|exists:dieu_khoan,ma_dieu_khoan',
                'lien_ket' => 'present|array|max:1000', 'lien_ket.*' => 'required|integer|distinct|exists:dieu_khoan,ma_dieu_khoan',
            ],
            'quy_dinh' => [
                'ma_dieu_khoan' => 'required|integer|exists:dieu_khoan,ma_dieu_khoan',
                'loai_quy_dinh' => ['required', Rule::in(['prohibition', 'right', 'obligation', 'authority', 'measure', 'procedure', 'effectiveness', 'other'])],
                'chu_the' => $text, 'doi_tuong' => $text, 'dieu_kien' => $text, 'ngoai_le' => $text,
                'hanh_vi' => 'required|string|max:16000', 'trich_nguyen_van' => 'required|string|max:16000',
            ],
        };
        $data = Validator::make($request->all(), $rules, [
            'required' => 'Bạn điền thông tin này nhé.', 'exists' => 'Bản ghi liên kết không còn tồn tại. Bạn tải lại danh sách nhé.',
            'unique' => 'Giá trị này đã tồn tại.', 'max' => 'Dữ liệu vượt giới hạn cho phép.',
            'required_with' => 'Bạn chọn căn cứ cho định nghĩa nhé.',
        ])->validate();
        unset($data['xoa_tep']);
        if ($table === 'dieu_khoan') {
            foreach (['so_khoan', 'ky_hieu_diem', 'tieu_de'] as $key) {
                $data[$key] = $data[$key] ?? '';
            }
            if ($data['ky_hieu_diem'] !== '' && $data['so_khoan'] === '') {
                $this->invalid('so_khoan', 'Bạn nhập khoản khi có điểm nhé.');
            }
            $duplicate = DieuKhoan::where('ma_van_ban', $data['ma_van_ban'])->where('so_dieu', $data['so_dieu'])->where('so_khoan', $data['so_khoan'])->where('ky_hieu_diem', $data['ky_hieu_diem']);
            if ($row->exists) {
                $duplicate->where('ma_dieu_khoan', '!=', $row->getKey());
            }
            if ($duplicate->exists()) {
                $this->invalid('so_dieu', 'Vị trí điều/khoản/điểm đã tồn tại.');
            }
        }
        if ($table === 'quy_dinh' && ! str_contains(DieuKhoan::findOrFail($data['ma_dieu_khoan'])->noi_dung, $data['trich_nguyen_van'])) {
            $this->invalid('trich_nguyen_van', 'Đoạn trích phải khớp nguyên văn điều khoản nguồn.');
        }

        return $data;
    }

    private function documentIds(string $table, Model $row): array
    {
        if (! $row->exists) {
            return [];
        }
        if ($table === 'van_ban') {
            return [$row->getKey()];
        }
        if ($table === 'dieu_khoan') {
            return [(int) $row->ma_van_ban];
        }
        $ids = $table === 'quy_dinh' ? [$row->ma_dieu_khoan] : [...DB::table('dieu_khoan_tu_khoa')->where('ma_tu_khoa', $row->getKey())->pluck('ma_dieu_khoan')->all(), $row->ma_dieu_khoan_dinh_nghia];

        return DieuKhoan::whereIn('ma_dieu_khoan', $ids)->pluck('ma_van_ban')->unique()->all();
    }

    private function guardDelete(string $table, Model $row): void
    {
        if ($table === 'van_ban') {
            abort_if(DieuKhoan::where('ma_van_ban', $row->getKey())->exists(), 409);
        }
        if ($table === 'dieu_khoan') {
            abort_if(QuyDinh::where('ma_dieu_khoan', $row->getKey())->exists() || TuKhoa::where('ma_dieu_khoan_dinh_nghia', $row->getKey())->exists(), 409);
            // Preserve links referenced by saved answers, even though schema permits SET NULL.
            abort_if(DB::table('trich_dan')->where('ma_dieu_khoan', $row->getKey())->exists(), 409);
        }
    }

    private function guardPublish(Request $request, VanBan $document): void
    {
        $request->validate(['da_doi_chieu' => 'required|accepted']);
        $clauses = DieuKhoan::where('ma_van_ban', $document->getKey())->get();
        if ($clauses->isEmpty() || ! $document->lien_ket_nguon || ! $document->ngay_ban_hanh || ! $document->ngay_hieu_luc) {
            $this->invalid('trang_thai', 'Bạn bổ sung nguồn, ngày ban hành, ngày hiệu lực và điều khoản trước khi công bố.');
        }
        if ($clauses->contains(fn ($clause) => ! $clause->trang_nguon)) {
            $this->invalid('trang_thai', 'Bạn bổ sung trang nguồn cho tất cả điều khoản.');
        }
        foreach (QuyDinh::whereIn('ma_dieu_khoan', $clauses->modelKeys())->get() as $rule) {
            if (! str_contains($clauses->firstWhere('ma_dieu_khoan', $rule->ma_dieu_khoan)->noi_dung, $rule->trich_nguyen_van)) {
                $this->invalid('trang_thai', 'Có quy định không khớp nguyên văn căn cứ.');
            }
        }
    }

    private function invalid(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
