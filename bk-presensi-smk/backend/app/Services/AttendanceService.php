<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\SchoolCalendar;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AttendanceService
{
    /**
     * Save or update a single attendance record.
     */
    public function saveAttendance(array $data, ?int $attendanceId = null): Attendance
    {
        return DB::transaction(function () use ($data, $attendanceId) {
            $student = Student::findOrFail($data['student_id']);

            if ($attendanceId) {
                $attendance = Attendance::findOrFail($attendanceId);
                $attendance->update([
                    'status'     => $data['status'],
                    'notes'      => $data['notes'] ?? null,
                    'updated_by' => Auth::id(),
                ]);
            } else {
                $attendance = Attendance::create([
                    'student_id'  => $student->id,
                    'class_id'    => $student->class_id,
                    'date'        => $data['date'],
                    'status'      => $data['status'],
                    'notes'       => $data['notes'] ?? null,
                    'recorded_by' => Auth::id(),
                ]);
            }

            AuditService::log(
                $attendanceId ? 'attendance_updated' : 'attendance_created',
                'attendances',
                $attendance->id,
                ['status' => $attendance->status, 'date' => $attendance->date->toDateString()]
            );

            if (in_array($attendance->status, ['Alpa', 'Sakit', 'Izin'])) {
                TelegramNotificationService::notifyAttendance($student, $attendance->status, $data['date'], $data['notes'] ?? null);
            }

            return $attendance;
        });
    }

    /**
     * Bulk upsert attendances for a class on a given date.
     */
    public function bulkSaveAttendance(string $date, int $classId, array $records): array
    {
        return DB::transaction(function () use ($date, $classId, $records) {
            $saved = [];
            foreach ($records as $record) {
                $attendance = Attendance::updateOrCreate(
                    ['student_id' => $record['student_id'], 'date' => $date],
                    [
                        'class_id'    => $classId,
                        'status'      => $record['status'],
                        'notes'       => $record['notes'] ?? null,
                        'recorded_by' => Auth::id(),
                        'updated_by'  => Auth::id(),
                    ]
                );
                $saved[] = $attendance;
            }

            AuditService::log('attendance_bulk_saved', 'attendances', null, [
                'class_id' => $classId,
                'date'     => $date,
                'count'    => count($saved),
            ]);

            // Proactively notify parents of students marked Alpa, Sakit, or Izin
            foreach ($saved as $att) {
                if (in_array($att->status, ['Alpa', 'Sakit', 'Izin'])) {
                    $student = Student::with('class')->find($att->student_id);
                    if ($student) {
                        TelegramNotificationService::notifyAttendance($student, $att->status, $date, $att->notes);
                    }
                }
            }

            return $saved;
        });
    }

    /**
     * Build attendance summary for a student in a date range.
     */
    public function getStudentSummary(int $studentId, string $from, string $to): array
    {
        $records = Attendance::where('student_id', $studentId)
            ->whereBetween('date', [$from, $to])
            ->get();

        $hadir = $records->where('status', 'Hadir')->count();
        $sakit = $records->where('status', 'Sakit')->count();
        $izin  = $records->where('status', 'Izin')->count();
        $alpa  = $records->where('status', 'Alpa')->count();
        $total = $hadir + $sakit + $izin + $alpa;

        $percentage = $total > 0 ? round(($hadir / $total) * 100, 1) : 0;

        return compact('hadir', 'sakit', 'izin', 'alpa', 'total', 'percentage');
    }

    public function isSchoolDay(string $date, int $academicYearId): bool
    {
        $calendar = SchoolCalendar::where('academic_year_id', $academicYearId)
            ->where('date', $date)
            ->first();

        if ($calendar) {
            return $calendar->day_type === 'school_day';
        }

        // If not in calendar, assume weekdays (Mon-Fri) are school days
        $dayOfWeek = Carbon::parse($date)->dayOfWeek;
        return $dayOfWeek !== Carbon::SATURDAY && $dayOfWeek !== Carbon::SUNDAY;
    }
}
