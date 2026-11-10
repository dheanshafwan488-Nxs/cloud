<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Complaint;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $user = Auth::user();
        $today = Carbon::today()->toDateString();

        // Students
        $studentsQuery = Student::where('enrollment_status', 'aktif');
        $totalStudents = $studentsQuery->count();

        // Classes
        $totalClasses = SchoolClass::where('is_active', true)->count();

        // Today attendance
        $todayAttendance = Attendance::where('date', $today)->get();
        $hadirToday = $todayAttendance->where('status', 'Hadir')->count();
        $sakitToday = $todayAttendance->where('status', 'Sakit')->count();
        $izinToday  = $todayAttendance->where('status', 'Izin')->count();
        $alpaToday  = $todayAttendance->where('status', 'Alpa')->count();

        // Complaints
        $complaintsQuery = Complaint::query();
        if ($user->isWaliKelas()) {
            $classIds = $user->activeClassAssignments()->pluck('class_id');
            $complaintsQuery->whereIn('class_id', $classIds);
        } elseif ($user->isSiswa()) {
            $student = Student::where('user_id', $user->id)->first();
            $complaintsQuery->where('student_id', $student?->id ?? 0);
        }

        $pendingComplaints    = (clone $complaintsQuery)->where('status', 'Pending')->count();
        $diprosesComplaints   = (clone $complaintsQuery)->where('status', 'Diproses')->count();
        $selesaiComplaints    = (clone $complaintsQuery)->where('status', 'Selesai')->count();

        // ── Early Warning System ─────────────────────────────────────────────
        // 1. Siswa dengan akumulasi Alpa >= 3 dalam 30 hari terakhir
        $criticalAttendance = Student::with('class')
            ->whereHas('attendances', fn($q) => $q->where('status', 'Alpa')->where('date', '>=', now()->subDays(30)))
            ->withCount(['attendances as alpa_count' => fn($q) => $q->where('status', 'Alpa')->where('date', '>=', now()->subDays(30))])
            ->having('alpa_count', '>=', 3)
            ->orderByDesc('alpa_count')
            ->limit(5)
            ->get()
            ->map(fn($s) => [
                'id'         => $s->id,
                'name'       => $s->name,
                'nis'        => $s->nis,
                'class_name' => $s->class?->name ?? '-',
                'alpa_count' => $s->alpa_count,
                'warning'    => "Alpa {$s->alpa_count} hari dalam 30 hari terakhir",
                'level'      => $s->alpa_count >= 5 ? 'critical' : 'warning',
            ]);

        // 2. Siswa dengan akumulasi poin pelanggaran >= 30
        $criticalViolations = Student::with(['class', 'complaints.violations'])
            ->whereHas('complaints.violations')
            ->get()
            ->map(function ($s) {
                $totalPoints = $s->complaints->sum(fn($comp) => $comp->violations->sum('pivot.points_snapshot'));
                return [
                    'id'            => $s->id,
                    'name'          => $s->name,
                    'nis'           => $s->nis,
                    'class_name'    => $s->class?->name ?? '-',
                    'total_points'  => $totalPoints,
                    'level'         => $totalPoints >= 75 ? 'critical' : ($totalPoints >= 50 ? 'danger' : 'warning'),
                    'sanction_tier' => $totalPoints >= 100 ? 'Dikembalikan ke Orang Tua' : ($totalPoints >= 75 ? 'Panggilan SP 3 / Skorsing' : ($totalPoints >= 50 ? 'Panggilan SP 2' : 'Peringatan SP 1')),
                ];
            })
            ->filter(fn($item) => $item['total_points'] >= 25)
            ->sortByDesc('total_points')
            ->values()
            ->take(5);

        // 3. Kasus BK Pending yang menunggu tindakan
        $urgentComplaints = (clone $complaintsQuery)
            ->where('status', 'Pending')
            ->with(['student.class'])
            ->orderBy('incident_at')
            ->limit(5)
            ->get()
            ->map(fn($c) => [
                'id'             => $c->id,
                'complaint_code' => $c->complaint_code,
                'student_name'   => $c->student?->name ?? 'Siswa',
                'class_name'     => $c->class?->name ?? '-',
                'incident_at'    => $c->incident_at,
                'days_waiting'   => (int) Carbon::parse($c->incident_at)->diffInDays(now()),
                'chronology'     => \Illuminate\Support\Str::limit($c->chronology, 70),
            ]);

        return response()->json([
            'success'    => true,
            'message'    => 'Data dashboard berhasil diambil.',
            'request_id' => app('request.id'),
            'data'       => [
                'total_students'    => $totalStudents,
                'total_classes'     => $totalClasses,
                'attendance_today'  => [
                    'hadir' => $hadirToday,
                    'sakit' => $sakitToday,
                    'izin'  => $izinToday,
                    'alpa'  => $alpaToday,
                ],
                'complaints'        => [
                    'pending'  => $pendingComplaints,
                    'diproses' => $diprosesComplaints,
                    'selesai'  => $selesaiComplaints,
                ],
                'early_warnings'    => [
                    'critical_attendance' => $criticalAttendance,
                    'critical_violations' => $criticalViolations,
                    'urgent_complaints'   => $urgentComplaints,
                    'total_alerts'        => $criticalAttendance->count() + $criticalViolations->count() + $urgentComplaints->count(),
                ],
            ],
        ]);
    }

    public function attendanceChart(Request $request): JsonResponse
    {
        $request->validate([
            'days' => ['nullable', 'integer', 'min:7', 'max:90'],
        ]);

        $days = $request->integer('days', 30);
        $from = Carbon::today()->subDays($days - 1)->toDateString();
        $to   = Carbon::today()->toDateString();

        $chart = Attendance::selectRaw('date, status, COUNT(*) as count')
            ->whereBetween('date', [$from, $to])
            ->groupBy('date', 'status')
            ->orderBy('date')
            ->get()
            ->groupBy('date')
            ->map(fn ($rows) => $rows->keyBy('status')->map->count);

        return response()->json([
            'success'    => true,
            'message'    => 'Data grafik presensi.',
            'request_id' => app('request.id'),
            'data'       => $chart,
        ]);
    }

    public function recentActivities(Request $request): JsonResponse
    {
        $activities = \App\Models\AuditLog::with('user')
            ->orderByDesc('created_at')
            ->limit(15)
            ->get()
            ->map(fn ($log) => [
                'id'          => $log->id,
                'action'      => $log->action,
                'entity_type' => $log->entity_type,
                'entity_id'   => $log->entity_id,
                'user'        => $log->user?->name,
                'created_at'  => $log->created_at,
            ]);

        return response()->json([
            'success'    => true,
            'message'    => 'Aktivitas terbaru.',
            'request_id' => app('request.id'),
            'data'       => $activities,
        ]);
    }
}
