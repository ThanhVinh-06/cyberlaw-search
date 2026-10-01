<?php

namespace App\Services;

use Symfony\Component\Process\Process;

class LocalRetriever
{
    public function retrieve(string $question, array $chunks): array
    {
        $payload = json_encode(['question' => $question, 'chunks' => $chunks], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        abort_if(strlen($payload) > 8 * 1024 * 1024, 503);
        // Argument array, fixed script, JSON stdin: no question in shell/argv/logs.
        $process = new Process([(string) config('ai.python'), '-I', '-X', 'utf8', base_path('../ai/retriever.py')]);
        $process->setInput($payload)->setTimeout((float) config('ai.timeout', 12));
        try {
            $process->mustRun();
            $result = json_decode($process->getOutput(), true, 32, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            abort(503, 'Dịch vụ truy hồi chưa sẵn sàng. Bạn thử lại sau nhé.');
        }
        abort_unless(is_array($result) && in_array($result['status'] ?? null, ['answered', 'no_basis'], true)
            && is_array($result['ids'] ?? null) && count($result['ids']) <= 4
            && count(array_filter($result['ids'], 'is_string')) === count($result['ids']), 503);
        abort_unless(($result['status'] === 'answered') === (count($result['ids']) > 0), 503);
        return $result;
    }
}
