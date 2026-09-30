<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

final class SafeLog
{
    public static function write(string $channel, string $event, string $outcome, array $context = []): void
    {
        $allowed = array_intersect_key($context, array_flip([
            'request_id', 'route', 'method', 'status', 'duration_ms',
            'actor_id', 'actor_role', 'error_code', 'target_type', 'target_id',
        ]));
        // No request/model/exception object is ever serialized by this logger.
        foreach ($allowed as $key => $value) {
            $allowed[$key] = is_string($value) ? mb_substr($value, 0, 160)
                : (is_int($value) || $value === null ? $value : null);
        }
        try {
            Log::channel($channel)->info($event, array_merge($allowed, [
                'event_id' => (string) Str::uuid(), 'service' => 'api',
                'environment' => app()->environment(), 'outcome' => $outcome,
            ]));
        } catch (\Throwable) {
            // Bounded fallback with no request content. Hosting must monitor stderr.
            error_log('CyberLaw: structured logger unavailable');
        }
    }
}
