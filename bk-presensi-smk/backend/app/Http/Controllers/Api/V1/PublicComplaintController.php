<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\SchoolClass;
use App\Models\Student;
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
     * Submit a public complaint from the student barcode form.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'class_id'         => ['required', 'integer', 'exists:classes,id'],
            'student_id'       => ['required', 'integer', 'exists:students,id'],
            'manual_violation' => ['required', 'string', 'min:3', 'max:255'],
            'chronology'       => ['required', 'string', 'min:10', 'max:5000'],
            'incident_at'      => ['required', 'date'],
            'reporter_name'    => ['nullable', 'string', 'max:150'],
            'attachment'       => ['required', 'file', 'mimes:jpeg,png,jpg,webp,pdf', 'max:5120'],
        ], [
            'class_id.required'         => 'Pilih kelas siswa yang ingin dilaporkan.',
            'student_id.required'       => 'Pilih nama siswa yang ingin dilaporkan.',
            'manual_violation.required' => 'Tuliskan jenis pelanggaran yang terjadi (misal: merokok, bolos, membawa handphone, dll).',
            'chronology.required'       => 'Jelaskan kronologi atau keterangan kejadian.',
            'chronology.min'            => 'Keterangan kejadian minimal 10 karakter.',
            'incident_at.required'      => 'Tentukan tanggal atau waktu kejadian.',
            'attachment.required'       => 'Lampiran bukti foto kejadian wajib diunggah.',
            'attachment.file'           => 'Berkas lampiran harus berupa file yang valid.',
            'attachment.mimes'          => 'Format file bukti harus berupa foto (JPG, PNG, WEBP) atau PDF.',
            'attachment.max'            => 'Ukuran file bukti maksimal 5 MB.',
        ]);

        $student = Student::where('id', $data['student_id'])
            ->where('class_id', $data['class_id'])
            ->first();

        if (!$student) {
            return response()->json([
                'success'    => false,
                'message'    => 'Siswa yang dipilih tidak terdaftar di kelas tersebut.',
                'error_code' => 'STUDENT_CLASS_MISMATCH',
                'request_id' => app()->bound('request.id') ? app('request.id') : null,
            ], 422);
        }

        $reporterName = !empty($data['reporter_name']) && trim($data['reporter_name']) !== ''
            ? trim($data['reporter_name'])
            : 'Siswa (Anonim / Terlindungi)';

        $complaintData = [
            'student_id'       => $student->id,
            'class_id'         => $student->class_id,
            'manual_violation' => $data['manual_violation'],
            'reporter_name'    => $reporterName,
            'chronology'       => $data['chronology'],
            'incident_at'      => $data['incident_at'],
            'parent_visible'   => false,
        ];

        $complaint = $this->complaintService->createComplaint($complaintData);

        if ($request->hasFile('attachment')) {
            $this->complaintService->storeAttachment($complaint, $request->file('attachment'));
        }

        AuditService::log('public_complaint_submitted', 'complaints', $complaint->id, [
            'code'             => $complaint->complaint_code,
            'student'          => $student->name,
            'class'            => $student->class?->name,
            'manual_violation' => $data['manual_violation'],
            'reporter'         => $reporterName,
        ]);

        return response()->json([
            'success'    => true,
            'message'    => 'Pengaduan berhasil dikirim ke Guru BK. Laporan Anda dijaga kerahasiaannya.',
            'request_id' => app()->bound('request.id') ? app('request.id') : null,
            'data'       => [
                'complaint_code'   => $complaint->complaint_code,
                'student_name'     => $student->name,
                'class_name'       => $student->class?->name,
                'manual_violation' => $complaint->manual_violation,
                'incident_at'      => $complaint->incident_at?->toDateString(),
                'status'           => $complaint->status,
                'created_at'       => $complaint->created_at?->toIso8601String(),
            ],
        ], 201);
    }
}
