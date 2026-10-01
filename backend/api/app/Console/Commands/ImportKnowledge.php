<?php

namespace App\Console\Commands;

use App\Services\KnowledgeImport;
use App\Support\SafeLog;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

final class ImportKnowledge extends Command
{
    protected $signature = 'cyberlaw:import-knowledge {--apply : Nap ban nhap da kiem tra; mac dinh chi doi chieu}';

    protected $description = 'Kiem tra/nap nguyen ban luat 116/2025; khong ghi de, khong cong bo';

    public function handle(KnowledgeImport $importer): int
    {
        $requestId = (string) Str::uuid();
        try {
            $result = $importer->run((bool) $this->option('apply'), $requestId);
            SafeLog::write('audit', 'knowledge.import_cli', $result, ['request_id' => $requestId]);
            $this->info(match ($result) {
                'imported' => 'Da nap ban nhap: 1 van ban, 434 dieu khoan, 60 tu khoa, 1326 lien ket, 434 quy dinh.',
                'unchanged' => 'Du lieu da ton tai va khop tung truong. Khong ghi them ban sao.',
                default => 'Kiem tra dat. Chua ghi database; dung --apply de nap ban nhap.',
            });
            $this->line('Request ID: '.$requestId);

            return self::SUCCESS;
        } catch (\Throwable $error) {
            $code = $error instanceof \RuntimeException && preg_match('/^knowledge_[a-z_]+$/D', $error->getMessage())
                ? $error->getMessage() : 'knowledge_import_failed';
            SafeLog::write('application', 'knowledge.import_cli', 'failure', ['request_id' => $requestId, 'error_code' => $code]);
            $this->error('Khong nap du lieu: '.$code.'. Khong ghi de du lieu cu. Request ID: '.$requestId);

            return self::FAILURE;
        }
    }
}
