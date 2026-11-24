<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\ClassAssignment;
use App\Models\Complaint;
use App\Models\ParentVerificationCode;
use App\Models\SchoolClass;
use App\Models\Setting;
use App\Models\Student;
use App\Models\TelegramParent;
use App\Models\Violation;
use App\Services\AuditService;
use App\Services\ComplaintService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class TelegramBotController extends Controller
{
    /**
     * Register or update telegram user interaction (start/message)
     */
    public function registerInteraction(Request $request): JsonResponse
    {
        $request->validate([
            'telegram_id' => ['required', 'integer'],
            'parent_name' => ['nullable', 'string', 'max:150'],
            'username'    => ['nullable', 'string', 'max:100'],
        ]);

        $username = $request->input('username');
        if ($username) {
            $username = ltrim(trim($username), '@');
        }

        $parent = TelegramParent::updateOrCreate(
            ['telegram_id' => $request->telegram_id],
            array_filter([
                'parent_name'         => $request->input('parent_name') ?: 'Pengguna Telegram',
                'username'            => $username ?: null,
                'last_interaction_at' => now(),
            ], fn($val) => $val !== null)
        );

        return response()->json([
            'success' => true,
            'message' => 'Interaksi pengguna berhasil dicatat.',
            'data'    => [
                'telegram_id' => $parent->telegram_id,
                'parent_name' => $parent->parent_name,
                'username'    => $parent->username,
            ],
        ]);
    }

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

        $student = Student::with('class')->where('nis', $request->nis)->where('enrollment_status', 'aktif')->first();
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

        $codeRecord->update(['used_at' => now()]);

        $parent = TelegramParent::updateOrCreate(
            ['telegram_id' => $request->telegram_id],
            ['parent_name' => $request->parent_name, 'is_verified' => true, 'verified_at' => now()]
        );

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
                'student_id'   => $student->id,
                'student_name' => $student->name,
                'nis'          => $student->nis,
                'class_name'   => $student->class?->name ?? '-',
            ],
        ]);
    }

    /**
     * Unverify parent Telegram account
     */
    public function unverify(Request $request): JsonResponse
    {
        $request->validate([
            'telegram_id' => ['required', 'integer'],
        ]);

        $parent = TelegramParent::where('telegram_id', $request->telegram_id)->first();
        if (!$parent) {
            return $this->fail('Akun Telegram Anda belum terhubung dengan siswa manapun.', 'NOT_VERIFIED', 404);
        }

        $parent->students()->detach();
        $parent->update(['is_verified' => false]);

        return response()->json([
            'success' => true,
            'message' => 'Tautan akun berhasil diputus.',
        ]);
    }

    /**
     * Search active students by name, NIS, or class name (supports multi-word keywords)
     */
    public function searchStudents(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return $this->fail('Masukkan minimal 2 karakter nama, kelas, atau NIS siswa.', 'QUERY_TOO_SHORT', 422);
        }

        $tokens = array_values(array_filter(preg_split('/\s+/', $q) ?: []));

        $baseQuery = Student::with('class')
            ->where('enrollment_status', 'aktif')
            ->where(function ($outer) use ($q, $tokens) {
                $outer->where('name', 'like', "%{$q}%")
                    ->orWhere('nis', 'like', "%{$q}%")
                    ->orWhereHas('class', fn($cq) => $cq->where('name', 'like', "%{$q}%"));

                if (count($tokens) > 1) {
                    $outer->orWhere(function ($allTokens) use ($tokens) {
                        foreach ($tokens as $tok) {
                            $allTokens->where(function ($sub) use ($tok) {
                                $sub->where('name', 'like', "%{$tok}%")
                                    ->orWhere('nis', 'like', "%{$tok}%")
                                    ->orWhereHas('class', fn($cq) => $cq->where('name', 'like', "%{$tok}%"));
                            });
                        }
                    });
                }
            });

        $total = (clone $baseQuery)->count();
        $students = $baseQuery
            ->orderBy('name')
            ->limit(15)
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Hasil pencarian siswa.',
            'total'   => $total,
            'data'    => $students->map(fn($s) => [
                'id'         => $s->id,
                'name'       => $s->name,
                'nis'        => $s->nis,
                'class_name' => $s->class?->name ?? '-',
            ]),
        ]);
    }

    /**
     * List active classes for Telegram inline browsing
     */
    public function listClasses(): JsonResponse
    {
        $classes = SchoolClass::where('is_active', true)
            ->withCount(['students' => fn($q) => $q->where('enrollment_status', 'aktif')])
            ->orderBy('grade_level')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $classes->map(fn($c) => [
                'id'             => $c->id,
                'name'           => $c->name,
                'grade_level'    => $c->grade_level,
                'students_count' => $c->students_count,
            ]),
        ]);
    }

    /**
     * Paginated list of active students in a class for Telegram inline browsing
     */
    public function classStudents(Request $request, int $classId): JsonResponse
    {
        $class = SchoolClass::where('id', $classId)->where('is_active', true)->first();
        if (!$class) {
            return $this->fail('Kelas tidak ditemukan.', 'CLASS_NOT_FOUND', 404);
        }

        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(20, max(5, (int) $request->query('per_page', 10)));

        $paginator = Student::where('class_id', $class->id)
            ->where('enrollment_status', 'aktif')
            ->orderBy('name')
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'success' => true,
            'data'    => [
                'class' => [
                    'id'   => $class->id,
                    'name' => $class->name,
                ],
                'students' => collect($paginator->items())->map(fn($s) => [
                    'id'   => $s->id,
                    'name' => $s->name,
                    'nis'  => $s->nis,
                ])->values(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page'    => $paginator->lastPage(),
                    'total'        => $paginator->total(),
                ],
            ],
        ]);
    }

    /**
     * Detailed safe student overview for parent inquiry (attendance + BK summary, NO reporter_name)
     */
    public function studentOverview(int $studentId): JsonResponse
    {
        $student = Student::with('class')
            ->where('id', $studentId)
            ->where('enrollment_status', 'aktif')
            ->first();

        if (!$student) {
            return $this->fail('Data siswa tidak ditemukan.', 'STUDENT_NOT_FOUND', 404);
        }

        $today = Carbon::today()->toDateString();

        $waliKelas = null;
        if ($student->class_id) {
            $assignment = ClassAssignment::where('class_id', $student->class_id)
                ->where('assignment_role', 'wali_kelas')
                ->whereNull('ended_at')
                ->with('user')
                ->first();
            $waliKelas = $assignment?->user?->name;
        }

        $todayAttendance = Attendance::where('student_id', $student->id)
            ->whereDate('date', $today)
            ->first();

        $summary = $this->buildAttendanceSummary($student->id);

        $recentAttendances = Attendance::where('student_id', $student->id)
            ->orderByDesc('date')
            ->limit(10)
            ->get()
            ->map(fn($a) => [
                'date'   => $a->date instanceof Carbon ? $a->date->toDateString() : (string) $a->date,
                'status' => $a->status,
                'notes'  => $a->notes,
            ]);

        $complaintService = app(ComplaintService::class);
        $masterViolations = Violation::all();

        $allStudentComplaints = Complaint::with('violations')
            ->where('student_id', $student->id)
            ->orderByDesc('incident_at')
            ->get();

        $totalPoints = $allStudentComplaints->sum(
            fn($c) => $complaintService->calculateComplaintPoints($c, $masterViolations)
        );

        $complaints = $allStudentComplaints->take(5);

        $casesList = $complaints->map(function ($c) use ($complaintService, $masterViolations) {
            $items = $complaintService->getComplaintViolationItems($c, $masterViolations);
            $pts = (int) collect($items)->sum('points');
            $names = collect($items)->pluck('name')->join(', ');
            return [
                'complaint_code' => $c->complaint_code,
                'status'         => $c->status,
                'incident_at'    => $c->incident_at instanceof Carbon ? $c->incident_at->toDateString() : (string) $c->incident_at,
                'violation'      => ($names ?: 'Catatan Pembinaan BK') . ($pts > 0 ? " (+{$pts} Poin)" : ''),
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Ringkasan data siswa.',
            'data'    => [
                'student' => [
                    'id'         => $student->id,
                    'name'       => $student->name,
                    'nis'        => $student->nis,
                    'class_name' => $student->class?->name ?? '-',
                    'wali_kelas' => $waliKelas ?: '-',
                    'status'     => $student->enrollment_status,
                ],
                'today_attendance' => [
                    'date'   => $today,
                    'status' => $todayAttendance?->status,
                    'notes'  => $todayAttendance?->notes,
                ],
                'attendance_summary' => $summary,
                'recent_attendances' => $recentAttendances,
                'bk_summary' => [
                    'total_cases'  => $allStudentComplaints->count(),
                    'open_cases'   => $allStudentComplaints->whereIn('status', ['Pending', 'Diproses'])->count(),
                    'total_points' => $totalPoints,
                    'cases'        => $casesList,
                ],
            ],
        ]);
    }

    /**
     * Get parent profile & linked students by telegram_id path param
     */
    public function parentProfile(int $telegramId): JsonResponse
    {
        $parent = TelegramParent::where('telegram_id', $telegramId)
            ->where('is_verified', true)
            ->with('students.class')
            ->first();

        if (!$parent) {
            return $this->fail('Akun Telegram Anda belum terverifikasi.', 'NOT_VERIFIED');
        }

        $parent->update(['last_interaction_at' => now()]);

        return response()->json([
            'success' => true,
            'data'    => [
                'parent_name' => $parent->parent_name,
                'students'    => $parent->students->map(fn($s) => [
                    'id'         => $s->id,
                    'name'       => $s->name,
                    'nis'        => $s->nis,
                    'class_name' => $s->class?->name ?? '-',
                ]),
            ],
        ]);
    }

    /**
     * Get today's attendance + summary for all linked children of a verified parent
     */
    public function parentTodayAttendance(Request $request, int $telegramId): JsonResponse
    {
        $parent = TelegramParent::where('telegram_id', $telegramId)
            ->where('is_verified', true)
            ->with('students.class')
            ->first();

        if (!$parent || $parent->students->isEmpty()) {
            return $this->fail('Akun Telegram Anda belum terverifikasi dengan data siswa.', 'NOT_VERIFIED');
        }

        $parent->update(['last_interaction_at' => now()]);
        $today = Carbon::today()->toDateString();

        $students = $parent->students;
        if ($request->filled('student_id')) {
            $students = $students->where('id', (int) $request->query('student_id'));
        }

        $records = [];
        foreach ($students as $student) {
            $att = Attendance::where('student_id', $student->id)
                ->whereDate('date', $today)
                ->first();

            $records[] = [
                'student_id'   => $student->id,
                'student_name' => $student->name,
                'nis'          => $student->nis,
                'class_name'   => $student->class?->name ?? '-',
                'status'       => $att?->status,
                'notes'        => $att?->notes,
                'summary'      => $this->buildAttendanceSummary($student->id),
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'date'    => $today,
                'records' => $records,
            ],
        ]);
    }

    /**
     * Get last 10 attendance records for linked children of a verified parent
     */
    public function parentAttendanceHistory(Request $request, int $telegramId): JsonResponse
    {
        $parent = TelegramParent::where('telegram_id', $telegramId)
            ->where('is_verified', true)
            ->with('students')
            ->first();

        if (!$parent || $parent->students->isEmpty()) {
            return $this->fail('Akun Telegram Anda belum terverifikasi dengan data siswa.', 'NOT_VERIFIED');
        }

        $parent->update(['last_interaction_at' => now()]);
        $studentIds = $parent->students->pluck('id')->all();

        if ($request->filled('student_id') && in_array((int) $request->query('student_id'), $studentIds, true)) {
            $studentIds = [(int) $request->query('student_id')];
        }

        $rows = Attendance::with('student')
            ->whereIn('student_id', $studentIds)
            ->orderByDesc('date')
            ->limit(10)
            ->get()
            ->map(fn($a) => [
                'date'         => $a->date instanceof Carbon ? $a->date->toDateString() : (string) $a->date,
                'status'       => $a->status,
                'notes'        => $a->notes,
                'student_name' => $a->student?->name ?? 'Siswa',
            ]);

        return response()->json([
            'success' => true,
            'data'    => $rows,
        ]);
    }

    /**
     * Get BK cases for linked children of a verified parent (NEVER exposing reporter_name)
     */
    public function parentCases(Request $request, int $telegramId): JsonResponse
    {
        $parent = TelegramParent::where('telegram_id', $telegramId)
            ->where('is_verified', true)
            ->with('students')
            ->first();

        if (!$parent || $parent->students->isEmpty()) {
            return $this->fail('Akun Telegram Anda belum terverifikasi dengan data siswa.', 'NOT_VERIFIED');
        }

        $parent->update(['last_interaction_at' => now()]);
        $studentIds = $parent->students->pluck('id')->all();

        if ($request->filled('student_id') && in_array((int) $request->query('student_id'), $studentIds, true)) {
            $studentIds = [(int) $request->query('student_id')];
        }

        $cases = Complaint::with(['student', 'violations'])
            ->whereIn('student_id', $studentIds)
            ->where('parent_visible', true)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn($c) => [
                'complaint_code' => $c->complaint_code,
                'status'         => $c->status,
                'incident_at'    => $c->incident_at instanceof Carbon ? $c->incident_at->toDateString() : (string) $c->incident_at,
                'student_name'   => $c->student?->name ?? 'Siswa',
                'summary'        => $c->manual_violation ?: ($c->violations->pluck('name')->join(', ') ?: $c->chronology),
            ]);

        return response()->json([
            'success' => true,
            'data'    => $cases,
        ]);
    }

    /**
     * Dynamic school & Guru BK contact info from settings table
     */
    public function schoolContact(): JsonResponse
    {
        $settings = Setting::getAllSettings();

        return response()->json([
            'success' => true,
            'data'    => [
                'school_name' => $settings['school_name'] ?? 'SMK IPTEK SANGGABUANA',
                'bk_phone'    => $settings['school_phone'] ?? '0812-3456-7890',
                'bk_email'    => $settings['school_email'] ?? 'bk@smkiptek.sch.id',
                'address'     => $settings['school_address'] ?? 'Jl. Terusan Pangrango No. 45, Karawang, Jawa Barat',
            ],
        ]);
    }

    /**
     * Legacy endpoints kept for compatibility
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

    public function complaints(Request $request): JsonResponse
    {
        $request->validate([
            'telegram_id' => ['required', 'integer'],
            'student_id'  => ['required', 'integer'],
        ]);

        $parent = $this->getAuthorizedParent($request->telegram_id, $request->student_id);
        if (!$parent['ok']) return $this->fail($parent['msg'], $parent['code']);

        $complaints = Complaint::where('student_id', $request->student_id)
            ->where('parent_visible', true)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($c) => [
                'code'   => $c->complaint_code,
                'status' => $c->status,
                'date'   => $c->incident_at->toDateString(),
            ]);

        return response()->json([
            'success' => true,
            'data'    => $complaints,
        ]);
    }

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

    private function buildAttendanceSummary(int $studentId): array
    {
        $counts = Attendance::where('student_id', $studentId)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $hadir = (int) ($counts['Hadir'] ?? 0);
        $sakit = (int) ($counts['Sakit'] ?? 0);
        $izin  = (int) ($counts['Izin'] ?? 0);
        $alpa  = (int) ($counts['Alpa'] ?? 0);
        $total = $hadir + $sakit + $izin + $alpa;
        $pct   = $total > 0 ? round(($hadir / $total) * 100, 1) : 100;

        return [
            'hadir'      => $hadir,
            'sakit'      => $sakit,
            'izin'       => $izin,
            'alpa'       => $alpa,
            'total'      => $total,
            'percentage' => $pct,
        ];
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
