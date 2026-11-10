<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    public static function log(
        string $action,
        string $entityType,
        ?int $entityId = null,
        array $metadata = []
    ): void {
        try {
            AuditLog::create([
                'user_id'     => Auth::id(),
                'action'      => $action,
                'entity_type' => $entityType,
                'entity_id'   => $entityId,
                'request_id'  => app()->bound('request.id') ? app('request.id') : null,
                'ip_address'  => request()->ip(),
                'metadata'    => $metadata,
            ]);
        } catch (\Throwable $e) {
            // Audit failures should not break main flow; log silently
            \Log::error('AuditLog failed: ' . $e->getMessage());
        }
    }
}
