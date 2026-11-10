<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\AcademicYear;
use App\Models\ClassAssignment;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClassController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $classes = SchoolClass::with(['academicYear', 'activeWaliKelas.user'])
            ->withCount('students')
            ->when($request->academic_year_id, fn($q, $id) => $q->where('academic_year_id', $id))
            ->when($request->grade_level, fn($q, $g) => $q->where('grade_level', $g))
            ->when($request->search, fn($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->orderBy('grade_level')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 30));

        return response()->json([
            'success'    => true,
            'message'    => 'Data kelas.',
            'request_id' => app('request.id'),
            'data'       => $classes->items(),
            'meta'       => [
                'current_page' => $classes->currentPage(),
                'last_page'    => $classes->lastPage(),
                'total'        => $classes->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'academic_year_id' => ['required', 'integer', 'exists:academic_years,id'],
            'name'             => ['required', 'string', 'max:50',
                Rule::unique('classes')->where(fn($q) => $q->where('academic_year_id', $request->academic_year_id))
            ],
            'grade_level'      => ['required', Rule::in(['X', 'XI', 'XII'])],
        ]);

        $class = SchoolClass::create($data);
        AuditService::log('class_created', 'classes', $class->id);

        return response()->json([
            'success'    => true,
            'message'    => 'Kelas berhasil ditambahkan.',
            'request_id' => app('request.id'),
            'data'       => $class->load('academicYear'),
        ], 201);
    }

    public function show(SchoolClass $class): JsonResponse
    {
        return response()->json([
            'success'    => true,
            'message'    => 'Detail kelas.',
            'request_id' => app('request.id'),
            'data'       => $class->load(['academicYear', 'activeWaliKelas.user', 'students']),
        ]);
    }

    public function update(Request $request, SchoolClass $class): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['sometimes', 'string', 'max:50',
                Rule::unique('classes')->where(fn($q) => $q->where('academic_year_id', $class->academic_year_id))->ignore($class->id)
            ],
            'grade_level' => ['sometimes', Rule::in(['X', 'XI', 'XII'])],
            'is_active'   => ['sometimes', 'boolean'],
        ]);

        $class->update($data);
        AuditService::log('class_updated', 'classes', $class->id);

        return response()->json([
            'success'    => true,
            'message'    => 'Kelas berhasil diperbarui.',
            'request_id' => app('request.id'),
            'data'       => $class->fresh(['academicYear']),
        ]);
    }

    public function students(SchoolClass $class): JsonResponse
    {
        $students = $class->students()->where('enrollment_status', 'aktif')->orderBy('name')->get();

        return response()->json([
            'success'    => true,
            'message'    => "Siswa kelas {$class->name}.",
            'request_id' => app('request.id'),
            'data'       => $students,
        ]);
    }

    public function assignWaliKelas(Request $request, SchoolClass $class): JsonResponse
    {
        $data = $request->validate([
            'user_id'     => ['required', 'integer', 'exists:users,id'],
            'assigned_at' => ['nullable', 'date'],
        ]);

        // End existing active assignment
        ClassAssignment::where('class_id', $class->id)
            ->where('assignment_role', 'wali_kelas')
            ->whereNull('ended_at')
            ->update(['ended_at' => now()]);

        $assignment = ClassAssignment::create([
            'class_id'        => $class->id,
            'user_id'         => $data['user_id'],
            'assignment_role' => 'wali_kelas',
            'assigned_at'     => $data['assigned_at'] ?? now(),
        ]);

        AuditService::log('wali_kelas_assigned', 'class_assignments', $assignment->id, [
            'class_id' => $class->id,
            'user_id'  => $data['user_id'],
        ]);

        return response()->json([
            'success'    => true,
            'message'    => 'Wali kelas berhasil ditugaskan.',
            'request_id' => app('request.id'),
            'data'       => $assignment->load(['user', 'class']),
        ]);
    }
}
