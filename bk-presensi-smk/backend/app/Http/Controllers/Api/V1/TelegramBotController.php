<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TelegramParent;
use App\Models\ParentVerificationCode;
use App\Models\Student;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class TelegramBotController extends Controller
{
    /**
     * Verify parent via code — called by bot
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'telegram_id' => ['required', 'integer'],
            'parent_name' => ['required', 'string', 'max:150'],
            'nis'         => ['required', 'string', 'max:20'],
            'code'        => ['required', 'string', 'max:20'],
        ]);

        $student = Student::where('nis', $request->nis)->where('enrollment_status', 'aktif')->first();
        if (!$student) {
            return $this->fail('Siswa tidak ditemukan atau tidak aktif.', 'STUDENT_NOT_FOUND');
        }

        $codeRecord = ParentVerificationCode::where('student_id', $student->id)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->where('attempts_count', '<', 5)
            ->latest()
            ->first();

        if (!$codeRecord) {
            return $this->fail('Kode verifikasi tidak valid atau telah kedaluwarsa.', 'CODE_INVALID');
        }

        $isBcrypt = str_starts_with($codeRecord->code_hash, '$2');
        $matches = false;
        if ($isBcrypt) {
            $matches = Hash::check($request->code, $codeRecord->code_hash);
        } else {
            $matches = hash_equals($codeRecord->code_hash, hash('sha256', $request->code));
        }

        if (!$matches && $codeRecord->plain_code) {
            $matches = hash_equals($codeRecord->plain_code, $request->code);
        }

        if (!$matches) {
            return $this->fail('Kode verifikasi salah.', 'CODE_MISMATCH');
        }

        // Mark code used
        $codeRecord->update(['used_at' => now()]);

        // Create/update parent
        $parent = TelegramParent::updateOrCreate(
            ['telegram_id' => $request->telegram_id],
            ['parent_name' => $request->parent_name, 'is_verified' => true, 'verified_at' => now()]
        );

        // Link parent-student
        $parent->students()->syncWithoutDetaching([
            $student->id => [
                'verified_at'         => now(),
                'verification_method' => 'code',
            ],
        ]);

        AuditService::log('parent_verified', 'telegram_parents', $parent->id, [
            'student_id' => $student->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Verifikasi berhasil.',
            'data'    => [
                'parent_name'  => $parent->parent_name,
                'student_name' => $student->name,
                'class_name'   => $student->class?->name,
            ],
        ]);
    }

    /**
     * Get today's attendance for verified parent's child
     */
    public function attendance(Request $request): JsonResponse
    {
        $request->validate([
            'telegram_id' => ['required', 'integer'],
            'student_id'  => ['required', 'integer'],
        ]);

        $parent = $this->getAuthorizedParent($request->telegram_id, $request->student_id);
        if (!$parent['ok']) return $this->fail($parent['msg'], $parent['code']);

        $today   = Carbon::today()->toDateString();
        $student = Student::with(['attendances' => fn($q) => $q->where('date', $today)])->findOrFail($request->student_id);
        $todayAttendance = $student->attendances->first();

        return response()->json([
            'success' => true,
            'data'    => [
                'student_name' => $student->name,
                'date'         => $today,
                'status'       => $todayAttendance?->status ?? 'Belum dicatat',
                'notes'        => $todayAttendance?->notes,
            ],
        ]);
    }

    /**
     * Get last 10 attendances for a student
     */
    public function attendanceHistory(Request $request): JsonResponse
    {
        $request->validate([
            'telegram_id' => ['required', 'integer'],
            'student_id'  => ['required', 'integer'],
        ]);

        $parent = $this->getAuthorizedParent($request->telegram_id, $request->student_id);
        if (!$parent['ok']) return $this->fail($parent['msg'], $parent['code']);

        $student = Student::with(['attendances' => fn($q) => $q->orderByDesc('date')->limit(10)])->findOrFail($request->student_id);

        return response()->json([
            'success' => true,
            'data'    => [
                'student_name' => $student->name,
                'records'      => $student->attendances->map(fn($a) => [
                    'date'   => $a->date->toDateString(),
                    'status' => $a->status,
                    'notes'  => $a->notes,
                ]),
            ],
        ]);
    }

    /**
     * Get visible complaints for parent
     */
    public function complaints(Request $request): JsonResponse
    {
        $request->validate([
            'telegram_id' => ['required', 'integer'],
            'student_id'  => ['required', 'integer'],
        ]);

        $parent = $this->getAuthorizedParent($request->telegram_id, $request->student_id);
        if (!$parent['ok']) return $this->fail($parent['msg'], $parent['code']);

        $complaints = \App\Models\Complaint::where('student_id', $request->student_id)
            ->where('parent_visible', true)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($c) => [
                'code'    => $c->complaint_code,
                'status'  => $c->status,
                'date'    => $c->incident_at->toDateString(),
            ]);

        return response()->json([
            'success' => true,
            'data'    => $complaints,
        ]);
    }

    /**
     * Get linked students for a telegram parent
     */
    public function myStudents(Request $request): JsonResponse
    {
        $request->validate([
            'telegram_id' => ['required', 'integer'],
        ]);

        $parent = TelegramParent::where('telegram_id', $request->telegram_id)
            ->where('is_verified', true)
            ->with('students.class')
            ->first();

        if (!$parent) {
            return $this->fail('Akun belum terverifikasi.', 'NOT_VERIFIED');
        }

        $parent->update(['last_interaction_at' => now()]);

        return response()->json([
            'success' => true,
            'data'    => $parent->students->map(fn($s) => [
                'id'         => $s->id,
                'name'       => $s->name,
                'nis'        => $s->nis,
                'class_name' => $s->class?->name,
            ]),
        ]);
    }

    private function getAuthorizedParent(int $telegramId, int $studentId): array
    {
        $parent = TelegramParent::where('telegram_id', $telegramId)->where('is_verified', true)->first();
        if (!$parent) return ['ok' => false, 'msg' => 'Akun belum terverifikasi.', 'code' => 'NOT_VERIFIED'];

        $linked = $parent->students()->where('student_id', $studentId)->exists();
        if (!$linked) return ['ok' => false, 'msg' => 'Tidak memiliki akses ke data siswa ini.', 'code' => 'ACCESS_DENIED'];

        $parent->update(['last_interaction_at' => now()]);
        return ['ok' => true];
    }

    private function fail(string $message, string $code, int $status = 403): JsonResponse
    {
        return response()->json([
            'success'    => false,
            'message'    => $message,
            'error_code' => $code,
        ], $status);
    }
}
