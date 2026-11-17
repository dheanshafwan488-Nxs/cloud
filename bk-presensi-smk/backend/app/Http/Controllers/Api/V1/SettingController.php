<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SettingController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = Setting::getAllSettings();

        return response()->json([
            'success'    => true,
            'message'    => 'Pengaturan sistem sekolah & Bot Telegram.',
            'request_id' => app()->bound('request.id') ? app('request.id') : null,
            'data'       => $settings,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && !$user->isGuruBk())) {
            return response()->json([
                'success'    => false,
                'message'    => 'Akses ditolak. Hanya Guru BK atau Administrator yang dapat mengubah pengaturan.',
                'error_code' => 'FORBIDDEN',
            ], 403);
        }

        $validated = $request->validate([
            'school_name'                    => ['required', 'string', 'max:200'],
            'school_address'                 => ['nullable', 'string', 'max:500'],
            'school_phone'                   => ['nullable', 'string', 'max:50'],
            'school_email'                   => ['nullable', 'string', 'max:100'],
            'cutoff_time'                    => ['nullable', 'string', 'max:10'],
            'active_academic_year'           => ['nullable', 'string', 'max:50'],
            'telegram_bot_token'             => ['nullable', 'string', 'max:200'],
            'telegram_bot_username'          => ['nullable', 'string', 'max:100'],
            'telegram_bot_service_token'     => ['nullable', 'string', 'max:150'],
            'telegram_notifications_enabled' => ['nullable', 'string', 'max:10'],
        ]);

        foreach ($validated as $key => $value) {
            Setting::set($key, $value);
        }

        // Synchronize TELEGRAM_BOT_TOKEN to .env files
        if (isset($validated['telegram_bot_token']) && !empty($validated['telegram_bot_token'])) {
            $this->updateEnvFile('TELEGRAM_BOT_TOKEN', $validated['telegram_bot_token']);
        }
        if (isset($validated['telegram_bot_service_token']) && !empty($validated['telegram_bot_service_token'])) {
            $this->updateEnvFile('BOT_SERVICE_TOKEN', $validated['telegram_bot_service_token']);
        }

        AuditService::log('settings_updated', 'settings', null, $validated);

        return response()->json([
            'success'    => true,
            'message'    => 'Pengaturan sistem & konfigurasi Bot Telegram berhasil disimpan.',
            'request_id' => app()->bound('request.id') ? app('request.id') : null,
            'data'       => Setting::getAllSettings(),
        ]);
    }

    public function testTelegram(Request $request): JsonResponse
    {
        $token = $request->input('token') ?: Setting::get('telegram_bot_token') ?: env('TELEGRAM_BOT_TOKEN');

        if (empty($token) || $token === 'dummy_telegram_token') {
            return response()->json([
                'success' => false,
                'message' => 'Token Bot Telegram belum diisi. Masukkan token bot dari @BotFather terlebih dahulu.',
            ], 422);
        }

        try {
            $response = Http::timeout(6)->get("https://api.telegram.org/bot{$token}/getMe");

            if ($response->successful() && $response->json('ok')) {
                $bot = $response->json('result');
                $botUsername = isset($bot['username']) ? '@' . $bot['username'] : null;

                // Auto-save verified username if empty
                if ($botUsername && !Setting::get('telegram_bot_username')) {
                    Setting::set('telegram_bot_username', $botUsername);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Koneksi ke Bot Telegram BERHASIL terhubung!',
                    'data'    => [
                        'id'         => $bot['id'] ?? null,
                        'first_name' => $bot['first_name'] ?? null,
                        'username'   => $botUsername,
                        'is_bot'     => $bot['is_bot'] ?? true,
                    ],
                ]);
            }

            $description = $response->json('description') ?? 'Token Bot Telegram tidak valid atau ditolak server Telegram.';
            return response()->json([
                'success' => false,
                'message' => "Gagal terhubung ke Telegram: {$description}",
            ], 400);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan koneksi ke Telegram API: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function testSendMessage(Request $request): JsonResponse
    {
        $request->validate([
            'chat_id' => ['required', 'string'],
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        $token = Setting::get('telegram_bot_token') ?: env('TELEGRAM_BOT_TOKEN');
        if (empty($token) || $token === 'dummy_telegram_token') {
            return response()->json([
                'success' => false,
                'message' => 'Token Bot Telegram belum dikonfigurasi atau belum disimpan.',
            ], 422);
        }

        $chatId = $request->input('chat_id');
        $schoolName = Setting::get('school_name', 'SMK IPTEK SANGGABUANA');
        $msg = $request->input('message') ?: "🤖 *UJI COBA NOTIFIKASI BOT TELEGRAM*\n*{$schoolName}*\n\nSelamat! Sistem Bimbingan Konseling & Presensi berhasil terhubung dengan akun Telegram Anda. Notifikasi kehadiran siswa dan panggilan bimbingan konseling akan terkirim secara otomatis melalui bot ini. ✅\n\n_Waktu Uji Coba: " . now()->locale('id')->isoFormat('dddd, D MMMM Y - HH:mm') . " WIB_";

        try {
            $response = Http::timeout(6)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id'    => $chatId,
                'text'       => $msg,
                'parse_mode' => 'Markdown',
            ]);

            if ($response->successful() && $response->json('ok')) {
                return response()->json([
                    'success' => true,
                    'message' => 'Pesan uji coba berhasil terkirim ke Telegram Anda!',
                ]);
            }

            $description = $response->json('description') ?? 'Periksa kembali Telegram ID / Chat ID Anda.';
            return response()->json([
                'success' => false,
                'message' => "Gagal mengirim pesan: {$description}",
            ], 400);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Koneksi error: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function updateEnvFile(string $key, string $value): void
    {
        $envPaths = [
            base_path('.env'),
            base_path('../telegram-bot/.env'),
        ];

        foreach ($envPaths as $envPath) {
            if (!file_exists($envPath)) {
                $example = str_replace('.env', '.env.example', $envPath);
                if (file_exists($example)) {
                    @copy($example, $envPath);
                }
            }

            if (file_exists($envPath) && is_writable($envPath)) {
                $content = file_get_contents($envPath);
                if (preg_match("/^{$key}=.*/m", $content)) {
                    $content = preg_replace("/^{$key}=.*/m", "{$key}={$value}", $content);
                } else {
                    $content .= "\n{$key}={$value}\n";
                }
                @file_put_contents($envPath, $content);
            }
        }
    }
}
