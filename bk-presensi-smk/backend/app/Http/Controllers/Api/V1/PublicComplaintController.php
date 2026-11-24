<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Violation;
use App\Services\AuditService;
use App\Services\ComplaintService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicComplaintController extends Controller
{
    public function __construct(private readonly ComplaintService $complaintService) {}

    /**
     * Get list of active classes for student complaint form dropdown.
     */
    public function getClasses(): JsonResponse
    {
        $classes = SchoolClass::where('is_active', true)
            ->orderBy('grade_level')
            ->orderBy('name')
            ->get(['id', 'name', 'grade_level']);

        return response()->json([
            'success'    => true,
            'message'    => 'Daftar kelas aktif.',
            'request_id' => app()->bound('request.id') ? app('request.id') : null,
            'data'       => $classes,
        ]);
    }

    /**
     * Get list of active students in a specific class.
     */
    public function getStudentsByClass(int $classId): JsonResponse
    {
        $class = SchoolClass::findOrFail($classId);

        $students = Student::where('class_id', $class->id)
            ->where('enrollment_status', 'aktif')
            ->orderBy('name')
            ->get(['id', 'name', 'nis']);

        return response()->json([
            'success'    => true,
            'message'    => 'Daftar siswa kelas ' . $class->name,
            'request_id' => app()->bound('request.id') ? app('request.id') : null,
            'data'       => $students,
        ]);
    }

    /**
     * Get list of active master violations (with points) for student complaint form.
     */
    public function getViolations(): JsonResponse
    {
        $violations = Violation::where('is_active', true)
            ->orderByDesc('points')
            ->orderBy('name')
            ->get(['id', 'name', 'description', 'points']);

        return response()->json([
            'success'    => true,
            'message'    => 'Daftar jenis pelanggaran aktif.',
            'request_id' => app()->bound('request.id') ? app('request.id') : null,
            'data'       => $violations,
        ]);
    }

    /**
     * Submit a public complaint from the student barcode form.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reporter_class_id'   => ['required', 'integer', 'exists:classes,id'],
            'reporter_student_id' => ['required', 'integer', 'exists:students,id'],
            'class_id'            => ['required', 'integer', 'exists:classes,id'],
            'student_id'          => ['required', 'integer', 'exists:students,id'],
            'violation_ids'       => ['nullable', 'array'],
            'violation_ids.*'     => ['integer', 'exists:violations,id'],
            'manual_violation'    => ['nullable', 'string', 'max:500'],
            'chronology'          => ['required', 'string', 'min:10', 'max:5000'],
            'incident_at'         => ['required', 'date'],
            'attachment'          => ['required', 'file', 'mimes:jpeg,png,jpg,webp,pdf', 'max:5120'],
        ], [
            'reporter_class_id.required'   => 'Pilih kelas Anda sebagai pelapor.',
            'reporter_student_id.required' => 'Pilih nama Anda sebagai pelapor untuk mencegah laporan palsu/fitnah.',
            'class_id.required'            => 'Pilih kelas siswa yang ingin dilaporkan.',
            'student_id.required'          => 'Pilih nama siswa yang ingin dilaporkan.',
            'chronology.required'          => 'Jelaskan kronologi atau keterangan kejadian.',
            'chronology.min'               => 'Keterangan kejadian minimal 10 karakter.',
            'incident_at.required'         => 'Tentukan tanggal atau waktu kejadian.',
            'attachment.required'          => 'Lampiran bukti foto kejadian wajib diunggah.',
            'attachment.file'              => 'Berkas lampiran harus berupa file yang valid.',
            'attachment.mimes'             => 'Format file bukti harus berupa foto (JPG, PNG, WEBP) atau PDF.',
            'attachment.max'               => 'Ukuran file bukti maksimal 5 MB.',
        ]);

        $violationIds = array_values(array_unique(array_map('intval', $data['violation_ids'] ?? [])));
        $manualViolation = trim((string) ($data['manual_violation'] ?? ''));

        if (empty($violationIds) && mb_strlen($manualViolation) < 3) {
            return response()->json([
                'success'    => false,
                'message'    => 'Pilih minimal satu jenis pelanggaran atau tuliskan jenis pelanggaran lainnya (minimal 3 karakter).',
                'error_code' => 'VIOLATION_REQUIRED',
                'request_id' => app()->bound('request.id') ? app('request.id') : null,
            ], 422);
        }

        $reporterStudent = Student::with('class')
            ->where('id', $data['reporter_student_id'])
            ->where('class_id', $data['reporter_class_id'])
            ->first();

        if (!$reporterStudent) {
            return response()->json([
                'success'    => false,
                'message'    => 'Identitas siswa pelapor tidak cocok dengan kelas yang dipilih.',
                'error_code' => 'REPORTER_CLASS_MISMATCH',
                'request_id' => app()->bound('request.id') ? app('request.id') : null,
            ], 422);
        }

        $student = Student::with('class')
            ->where('id', $data['student_id'])
            ->where('class_id', $data['class_id'])
            ->first();

        if (!$student) {
            return response()->json([
                'success'    => false,
                'message'    => 'Siswa yang dilaporkan tidak terdaftar di kelas tersebut.',
                'error_code' => 'STUDENT_CLASS_MISMATCH',
                'request_id' => app()->bound('request.id') ? app('request.id') : null,
            ], 422);
        }

        if ((int) $reporterStudent->id === (int) $student->id) {
            return response()->json([
                'success'    => false,
                'message'    => 'Siswa pelapor dan siswa yang dilaporkan tidak boleh orang yang sama.',
                'error_code' => 'SELF_REPORT_NOT_ALLOWED',
                'request_id' => app()->bound('request.id') ? app('request.id') : null,
            ], 422);
        }

        $reporterClassName = $reporterStudent->class?->name ?: 'Kelas Terdaftar';
        $reporterName = "{$reporterStudent->name} (NIS: {$reporterStudent->nis} • {$reporterClassName})";

        $complaintData = [
            'student_id'       => $student->id,
            'class_id'         => $student->class_id,
            'violation_ids'    => $violationIds,
            'manual_violation' => $manualViolation !== '' ? $manualViolation : null,
            'reporter_name'    => $reporterName,
            'chronology'       => $data['chronology'],
            'incident_at'      => $data['incident_at'],
            'parent_visible'   => false,
        ];

        $complaint = $this->complaintService->createComplaint($complaintData);

        if ($request->hasFile('attachment')) {
            $this->complaintService->storeAttachment($complaint, $request->file('attachment'));
        }

        $violationItems = $this->complaintService->getComplaintViolationItems($complaint);
        $totalPoints = $this->complaintService->calculateComplaintPoints($complaint);
        $violationSummary = collect($violationItems)->pluck('name')->join(', ');

        AuditService::log('public_complaint_submitted', 'complaints', $complaint->id, [
            'code'             => $complaint->complaint_code,
            'student'          => $student->name,
            'class'            => $student->class?->name,
            'violation_ids'    => $violationIds,
            'manual_violation' => $manualViolation,
            'total_points'     => $totalPoints,
            'reporter'         => $reporterName,
        ]);

        return response()->json([
            'success'    => true,
            'message'    => 'Pengaduan berhasil dikirim ke Guru BK. Identitas pelapor dijaga kerahasiaannya dan hanya diketahui oleh Guru BK.',
            'request_id' => app()->bound('request.id') ? app('request.id') : null,
            'data'       => [
                'complaint_code'   => $complaint->complaint_code,
                'reporter_name'    => $reporterName,
                'student_name'     => $student->name,
                'class_name'       => $student->class?->name,
                'manual_violation' => $violationSummary ?: $complaint->manual_violation,
                'total_points'     => $totalPoints,
                'violations'       => $violationItems,
                'incident_at'      => $complaint->incident_at?->toDateString(),
                'status'           => $complaint->status,
                'created_at'       => $complaint->created_at?->toIso8601String(),
            ],
        ], 201);
    }
}
