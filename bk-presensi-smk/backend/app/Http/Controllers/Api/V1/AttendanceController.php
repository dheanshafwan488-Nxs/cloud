<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Student;
use App\Services\AttendanceService;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class AttendanceController extends Controller
{
    public function __construct(private readonly AttendanceService $attendanceService) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to'   => ['nullable', 'date', 'after_or_equal:date_from'],
            'class_id'  => ['nullable', 'integer', 'exists:classes,id'],
            'student_id'=> ['nullable', 'integer', 'exists:students,id'],
            'status'    => ['nullable', Rule::in(['Hadir', 'Sakit', 'Izin', 'Alpa'])],
            'per_page'  => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $query = Attendance::with(['student', 'class', 'recordedBy'])
            ->when($request->date_from, fn($q, $d) => $q->where('date', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('date', '<=', $d))
            ->when($request->class_id, fn($q, $c) => $q->where('class_id', $c))
            ->when($request->student_id, fn($q, $s) => $q->where('student_id', $s))
            ->when($request->status, fn($q, $s) => $q->where('status', $s));

        if (Auth::user()->isWaliKelas()) {
            $classIds = Auth::user()->activeClassAssignments()->pluck('class_id');
            $query->whereIn('class_id', $classIds);
        }

        $attendances = $query->orderByDesc('date')->paginate($request->integer('per_page', 30));

        return response()->json([
            'success'    => true,
            'message'    => 'Data presensi.',
            'request_id' => app('request.id'),
            'data'       => $attendances->items(),
            'meta'       => [
                'current_page' => $attendances->currentPage(),
                'last_page'    => $attendances->lastPage(),
                'total'        => $attendances->total(),
            ],
        ]);
    }

    public function today(Request $request): JsonResponse
    {
        $today = Carbon::today()->toDateString();
        $data = $this->index(new Request(array_merge($request->all(), ['date_from' => $today, 'date_to' => $today])));
        return $data;
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'date'       => ['required', 'date'],
            'status'     => ['required', Rule::in(['Hadir', 'Sakit', 'Izin', 'Alpa'])],
            'notes'      => ['nullable', 'string', 'max:500'],
        ]);

        $attendance = $this->attendanceService->saveAttendance($data);

        return response()->json([
            'success'    => true,
            'message'    => 'Presensi berhasil disimpan.',
            'request_id' => app('request.id'),
            'data'       => $attendance->load(['student', 'class']),
        ], 201);
    }

    public function bulk(Request $request): JsonResponse
    {
        if (!$request->has('records') && $request->has('attendances')) {
            $request->merge(['records' => $request->attendances]);
        }

        $request->validate([
            'class_id'        => ['required', 'integer', 'exists:classes,id'],
            'date'            => ['required', 'date'],
            'records'         => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'integer', 'exists:students,id'],
            'records.*.status'     => ['required', Rule::in(['Hadir', 'Sakit', 'Izin', 'Alpa'])],
            'records.*.notes'      => ['nullable', 'string', 'max:500'],
        ]);

        $saved = $this->attendanceService->bulkSaveAttendance(
            $request->date,
            $request->class_id,
            $request->records
        );

        return response()->json([
            'success'    => true,
            'message'    => count($saved) . ' presensi berhasil disimpan.',
            'request_id' => app('request.id'),
            'data'       => ['count' => count($saved)],
        ]);
    }

    public function update(Request $request, Attendance $attendance): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['Hadir', 'Sakit', 'Izin', 'Alpa'])],
            'notes'  => ['nullable', 'string', 'max:500'],
        ]);

        $data['student_id'] = $attendance->student_id;
        $data['date']       = $attendance->date->toDateString();

        $updated = $this->attendanceService->saveAttendance($data, $attendance->id);

        return response()->json([
            'success'    => true,
            'message'    => 'Presensi berhasil diperbarui.',
            'request_id' => app('request.id'),
            'data'       => $updated,
        ]);
    }

    public function byStudent(Student $student, Request $request): JsonResponse
    {
        $request->validate([
            'from'     => ['nullable', 'date'],
            'to'       => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $query = $student->attendances()
            ->when($request->from, fn($q, $d) => $q->where('date', '>=', $d))
            ->when($request->to, fn($q, $d) => $q->where('date', '<=', $d))
            ->orderByDesc('date');

        $attendances = $query->paginate($request->integer('per_page', 30));
        $summary = $this->attendanceService->getStudentSummary(
            $student->id,
            $request->from ?? now()->startOfMonth()->toDateString(),
            $request->to   ?? now()->toDateString()
        );

        return response()->json([
            'success'    => true,
            'message'    => 'Presensi siswa.',
            'request_id' => app('request.id'),
            'data'       => [
                'attendances' => $attendances->items(),
                'summary'     => $summary,
            ],
            'meta' => [
                'current_page' => $attendances->currentPage(),
                'last_page'    => $attendances->lastPage(),
                'total'        => $attendances->total(),
            ],
        ]);
    }
}
