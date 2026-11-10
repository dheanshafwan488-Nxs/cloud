<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\ComplaintAttachment;
use App\Models\CaseFollowup;
use App\Services\ComplaintService;
use App\Services\AuditService;
use App\Services\TelegramNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ComplaintController extends Controller
{
    public function __construct(private readonly ComplaintService $complaintService) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search'    => ['nullable', 'string', 'max:50'],
            'status'    => ['nullable', Rule::in(['Pending', 'Diproses', 'Selesai'])],
            'class_id'  => ['nullable', 'integer', 'exists:classes,id'],
            'date_from' => ['nullable', 'date'],
            'date_to'   => ['nullable', 'date'],
            'per_page'  => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $user = Auth::user();
        $query = Complaint::with(['student', 'class', 'assignedTo', 'violations'])
            ->when($request->search, fn($q, $s) =>
                $q->where(fn($q2) =>
                    $q2->where('complaint_code', 'like', "%{$s}%")
                       ->orWhereHas('student', fn($sq) => $sq->where('name', 'like', "%{$s}%"))
                )
            )
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->class_id, fn($q, $c) => $q->where('class_id', $c))
            ->when($request->date_from, fn($q, $d) => $q->where('incident_at', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('incident_at', '<=', $d . ' 23:59:59'));

        if ($user->isWaliKelas()) {
            $classIds = $user->activeClassAssignments()->pluck('class_id');
            $query->whereIn('class_id', $classIds);
        } elseif ($user->isSiswa()) {
            $student = \App\Models\Student::where('user_id', $user->id)->first();
            $query->where(function ($q2) use ($student, $user) {
                if ($student) {
                    $q2->where('student_id', $student->id);
                }
                $q2->orWhere('reported_by', $user->id);
            });
        }

        $complaints = $query->orderByDesc('created_at')->paginate($request->integer('per_page', 20));

        return response()->json([
            'success'    => true,
            'message'    => 'Data pengaduan.',
            'request_id' => app('request.id'),
            'data'       => $complaints->map(fn($c) => $this->formatListItem($c)),
            'meta'       => [
                'current_page' => $complaints->currentPage(),
                'last_page'    => $complaints->lastPage(),
                'total'        => $complaints->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id'    => ['required', 'integer', 'exists:students,id'],
            'chronology'    => ['required', 'string', 'min:20', 'max:5000'],
            'incident_at'   => ['required', 'date'],
            'violation_ids' => ['nullable', 'array'],
            'violation_ids.*' => ['integer', 'exists:violations,id'],
            'parent_visible' => ['boolean'],
        ]);

        $student  = \App\Models\Student::findOrFail($data['student_id']);
        $data['class_id'] = $student->class_id;

        $complaint = $this->complaintService->createComplaint($data);

        return response()->json([
            'success'    => true,
            'message'    => 'Pengaduan berhasil dibuat.',
            'request_id' => app('request.id'),
            'data'       => $complaint,
        ], 201);
    }

    public function show(Complaint $complaint): JsonResponse
    {
        $user = Auth::user();

        // Wali kelas can only see their own class complaints
        if ($user->isWaliKelas()) {
            $classIds = $user->activeClassAssignments()->pluck('class_id');
            if (!$classIds->contains($complaint->class_id)) {
                abort(403, 'Tidak memiliki akses ke pengaduan ini.');
            }
        }

        $complaint->load([
            'student.class', 'class', 'reportedBy', 'assignedTo',
            'violations', 'attachments.uploadedBy', 'statusHistories.changedBy',
            'followups' => fn($q) => $user->isWaliKelas()
                ? $q->where('parent_visible', true)
                : $q,
            'followups.user',
        ]);

        return response()->json([
            'success'    => true,
            'message'    => 'Detail pengaduan.',
            'request_id' => app('request.id'),
            'data'       => $complaint,
        ]);
    }

    public function changeStatus(Request $request, Complaint $complaint): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['Pending', 'Diproses', 'Selesai'])],
            'note'   => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = $this->complaintService->changeStatus($complaint, $data['status'], $data['note'] ?? null);

        return response()->json([
            'success'    => true,
            'message'    => 'Status pengaduan berhasil diubah.',
            'request_id' => app('request.id'),
            'data'       => $updated,
        ]);
    }

    public function addFollowup(Request $request, Complaint $complaint): JsonResponse
    {
        $data = $request->validate([
            'followup_type'  => ['required', 'string', 'max:50'],
            'notes'          => ['required', 'string', 'min:5', 'max:3000'],
            'parent_visible' => ['boolean'],
            'followed_up_at' => ['nullable', 'date'],
        ]);

        $followup = CaseFollowup::create([
            'complaint_id'   => $complaint->id,
            'user_id'        => Auth::id(),
            'followup_type'  => $data['followup_type'],
            'notes'          => $data['notes'],
            'parent_visible' => $data['parent_visible'] ?? false,
            'followed_up_at' => $data['followed_up_at'] ?? now(),
        ]);

        AuditService::log('followup_added', 'case_followups', $followup->id, [
            'complaint_id' => $complaint->id,
        ]);

        if ($followup->parent_visible) {
            TelegramNotificationService::notifyCaseFollowup($complaint->load('student.class'), $followup);
        }

        return response()->json([
            'success'    => true,
            'message'    => 'Tindak lanjut berhasil ditambahkan.',
            'request_id' => app('request.id'),
            'data'       => $followup->load('user'),
        ], 201);
    }

    public function uploadAttachment(Request $request, Complaint $complaint): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:jpeg,png,webp,pdf', 'max:5120'],
        ]);

        $attachment = $this->complaintService->storeAttachment($complaint, $request->file('file'));

        return response()->json([
            'success'    => true,
            'message'    => 'Lampiran berhasil diunggah.',
            'request_id' => app('request.id'),
            'data'       => [
                'id'            => $attachment->id,
                'original_name' => $attachment->original_name,
                'mime_type'     => $attachment->mime_type,
                'file_size'     => $attachment->file_size,
            ],
        ], 201);
    }

    public function downloadAttachment(Complaint $complaint, ComplaintAttachment $attachment): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        if ($attachment->complaint_id !== $complaint->id) {
            abort(404);
        }

        $user = Auth::user();
        if ($user->isWaliKelas()) {
            $classIds = $user->activeClassAssignments()->pluck('class_id');
            if (!$classIds->contains($complaint->class_id)) {
                abort(403);
            }
        }

        abort_unless(Storage::disk('private')->exists($attachment->storage_path), 404);

        return Storage::disk('private')->download(
            $attachment->storage_path,
            $attachment->original_name
        );
    }

    public function destroy(Complaint $complaint): JsonResponse
    {
        if (!Auth::user()->isAdmin() && !Auth::user()->isGuruBk()) {
            abort(403, 'Tidak memiliki izin untuk menghapus pengaduan.');
        }

        if ($complaint->status !== 'Pending') {
            return response()->json([
                'success'    => false,
                'message'    => 'Pengaduan yang sedang diproses atau selesai tidak dapat dihapus.',
                'error_code' => 'COMPLAINT_NOT_DELETABLE',
                'request_id' => app('request.id'),
            ], 422);
        }

        AuditService::log('complaint_deleted', 'complaints', $complaint->id, [
            'code' => $complaint->complaint_code,
        ]);

        $complaint->delete();

        return response()->json([
            'success'    => true,
            'message'    => 'Pengaduan berhasil diarsipkan.',
            'request_id' => app('request.id'),
        ]);
    }

    private function formatListItem(Complaint $c): array
    {
        return [
            'id'             => $c->id,
            'complaint_code' => $c->complaint_code,
            'student_name'   => $c->student?->name,
            'class_name'     => $c->class?->name,
            'status'         => $c->status,
            'incident_at'    => $c->incident_at,
            'assigned_to'    => $c->assignedTo?->name,
            'created_at'     => $c->created_at,
        ];
    }

    public function generateLetter(Request $request, Complaint $complaint): JsonResponse
    {
        $type = $request->query('type', 'panggilan'); // panggilan, sp1, sp2, sp3
        $student = $complaint->student->load('class');

        $titles = [
            'panggilan' => 'SURAT PANGGILAN ORANG TUA / WALI MURID',
            'sp1'       => 'SURAT PERINGATAN PERTAMA (SP - 1)',
            'sp2'       => 'SURAT PERINGATAN KEDUA (SP - 2)',
            'sp3'       => 'SURAT PERINGATAN KETIGA / TERAKHIR (SP - 3)',
        ];

        $title = $titles[$type] ?? $titles['panggilan'];
        $monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][now()->month - 1];
        $year = now()->year;
        $cleanId = str_pad((string)$complaint->id, 3, '0', STR_PAD_LEFT);
        $typeCode = strtoupper($type === 'panggilan' ? 'PGL' : $type);
        $letterNumber = "421.5/{$cleanId}/SMK-IPTEK/BK-{$typeCode}/{$monthRoman}/{$year}";

        $cumulativePoints = \App\Models\Complaint::where('student_id', $student->id)
            ->with('violations')
            ->get()
            ->sum(fn($comp) => $comp->violations->sum('pivot.points_snapshot'));

        $thisComplaintPoints = $complaint->violations->sum('pivot.points_snapshot');

        $waliKelas = null;
        if ($student->class_id) {
            $assignment = \App\Models\ClassAssignment::where('class_id', $student->class_id)
                ->where('role_in_class', 'wali_kelas')
                ->where('is_active', true)
                ->with('user')
                ->first();
            $waliKelas = $assignment?->user?->name;
        }

        $scheduledDate = now()->addDays(2);
        if ($scheduledDate->isWeekend()) {
            $scheduledDate->addDays($scheduledDate->isSaturday() ? 2 : 1);
        }

        return response()->json([
            'success'    => true,
            'message'    => 'Data surat resmi berhasil digenerate.',
            'request_id' => app('request.id'),
            'data'       => [
                'letter_number'     => $letterNumber,
                'letter_type'       => $type,
                'letter_title'      => $title,
                'issued_date'       => now()->locale('id')->isoFormat('D MMMM Y'),
                'school'            => [
                    'name'       => 'SMK IPTEK SANGGABUANA',
                    'npsn'       => '20268901',
                    'akreditasi' => 'A (Unggul)',
                    'address'    => 'Jl. Terusan Pangrango No. 45, Karawang, Jawa Barat 41371',
                    'phone'      => '(0267) 845-6789',
                    'email'      => 'bk@smkiptek.sch.id / smkiptek@gmail.com',
                    'website'    => 'https://smkiptek.sch.id',
                ],
                'student'           => [
                    'id'                => $student->id,
                    'name'              => $student->name,
                    'nis'               => $student->nis,
                    'nisn'              => $student->nisn ?: '-',
                    'class_name'        => $student->class?->name ?: '-',
                    'wali_kelas'        => $waliKelas ?: 'Wali Kelas ' . ($student->class?->name ?: ''),
                    'total_points'      => $thisComplaintPoints,
                    'cumulative_points' => $cumulativePoints,
                ],
                'complaint'         => [
                    'code'        => $complaint->complaint_code,
                    'incident_at' => \Illuminate\Support\Carbon::parse($complaint->incident_at)->locale('id')->isoFormat('dddd, D MMMM Y'),
                    'chronology'  => $complaint->chronology,
                    'violations'  => $complaint->violations->map(fn($v) => [
                        'name'   => $v->name,
                        'points' => $v->pivot->points_snapshot ?? $v->points,
                    ]),
                ],
                'schedule'          => [
                    'date'      => $scheduledDate->toDateString(),
                    'date_text' => $scheduledDate->locale('id')->isoFormat('dddd, D MMMM Y'),
                    'time'      => '09.00 - 11.30 WIB',
                    'room'      => 'Ruang Bimbingan & Konseling (Gedung Utama Lt. 2)',
                    'counselor' => Auth::user()->name ?: 'Guru BK SMK IPTEK SANGGABUANA',
                ],
                'signatories'       => [
                    'kepala_sekolah' => [
                        'title' => 'Kepala Sekolah',
                        'name'  => 'Drs. H. Mulyadi, M.Pd.',
                        'nip'   => 'NIP. 19740512 199803 1 004',
                    ],
                    'guru_bk' => [
                        'title' => 'Koordinator Guru BK',
                        'name'  => Auth::user()->name ?: 'Hj. Siti Rahmawati, S.Pd., Kons.',
                        'nip'   => 'NIP. 19820315 200801 2 007',
                    ],
                ],
                'qr_verification'   => 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' . urlencode('VERIFIED-DOC: SMK IPTEK SANGGABUANA - ' . $complaint->complaint_code . ' - ' . $letterNumber),
            ],
        ]);
    }
}
