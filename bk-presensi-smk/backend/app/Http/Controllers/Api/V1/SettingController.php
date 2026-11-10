<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = Setting::getAllSettings();

        return response()->json([
            'success'    => true,
            'message'    => 'Pengaturan sistem sekolah.',
            'request_id' => app()->bound('request.id') ? app('request.id') : null,
            'data'       => $settings,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isAdmin()) {
            return response()->json([
                'success'    => false,
                'message'    => 'Akses ditolak. Hanya Administrator yang dapat mengubah pengaturan sekolah.',
                'error_code' => 'FORBIDDEN',
            ], 403);
        }

        $validated = $request->validate([
            'school_name'          => ['required', 'string', 'max:200'],
            'school_address'       => ['nullable', 'string', 'max:500'],
            'school_phone'         => ['nullable', 'string', 'max:50'],
            'school_email'         => ['nullable', 'string', 'max:100'],
            'cutoff_time'          => ['nullable', 'string', 'max:10'],
            'active_academic_year' => ['nullable', 'string', 'max:50'],
        ]);

        foreach ($validated as $key => $value) {
            Setting::set($key, $value);
        }

        AuditService::log('settings_updated', 'settings', null, $validated);

        return response()->json([
            'success'    => true,
            'message'    => 'Pengaturan institusi dan nama sekolah berhasil diperbarui.',
            'request_id' => app()->bound('request.id') ? app('request.id') : null,
            'data'       => Setting::getAllSettings(),
        ]);
    }
}
