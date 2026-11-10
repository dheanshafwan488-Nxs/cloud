<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Complaint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    public function attendanceReport(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => ['required', 'date'],
            'date_to'   => ['required', 'date', 'after_or_equal:date_from'],
            'class_id'  => ['nullable', 'integer', 'exists:classes,id'],
        ]);

        $from = $request->date_from;
        $to   = $request->date_to;

        $data = Attendance::selectRaw('date, status, COUNT(*) as count')
            ->whereBetween('date', [$from, $to])
            ->when($request->class_id, fn($q, $c) => $q->where('class_id', $c))
            ->groupBy('date', 'status')
            ->orderBy('date')
            ->get();

        return response()->json([
            'success'    => true,
            'message'    => 'Rekap presensi.',
            'request_id' => app('request.id'),
            'data'       => $data,
        ]);
    }

    public function attendanceByClass(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => ['required', 'date'],
            'date_to'   => ['required', 'date'],
        ]);

        $data = Attendance::selectRaw('class_id, status, COUNT(*) as count')
            ->whereBetween('date', [$request->date_from, $request->date_to])
            ->with('class')
            ->groupBy('class_id', 'status')
            ->get()
            ->groupBy('class_id');

        return response()->json([
            'success'    => true,
            'message'    => 'Rekap presensi per kelas.',
            'request_id' => app('request.id'),
            'data'       => $data,
        ]);
    }

    public function attendanceByStudent(Request $request): JsonResponse
    {
        $request->validate([
            'date_from'  => ['required', 'date'],
            'date_to'    => ['required', 'date'],
            'class_id'   => ['nullable', 'integer', 'exists:classes,id'],
            'student_id' => ['nullable', 'integer', 'exists:students,id'],
            'per_page'   => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $data = Attendance::selectRaw('student_id, status, COUNT(*) as count')
            ->whereBetween('date', [$request->date_from, $request->date_to])
            ->when($request->class_id, fn($q, $c) => $q->where('class_id', $c))
            ->when($request->student_id, fn($q, $s) => $q->where('student_id', $s))
            ->with('student')
            ->groupBy('student_id', 'status')
            ->paginate($request->integer('per_page', 30));

        return response()->json([
            'success'    => true,
            'message'    => 'Rekap presensi per siswa.',
            'request_id' => app('request.id'),
            'data'       => $data->items(),
            'meta'       => ['total' => $data->total()],
        ]);
    }

    public function complaintsReport(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to'   => ['nullable', 'date'],
            'status'    => ['nullable', 'string'],
        ]);

        $data = Complaint::selectRaw('status, COUNT(*) as count')
            ->when($request->date_from, fn($q, $d) => $q->where('incident_at', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('incident_at', '<=', $d))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->groupBy('status')
            ->get();

        return response()->json([
            'success'    => true,
            'message'    => 'Rekap pengaduan.',
            'request_id' => app('request.id'),
            'data'       => $data,
        ]);
    }
}
