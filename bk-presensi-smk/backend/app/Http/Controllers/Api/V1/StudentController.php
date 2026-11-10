<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\SchoolClass;
use App\Models\ParentVerificationCode;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search'   => ['nullable', 'string', 'max:100'],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'status'   => ['nullable', Rule::in(['aktif', 'lulus', 'pindah', 'nonaktif'])],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:500'],
            'all'      => ['nullable', 'boolean'],
        ]);

        $query = Student::with(['class.academicYear'])
            ->when($request->search, fn($q, $s) =>
                $q->where(fn($q2) =>
                    $q2->where('name', 'like', "%{$s}%")->orWhere('nis', 'like', "%{$s}%")
                )
            )
            ->when($request->class_id, fn($q, $c) => $q->where('class_id', $c))
            ->when($request->status, fn($q, $s) => $q->where('enrollment_status', $s))
            ->when(Auth::user()->isWaliKelas(), function ($q) {
                $classIds = Auth::user()->activeClassAssignments()->pluck('class_id');
                $q->whereIn('class_id', $classIds);
            });

        if ($request->boolean('all')) {
            $students = $query->orderBy('name')->get();
            return response()->json([
                'success'    => true,
                'message'    => 'Data siswa berhasil diambil.',
                'request_id' => app('request.id'),
                'data'       => $students,
                'meta'       => [
                    'total' => $students->count(),
                ],
            ]);
        }

        $students = $query->orderBy('name')->paginate($request->integer('per_page', 20));

        return response()->json([
            'success'    => true,
            'message'    => 'Data siswa berhasil diambil.',
            'request_id' => app('request.id'),
            'data'       => $students->items(),
            'meta'       => [
                'current_page' => $students->currentPage(),
                'last_page'    => $students->lastPage(),
                'total'        => $students->total(),
                'per_page'     => $students->perPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nis'               => ['required', 'string', 'max:20', 'unique:students,nis'],
            'nisn'              => ['nullable', 'string', 'max:10', 'unique:students,nisn'],
            'name'              => ['required', 'string', 'max:150'],
            'gender'            => ['nullable', Rule::in(['L', 'P'])],
            'birth_date'        => ['nullable', 'date'],
            'class_id'          => ['required', 'integer', 'exists:classes,id'],
            'enrollment_status' => ['nullable', Rule::in(['aktif', 'lulus', 'pindah', 'nonaktif'])],
        ]);

        $student = Student::create($data);
        AuditService::log('student_created', 'students', $student->id, ['nis' => $student->nis]);

        return response()->json([
            'success'    => true,
            'message'    => 'Siswa berhasil ditambahkan.',
            'request_id' => app('request.id'),
            'data'       => $student->load('class'),
        ], 201);
    }

    public function show(Student $student): JsonResponse
    {
        return response()->json([
            'success'    => true,
            'message'    => 'Detail siswa.',
            'request_id' => app('request.id'),
            'data'       => $student->load(['class.academicYear', 'attendances' => fn($q) => $q->latest()->limit(10)]),
        ]);
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $data = $request->validate([
            'nis'               => ['sometimes', 'string', 'max:20', Rule::unique('students', 'nis')->ignore($student->id)],
            'nisn'              => ['nullable', 'string', 'max:10', Rule::unique('students', 'nisn')->ignore($student->id)],
            'name'              => ['sometimes', 'string', 'max:150'],
            'gender'            => ['nullable', Rule::in(['L', 'P'])],
            'birth_date'        => ['nullable', 'date'],
            'class_id'          => ['sometimes', 'integer', 'exists:classes,id'],
            'enrollment_status' => ['sometimes', Rule::in(['aktif', 'lulus', 'pindah', 'nonaktif'])],
        ]);

        $student->update($data);
        AuditService::log('student_updated', 'students', $student->id);

        return response()->json([
            'success'    => true,
            'message'    => 'Data siswa berhasil diperbarui.',
            'request_id' => app('request.id'),
            'data'       => $student->fresh(['class']),
        ]);
    }

    public function destroy(Student $student): JsonResponse
    {
        $student->update(['enrollment_status' => 'nonaktif']);
        $student->delete();
        AuditService::log('student_archived', 'students', $student->id);

        return response()->json([
            'success'    => true,
            'message'    => 'Siswa berhasil diarsipkan.',
            'request_id' => app('request.id'),
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file'     => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
        ]);

        $file = $request->file('file');
        $rows = array_map('str_getcsv', file($file->getPathname()));
        $header = array_shift($rows);
        $header = array_map('trim', $header);

        $results = ['success' => [], 'errors' => []];

        foreach ($rows as $i => $row) {
            if (count($row) < count($header)) continue;
            $data = array_combine($header, $row);
            $data = array_map('trim', $data);

            try {
                $validator = \Illuminate\Support\Facades\Validator::make(array_merge($data, ['class_id' => $request->class_id]), [
                    'nis'  => ['required', 'string', 'max:20', 'unique:students,nis'],
                    'name' => ['required', 'string', 'max:150'],
                ]);

                if ($validator->fails()) {
                    $results['errors'][] = ['row' => $i + 2, 'errors' => $validator->errors()->all()];
                    continue;
                }

                Student::create([
                    'nis'      => $data['nis'],
                    'name'     => $data['name'],
                    'nisn'     => $data['nisn'] ?? null,
                    'gender'   => $data['gender'] ?? null,
                    'class_id' => $request->class_id,
                    'enrollment_status' => 'aktif',
                ]);
                $results['success'][] = $data['nis'];
            } catch (\Throwable $e) {
                $results['errors'][] = ['row' => $i + 2, 'errors' => [$e->getMessage()]];
            }
        }

        return response()->json([
            'success'    => true,
            'message'    => 'Impor selesai.',
            'request_id' => app('request.id'),
            'data'       => $results,
        ]);
    }

    public function importTemplate(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $headers = ['nis', 'name', 'nisn', 'gender', 'birth_date'];
        $filename = 'template_import_siswa.csv';

        return response()->streamDownload(function () use ($headers) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $headers);
            fputcsv($out, ['12345', 'Nama Siswa', '1234567890', 'L', '2008-01-01']);
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function getVerificationCode(Student $student): JsonResponse
    {
        $botUsername = env('TELEGRAM_BOT_USERNAME', 'SMKIptekSanggabuana_bot');

        $activeCode = ParentVerificationCode::where('student_id', $student->id)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->where('attempts_count', '<', 5)
            ->latest()
            ->first();

        if (!$activeCode) {
            $plainCode = strtoupper(Str::random(6));
            $activeCode = ParentVerificationCode::create([
                'student_id'     => $student->id,
                'plain_code'     => $plainCode,
                'code_hash'      => Hash::make($plainCode),
                'expires_at'     => now()->addDays(14),
                'issued_by'      => Auth::id() ?? 1,
                'attempts_count' => 0,
            ]);
        }

        $code = $activeCode->plain_code ?: 'DEMO123';
        $deepLink = "https://t.me/{$botUsername}?start=v_{$student->nis}_{$code}";
        $qrLink = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" . urlencode($deepLink);

        $parents = $student->telegramParents()->get()->map(fn($p) => [
            'id'                  => $p->id,
            'telegram_id'         => $p->telegram_id,
            'parent_name'         => $p->parent_name,
            'is_verified'         => $p->is_verified,
            'verified_at'         => $p->verified_at?->format('d M Y H:i'),
            'last_interaction_at' => $p->last_interaction_at?->format('d M Y H:i'),
        ]);

        return response()->json([
            'success'    => true,
            'message'    => 'Data akses verifikasi orang tua.',
            'request_id' => app('request.id'),
            'data'       => [
                'student_id'           => $student->id,
                'student_name'         => $student->name,
                'nis'                  => $student->nis,
                'class_name'           => $student->class?->name,
                'code'                 => $code,
                'expires_at'           => $activeCode->expires_at->toIso8601String(),
                'expires_at_formatted' => $activeCode->expires_at->locale('id')->isoFormat('dddd, D MMMM Y HH:mm'),
                'bot_username'         => $botUsername,
                'deep_link'            => $deepLink,
                'qr_link'              => $qrLink,
                'manual_command'       => "/verifikasi {$student->nis} {$code}",
                'parents'              => $parents,
                'is_connected'         => $parents->isNotEmpty(),
            ],
        ]);
    }

    public function generateVerificationCode(Student $student): JsonResponse
    {
        ParentVerificationCode::where('student_id', $student->id)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        $plainCode = strtoupper(Str::random(6));
        $newCode = ParentVerificationCode::create([
            'student_id'     => $student->id,
            'plain_code'     => $plainCode,
            'code_hash'      => Hash::make($plainCode),
            'expires_at'     => now()->addDays(14),
            'issued_by'      => Auth::id() ?? 1,
            'attempts_count' => 0,
        ]);

        AuditService::log('parent_code_generated', 'parent_verification_codes', $newCode->id, [
            'student_id' => $student->id,
        ]);

        return $this->getVerificationCode($student);
    }
}
