<?php

namespace App\Services;

use App\Models\CaseFollowup;
use App\Models\Complaint;
use App\Models\Student;
use App\Models\TelegramParent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramNotificationService
{
    /**
     * Send push notification to verified parents when attendance is updated.
     */
    public static function notifyAttendance(Student $student, string $status, string $date, ?string $notes = null): int
    {
        $botToken = env('TELEGRAM_BOT_TOKEN');
        if (empty($botToken) || $botToken === 'dummy_telegram_token') {
            Log::info("TelegramNotificationService: skipped notifyAttendance because bot token is not configured.", [
                'student_id' => $student->id,
                'status'     => $status,
            ]);
            return 0;
        }

        $parents = $student->telegramParents()->where('is_verified', true)->get();
        if ($parents->isEmpty()) {
            return 0;
        }

        $icons = [
            'Hadir' => '🟢',
            'Sakit' => '🟡',
            'Izin'  => '🔵',
            'Alpa'  => '🔴',
        ];

        $icon = $icons[$status] ?? '⚪';
        $formattedDate = Carbon::parse($date)->locale('id')->isoFormat('dddd, D MMMM Y');
        $className = $student->class?->name ?? '-';

        $alertFooter = '';
        if ($status === 'Alpa') {
            $alertFooter = "\n⚠️ *PENTING:* Siswa tidak hadir di sekolah tanpa keterangan yang sah. Mohon segera melakukan konfirmasi kepada Wali Kelas atau pihak sekolah.";
        } elseif ($status === 'Sakit') {
            $alertFooter = "\nℹ️ Harap melampirkan surat keterangan dokter / orang tua kepada Wali Kelas.";
        } elseif ($status === 'Izin') {
            $alertFooter = "\nℹ️ Izin telah tercatat pada sistem administrasi sekolah.";
        }

        $message = "🔔 *PEMBERITAHUAN PRESENSI SISWA*\n"
            . "*SMK IPTEK SANGGABUANA*\n\n"
            . "Yth. Orang Tua / Wali Murid,\n\n"
            . "Berikut adalah laporan kehadiran anak Anda:\n"
            . "👤 *Nama Siswa:* {$student->name}\n"
            . "🔢 *NIS:* `{$student->nis}`\n"
            . "🏫 *Kelas:* {$className}\n"
            . "📅 *Tanggal:* {$formattedDate}\n\n"
            . "Status: {$icon} *{$status}*\n"
            . "Keterangan: _" . ($notes ?: 'Tidak ada catatan tambahan') . "_\n"
            . $alertFooter . "\n\n"
            . "🤖 _Pesan otomatis sistem presensi SMK IPTEK SANGGABUANA._";

        $sentCount = 0;
        foreach ($parents as $parent) {
            if (self::sendRawMessage($parent->telegram_id, $message)) {
                $sentCount++;
            }
        }

        return $sentCount;
    }

    /**
     * Send push notification when a BK complaint/case is created or flagged parent visible.
     */
    public static function notifyComplaint(Complaint $complaint, string $title = 'Informasi Bimbingan Konseling'): int
    {
        $botToken = env('TELEGRAM_BOT_TOKEN');
        if (empty($botToken) || $botToken === 'dummy_telegram_token') {
            Log::info("TelegramNotificationService: skipped notifyComplaint (token not configured)");
            return 0;
        }

        $student = $complaint->student;
        if (!$student) {
            return 0;
        }

        $parents = $student->telegramParents()->where('is_verified', true)->get();
        if ($parents->isEmpty()) {
            return 0;
        }

        $className = $student->class?->name ?? '-';
        $incidentDate = Carbon::parse($complaint->incident_at)->locale('id')->isoFormat('D MMMM Y');

        $violationsList = '';
        if ($complaint->violations && $complaint->violations->isNotEmpty()) {
            $violationsList = "\n📌 *Kategori Pelanggaran:*\n";
            foreach ($complaint->violations as $v) {
                $violationsList .= " • {$v->name} ({$v->points} Poin)\n";
            }
        }

        $message = "⚠️ *{$title}*\n"
            . "*SMK IPTEK SANGGABUANA*\n\n"
            . "Yth. Orang Tua / Wali Murid dari:\n"
            . "👤 *Nama Siswa:* {$student->name}\n"
            . "🔢 *NIS:* `{$student->nis}`\n"
            . "🏫 *Kelas:* {$className}\n\n"
            . "📋 *Nomor Laporan:* `{$complaint->complaint_code}`\n"
            . "📅 *Tanggal Kejadian:* {$incidentDate}\n"
            . "Status Kasus: *{$complaint->status}*\n"
            . $violationsList . "\n"
            . "📝 *Catatan / Kronologi:*\n"
            . "_{$complaint->chronology}_\n\n"
            . "ℹ️ _Bapak/Ibu diharapkan menghubungi atau memenuhi undangan Guru BK jika diperlukan pendampingan lebih lanjut._";

        $sentCount = 0;
        foreach ($parents as $parent) {
            if (self::sendRawMessage($parent->telegram_id, $message)) {
                $sentCount++;
            }
        }

        return $sentCount;
    }

    /**
     * Send push notification when a followup is recorded and parent_visible = true.
     */
    public static function notifyCaseFollowup(Complaint $complaint, CaseFollowup $followup): int
    {
        $botToken = env('TELEGRAM_BOT_TOKEN');
        if (empty($botToken) || $botToken === 'dummy_telegram_token') {
            return 0;
        }

        $student = $complaint->student;
        if (!$student) {
            return 0;
        }

        $parents = $student->telegramParents()->where('is_verified', true)->get();
        if ($parents->isEmpty()) {
            return 0;
        }

        $followupDate = Carbon::parse($followup->followed_up_at)->locale('id')->isoFormat('D MMMM Y');

        $message = "📋 *PEMBARUAN TINDAK LANJUT BK*\n"
            . "*SMK IPTEK SANGGABUANA*\n\n"
            . "Siswa: *{$student->name}* (Kelas: *{$student->class?->name}*)\n"
            . "No. Laporan: `{$complaint->complaint_code}`\n\n"
            . "📌 *Tindakan:* {$followup->followup_type}\n"
            . "📅 *Tanggal:* {$followupDate}\n"
            . "📝 *Catatan Konseling:*\n"
            . "_{$followup->notes}_\n\n"
            . "Status Kasus Terkini: *{$complaint->status}*";

        $sentCount = 0;
        foreach ($parents as $parent) {
            if (self::sendRawMessage($parent->telegram_id, $message)) {
                $sentCount++;
            }
        }

        return $sentCount;
    }

    /**
     * Dispatch raw message to Telegram Bot API.
     */
    public static function sendRawMessage(int $telegramId, string $message, ?array $replyMarkup = null): bool
    {
        $botToken = env('TELEGRAM_BOT_TOKEN');
        if (empty($botToken) || $botToken === 'dummy_telegram_token') {
            return false;
        }

        try {
            $payload = [
                'chat_id'    => $telegramId,
                'text'       => $message,
                'parse_mode' => 'Markdown',
            ];

            if ($replyMarkup) {
                $payload['reply_markup'] = json_encode($replyMarkup);
            }

            $response = Http::timeout(4)->post("https://api.telegram.org/bot{$botToken}/sendMessage", $payload);

            if (!$response->successful()) {
                Log::warning('Telegram send failed: ' . $response->body(), ['telegram_id' => $telegramId]);
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('Telegram API exception: ' . $e->getMessage(), ['telegram_id' => $telegramId]);
            return false;
        }
    }
}
