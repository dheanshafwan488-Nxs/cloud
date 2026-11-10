<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\SchoolCalendar;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AcademicYearController extends Controller
{
    public function index(): JsonResponse
    {
        $years = AcademicYear::orderByDesc('start_date')->get();
        return response()->json([
            'success' => true, 'message' => 'Tahun ajaran.',
            'request_id' => app('request.id'), 'data' => $years,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'label'      => ['required', 'string', 'max:20', 'unique:academic_years,label'],
            'start_date' => ['required', 'date'],
            'end_date'   => ['required', 'date', 'after:start_date'],
            'is_active'  => ['boolean'],
        ]);

        if (!empty($data['is_active'])) {
            AcademicYear::where('is_active', true)->update(['is_active' => false]);
        }

        $year = AcademicYear::create($data);
        AuditService::log('academic_year_created', 'academic_years', $year->id);

        return response()->json([
            'success' => true, 'message' => 'Tahun ajaran berhasil dibuat.',
            'request_id' => app('request.id'), 'data' => $year,
        ], 201);
    }
}

class SchoolCalendarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['academic_year_id' => ['required', 'integer', 'exists:academic_years,id']]);
        $calendars = SchoolCalendar::where('academic_year_id', $request->academic_year_id)
            ->orderBy('date')->get();

        return response()->json([
            'success' => true, 'message' => 'Kalender sekolah.',
            'request_id' => app('request.id'), 'data' => $calendars,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'academic_year_id' => ['required', 'integer', 'exists:academic_years,id'],
            'date'             => ['required', 'date',
                Rule::unique('school_calendar')->where(fn($q) => $q->where('academic_year_id', $request->academic_year_id))
            ],
            'day_type'    => ['required', Rule::in(['school_day', 'holiday', 'non_school_day'])],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $cal = SchoolCalendar::create($data);
        return response()->json([
            'success' => true, 'message' => 'Kalender berhasil ditambahkan.',
            'request_id' => app('request.id'), 'data' => $cal,
        ], 201);
    }

    public function update(Request $request, SchoolCalendar $schoolCalendar): JsonResponse
    {
        $data = $request->validate([
            'day_type'    => ['sometimes', Rule::in(['school_day', 'holiday', 'non_school_day'])],
            'description' => ['nullable', 'string', 'max:255'],
        ]);
        $schoolCalendar->update($data);
        return response()->json([
            'success' => true, 'message' => 'Kalender diperbarui.',
            'request_id' => app('request.id'), 'data' => $schoolCalendar,
        ]);
    }

    public function destroy(SchoolCalendar $schoolCalendar): JsonResponse
    {
        $schoolCalendar->delete();
        return response()->json(['success' => true, 'message' => 'Kalender dihapus.', 'request_id' => app('request.id')]);
    }
}
