<?php

namespace App\Support;

use App\Models\VanBan;
use Illuminate\Support\Facades\Storage;

/** Callers must check publication or admin permission before resolving files. */
final class KnowledgePdf
{
    public static function path(VanBan $document): ?string
    {
        $relative = (string) $document->duong_dan_tep;
        if (preg_match('~^knowledge/[A-Za-z0-9]+\.pdf$~D', $relative)) {
            $root = realpath(Storage::disk('local')->path('knowledge'));
            $path = realpath(Storage::disk('local')->path($relative));
            if (! $root || ! $path || ! str_starts_with($path, $root.DIRECTORY_SEPARATOR)) {
                return null;
            }
        } elseif ($relative === 'data/raw/laws/2025/official/116-2025-qh15-congbao.pdf') {
            $path = realpath(base_path('../../'.$relative));
        } else {
            return null;
        }

        return $path && is_file($path) && is_readable($path) ? $path : null;
    }

    public static function download(VanBan $document)
    {
        $path = self::path($document);
        abort_unless($path, 404);

        return response()->download($path, 'van-ban-'.$document->getKey().'.pdf', [
            'Content-Type' => 'application/pdf', 'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "sandbox; default-src 'none'",
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
