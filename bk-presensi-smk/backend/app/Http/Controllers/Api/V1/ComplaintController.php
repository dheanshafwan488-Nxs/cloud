<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\ComplaintAttachment;
use App\Models\CaseFollowup;
use App\Models\Setting;
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
                       ->orWhereHas('student', fn($sq) =>
                           $sq->where('name', 'like', "%{$s}%")
                              ->orWhere('nis', 'like', "%{$s}%")
                       )
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
            'student_id'       => ['required', 'integer', 'exists:students,id'],
            'reporter_name'    => ['nullable', 'string', 'max:200'],
            'manual_violation' => ['nullable', 'string', 'max:500'],
            'chronology'       => ['required', 'string', 'min:10', 'max:5000'],
            'incident_at'      => ['required', 'date'],
            'violation_ids'    => ['nullable', 'array'],
            'violation_ids.*'  => ['integer', 'exists:violations,id'],
            'parent_visible'   => ['boolean'],
            'attachment'       => ['required', 'file', 'mimes:jpeg,png,jpg,webp,pdf', 'max:5120'],
        ], [
            'attachment.required' => 'Lampiran bukti foto atau dokumen wajib diunggah.',
            'attachment.mimes'    => 'Format lampiran harus berupa foto (JPG, PNG, WEBP) atau PDF.',
            'attachment.max'      => 'Ukuran file lampiran maksimal 5 MB.',
        ]);

        $student  = \App\Models\Student::findOrFail($data['student_id']);
        $data['class_id'] = $student->class_id;

        $complaint = $this->complaintService->createComplaint($data);

        if ($request->hasFile('attachment')) {
            $this->complaintService->storeAttachment($complaint, $request->file('attachment'));
        }

        return response()->json([
            'success'    => true,
            'message'    => 'Pengaduan berhasil dibuat.',
            'request_id' => app('request.id'),
            'data'       => $complaint->load('attachments'),
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

        $payload = $complaint->toArray();
        $payload['violation_items'] = $this->complaintService->getComplaintViolationItems($complaint);
        $payload['total_points'] = $this->complaintService->calculateComplaintPoints($complaint);
        $payload['student_cumulative_points'] = $this->complaintService->calculateStudentCumulativePoints($complaint->student_id);

        return response()->json([
            'success'    => true,
            'message'    => 'Detail pengaduan.',
            'request_id' => app('request.id'),
            'data'       => $payload,
        ]);
    }

    public function updateViolations(Request $request, Complaint $complaint): JsonResponse
    {
        if (!Auth::user()->isAdmin() && !Auth::user()->isGuruBk()) {
            abort(403, 'Tidak memiliki izin untuk mengubah pelanggaran kasus.');
        }

        $data = $request->validate([
            'violation_ids'    => ['nullable', 'array'],
            'violation_ids.*'  => ['integer', 'exists:violations,id'],
            'manual_violation' => ['nullable', 'string', 'max:500'],
        ]);

        $updated = $this->complaintService->syncViolations(
            $complaint,
            $data['violation_ids'] ?? [],
            $data['manual_violation'] ?? null
        );

        $violationItems = $this->complaintService->getComplaintViolationItems($updated);
        $totalPoints = $this->complaintService->calculateComplaintPoints($updated);
        $cumulativePoints = $this->complaintService->calculateStudentCumulativePoints($updated->student_id);

        return response()->json([
            'success'    => true,
            'message'    => 'Pelanggaran dan bobot poin kasus berhasil diperbarui.',
            'request_id' => app('request.id'),
            'data'       => [
                'id'                        => $updated->id,
                'manual_violation'          => $updated->manual_violation,
                'violations'                => $updated->violations,
                'violation_items'           => $violationItems,
                'total_points'              => $totalPoints,
                'student_cumulative_points' => $cumulativePoints,
            ],
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

    public function downloadAttachment(Request $request, Complaint $complaint, ComplaintAttachment $attachment): \Symfony\Component\HttpFoundation\StreamedResponse
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

        $headers = [
            'Content-Type' => $attachment->mime_type ?: 'application/octet-stream',
        ];

        if ($request->boolean('download')) {
            return Storage::disk('private')->download(
                $attachment->storage_path,
                $attachment->original_name,
                $headers
            );
        }

        return Storage::disk('private')->response(
            $attachment->storage_path,
            $attachment->original_name,
            $headers
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
        $violationItems = $this->complaintService->getComplaintViolationItems($c);
        $totalPoints = (int) collect($violationItems)->sum('points');

        return [
            'id'               => $c->id,
            'complaint_code'   => $c->complaint_code,
            'student_id'       => $c->student_id,
            'student_name'     => $c->student?->name,
            'student_nis'      => $c->student?->nis,
            'class_id'         => $c->class_id,
            'class_name'       => $c->class?->name,
            'status'           => $c->status,
            'parent_visible'   => (bool) $c->parent_visible,
            'incident_at'      => $c->incident_at,
            'assigned_to'      => $c->assignedTo?->name,
            'reporter_name'    => $c->reporter_name ?? ($c->reportedBy?->name ?? 'Siswa (Anonim)'),
            'manual_violation' => $c->manual_violation,
            'total_points'     => $totalPoints,
            'violation_items'  => $violationItems,
            'violations'       => $c->violations->map(fn($v) => [
                'id'     => $v->id,
                'name'   => $v->name,
                'points' => (int) ($v->pivot->points_snapshot ?? $v->points),
            ])->values(),
            'created_at'       => $c->created_at,
        ];
    }

    public function saveLetterDefaults(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'letter_kepsek_name'  => ['nullable', 'string', 'max:150'],
            'letter_kepsek_nip'   => ['nullable', 'string', 'max:80'],
            'letter_kepsek_title' => ['nullable', 'string', 'max:100'],
            'letter_gurubk_name'  => ['nullable', 'string', 'max:150'],
            'letter_gurubk_nip'   => ['nullable', 'string', 'max:80'],
            'letter_gurubk_title' => ['nullable', 'string', 'max:100'],
            'letter_counselor'    => ['nullable', 'string', 'max:150'],
            'letter_room'         => ['nullable', 'string', 'max:200'],
            'letter_time'         => ['nullable', 'string', 'max:100'],
            'letter_city'         => ['nullable', 'string', 'max:100'],
        ]);

        foreach ($validated as $key => $value) {
            Setting::set($key, $value ?? '');
        }

        AuditService::log('letter_defaults_updated', 'settings', null, $validated);

        return response()->json([
            'success'    => true,
            'message'    => 'Pengaturan default naskah & penandatangan surat berhasil disimpan.',
            'request_id' => app('request.id'),
            'data'       => $validated,
        ]);
    }

    public function generateLetter(Request $request, Complaint $complaint): JsonResponse
    {
        $type = $request->query('type', 'panggilan'); // panggilan, sp1, sp2, sp3
        $student = $complaint->student->load('class');
        $settings = Setting::getAllSettings();

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

        $violationItems = $this->complaintService->getComplaintViolationItems($complaint);
        $thisComplaintPoints = (int) collect($violationItems)->sum('points');
        $cumulativePoints = $this->complaintService->calculateStudentCumulativePoints($student->id);

        $waliKelas = null;
        if ($student->class_id) {
            $assignment = \App\Models\ClassAssignment::where('class_id', $student->class_id)
                ->where('assignment_role', 'wali_kelas')
                ->whereNull('ended_at')
                ->with('user')
                ->first();
            $waliKelas = $assignment?->user?->name;
        }

        $scheduledDate = now()->addDays(2);
        if ($scheduledDate->isWeekend()) {
            $scheduledDate->addDays($scheduledDate->isSaturday() ? 2 : 1);
        }

        $defaultGuruBkName = !empty($settings['letter_gurubk_name'])
            ? $settings['letter_gurubk_name']
            : (Auth::user()->name ?: 'Hj. Siti Rahmawati, S.Pd., Kons.');
        $defaultCounselor = !empty($settings['letter_counselor'])
            ? $settings['letter_counselor']
            : $defaultGuruBkName;

        return response()->json([
            'success'    => true,
            'message'    => 'Data surat resmi berhasil digenerate.',
            'request_id' => app('request.id'),
            'data'       => [
                'letter_number'     => $letterNumber,
                'letter_type'       => $type,
                'letter_title'      => $title,
                'issued_date'       => now()->locale('id')->isoFormat('D MMMM Y'),
                'letter_city'       => !empty($settings['letter_city']) ? $settings['letter_city'] : 'Karawang',
                'school'            => [
                    'name'       => !empty($settings['school_name']) ? $settings['school_name'] : 'SMK IPTEK SANGGABUANA',
                    'npsn'       => '20268901',
                    'akreditasi' => 'A (Unggul)',
                    'address'    => !empty($settings['school_address']) ? $settings['school_address'] : 'Jl. Terusan Pangrango No. 45, Karawang, Jawa Barat 41371',
                    'phone'      => !empty($settings['school_phone']) ? $settings['school_phone'] : '(0267) 845-6789',
                    'email'      => !empty($settings['school_email']) ? $settings['school_email'] : 'bk@smkiptek.sch.id',
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
                    'code'             => $complaint->complaint_code,
                    'incident_at'      => \Illuminate\Support\Carbon::parse($complaint->incident_at)->locale('id')->isoFormat('dddd, D MMMM Y'),
                    'chronology'       => $complaint->chronology,
                    'manual_violation' => $complaint->manual_violation,
                    'reporter_name'    => $complaint->reporter_name,
                    'violations'       => collect($violationItems)->map(fn($item) => [
                        'name'   => $item['name'],
                        'points' => $item['points'],
                    ])->values(),
                ],
                'schedule'          => [
                    'date'      => $scheduledDate->toDateString(),
                    'date_text' => $scheduledDate->locale('id')->isoFormat('dddd, D MMMM Y'),
                    'time'      => !empty($settings['letter_time']) ? $settings['letter_time'] : '09.00 - 11.30 WIB',
                    'room'      => !empty($settings['letter_room']) ? $settings['letter_room'] : 'Ruang Bimbingan & Konseling (Gedung Utama Lt. 2)',
                    'counselor' => $defaultCounselor,
                ],
                'signatories'       => [
                    'kepala_sekolah' => [
                        'title' => !empty($settings['letter_kepsek_title']) ? $settings['letter_kepsek_title'] : 'Kepala Sekolah',
                        'name'  => !empty($settings['letter_kepsek_name']) ? $settings['letter_kepsek_name'] : 'Drs. H. Mulyadi, M.Pd.',
                        'nip'   => !empty($settings['letter_kepsek_nip']) ? $settings['letter_kepsek_nip'] : 'NIP. 19740512 199803 1 004',
                    ],
                    'guru_bk' => [
                        'title' => !empty($settings['letter_gurubk_title']) ? $settings['letter_gurubk_title'] : 'Koordinator Guru BK',
                        'name'  => $defaultGuruBkName,
                        'nip'   => !empty($settings['letter_gurubk_nip']) ? $settings['letter_gurubk_nip'] : 'NIP. 19820315 200801 2 007',
                    ],
                ],
                'qr_verification'   => 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' . urlencode('VERIFIED-DOC: SMK IPTEK SANGGABUANA - ' . $complaint->complaint_code . ' - ' . $letterNumber),
            ],
        ]);
    }
}
