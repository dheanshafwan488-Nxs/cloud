<?php

namespace App\Services;

use App\Models\Complaint;
use App\Models\ComplaintStatusHistory;
use App\Models\ComplaintAttachment;
use App\Models\Violation;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Http\UploadedFile;

class ComplaintService
{
    /**
     * Generate a unique complaint code like BK-2025-0001
     */
    public function generateCode(): string
    {
        $year   = now()->year;
        $prefix = "BK-{$year}-";
        $last   = Complaint::withTrashed()
            ->where('complaint_code', 'like', "{$prefix}%")
            ->count();
        return $prefix . str_pad($last + 1, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Create a new complaint and record initial status history.
     */
    public function createComplaint(array $data): Complaint
    {
        return DB::transaction(function () use ($data) {
            $complaint = Complaint::create([
                'complaint_code'      => $this->generateCode(),
                'student_id'          => $data['student_id'],
                'class_id'            => $data['class_id'],
                'reported_by_user_id' => Auth::id(),
                'reporter_name'       => $data['reporter_name'] ?? (Auth::user()?->name ?? 'Siswa (Anonim)'),
                'manual_violation'    => $data['manual_violation'] ?? null,
                'chronology'          => $data['chronology'],
                'incident_at'         => $data['incident_at'],
                'status'              => 'Pending',
                'parent_visible'      => $data['parent_visible'] ?? false,
            ]);

            ComplaintStatusHistory::create([
                'complaint_id' => $complaint->id,
                'changed_by'   => Auth::id(),
                'old_status'   => null,
                'new_status'   => 'Pending',
                'note'         => 'Pengaduan dibuat.',
                'request_id'   => app()->bound('request.id') ? app('request.id') : null,
            ]);

            // Attach violations with snapshot points
            $attachedIds = [];
            if (!empty($data['violation_ids'])) {
                $uniqueIds = array_values(array_unique(array_map('intval', $data['violation_ids'])));
                foreach ($uniqueIds as $vid) {
                    $v = Violation::find($vid);
                    if ($v) {
                        $complaint->violations()->attach($vid, ['points_snapshot' => $v->points]);
                        $attachedIds[] = $v->id;
                    }
                }
            }

            // If manual_violation contains items matching master violations not yet attached, attach them automatically
            if (!empty($data['manual_violation'])) {
                $masterViolations = Violation::all();
                foreach ($this->splitManualViolationItems($data['manual_violation']) as $item) {
                    $matched = $this->matchMasterViolation($item, $masterViolations);
                    if ($matched && !in_array($matched->id, $attachedIds, true)) {
                        $complaint->violations()->attach($matched->id, ['points_snapshot' => $matched->points]);
                        $attachedIds[] = $matched->id;
                    }
                }
            }

            AuditService::log('complaint_created', 'complaints', $complaint->id, [
                'code' => $complaint->complaint_code,
            ]);

            $loaded = $complaint->load(['student.class', 'violations', 'statusHistories']);

            if ($complaint->parent_visible) {
                TelegramNotificationService::notifyComplaint($loaded);
            }

            return $loaded;
        });
    }

    /**
     * Change the status of a complaint.
     */
    public function changeStatus(Complaint $complaint, string $newStatus, ?string $note = null): Complaint
    {
        return DB::transaction(function () use ($complaint, $newStatus, $note) {
            $oldStatus = $complaint->status;

            $complaint->update([
                'status'      => $newStatus,
                'resolved_at' => $newStatus === 'Selesai' ? now() : $complaint->resolved_at,
            ]);

            ComplaintStatusHistory::create([
                'complaint_id' => $complaint->id,
                'changed_by'   => Auth::id(),
                'old_status'   => $oldStatus,
                'new_status'   => $newStatus,
                'note'         => $note,
                'request_id'   => app()->bound('request.id') ? app('request.id') : null,
            ]);

            AuditService::log('complaint_status_changed', 'complaints', $complaint->id, [
                'old' => $oldStatus,
                'new' => $newStatus,
            ]);

            return $complaint->fresh();
        });
    }

    /**
     * Sync master violations & optional manual violation text on an existing complaint.
     */
    public function syncViolations(Complaint $complaint, array $violationIds, ?string $manualViolation = null): Complaint
    {
        return DB::transaction(function () use ($complaint, $violationIds, $manualViolation) {
            $uniqueIds = array_values(array_unique(array_map('intval', $violationIds)));
            $syncPayload = [];

            if (!empty($uniqueIds)) {
                $existingSnapshots = $complaint->violations()
                    ->pluck('complaint_violations.points_snapshot', 'violations.id');

                $violations = Violation::whereIn('id', $uniqueIds)->get()->keyBy('id');
                foreach ($uniqueIds as $vid) {
                    if ($violations->has($vid)) {
                        $syncPayload[$vid] = [
                            'points_snapshot' => $existingSnapshots->has($vid)
                                ? (int) $existingSnapshots->get($vid)
                                : (int) $violations->get($vid)->points,
                        ];
                    }
                }
            }

            $complaint->violations()->sync($syncPayload);

            $cleanManual = $manualViolation !== null ? trim($manualViolation) : null;
            $complaint->manual_violation = $cleanManual !== '' ? $cleanManual : null;
            $complaint->save();

            AuditService::log('complaint_violations_updated', 'complaints', $complaint->id, [
                'violation_ids'    => array_keys($syncPayload),
                'manual_violation' => $complaint->manual_violation,
            ]);

            return $complaint->fresh(['student.class', 'violations']);
        });
    }

    /**
     * Split comma-separated manual_violation string into clean non-empty items.
     */
    public function splitManualViolationItems(?string $manualViolation): array
    {
        if (!$manualViolation || trim($manualViolation) === '') {
            return [];
        }

        return array_values(array_filter(array_map('trim', explode(',', $manualViolation)), fn($s) => $s !== ''));
    }

    /**
     * Try to match a free-text violation string to a Master Violation record.
     */
    public function matchMasterViolation(string $text, ?Collection $masterViolations = null): ?Violation
    {
        $masterViolations = $masterViolations ?? Violation::all();
        $needle = mb_strtolower(trim($text));
        if ($needle === '') {
            return null;
        }

        // 1. Exact case-insensitive match
        foreach ($masterViolations as $v) {
            if (mb_strtolower(trim($v->name)) === $needle) {
                return $v;
            }
        }

        // 2. Direct substring containment
        foreach ($masterViolations as $v) {
            $vName = mb_strtolower(trim($v->name));
            if ($vName !== '' && (str_contains($needle, $vName) || str_contains($vName, $needle))) {
                return $v;
            }
        }

        // 3. Keyword-based matching for legacy quick tags & common phrasings
        $keywordGroups = [
            ['merokok', 'rokok'],
            ['merusak fasilitas', 'fasilitas', 'sarana'],
            ['perkelahian', 'tawuran', 'kekerasan', 'berkelahi'],
            ['bolos', 'membolos', 'tanpa keterangan'],
            ['handphone', 'membawa hp', 'hp saat', 'hp tanpa'],
            ['terlambat'],
            ['atribut'],
        ];

        foreach ($keywordGroups as $keywords) {
            $needleMatches = false;
            foreach ($keywords as $kw) {
                if (str_contains($needle, $kw)) {
                    $needleMatches = true;
                    break;
                }
            }
            if (!$needleMatches) {
                continue;
            }
            foreach ($masterViolations as $v) {
                $vName = mb_strtolower(trim($v->name));
                foreach ($keywords as $kw) {
                    if (str_contains($vName, $kw)) {
                        return $v;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Build deduplicated list of violation items with exact points for a complaint.
     * Combines attached master violations + any unmatched custom manual_violation items.
     */
    public function getComplaintViolationItems(Complaint $complaint, ?Collection $masterViolations = null): array
    {
        $complaint->loadMissing('violations');
        $masterViolations = $masterViolations ?? Violation::all();

        $items = [];
        $attachedIds = [];
        $attachedNamesLower = [];

        foreach ($complaint->violations as $v) {
            $pts = (int) ($v->pivot->points_snapshot ?? $v->points ?? 0);
            $items[] = [
                'id'        => $v->id,
                'name'      => $v->name,
                'points'    => $pts,
                'is_manual' => false,
            ];
            $attachedIds[] = $v->id;
            $attachedNamesLower[] = mb_strtolower(trim($v->name));
        }

        foreach ($this->splitManualViolationItems($complaint->manual_violation) as $manualText) {
            $lower = mb_strtolower($manualText);
            if (in_array($lower, $attachedNamesLower, true)) {
                continue;
            }

            $matched = $this->matchMasterViolation($manualText, $masterViolations);
            if ($matched) {
                if (in_array($matched->id, $attachedIds, true)) {
                    continue;
                }
                $items[] = [
                    'id'        => $matched->id,
                    'name'      => $manualText,
                    'points'    => (int) $matched->points,
                    'is_manual' => false,
                ];
                $attachedIds[] = $matched->id;
                $attachedNamesLower[] = mb_strtolower(trim($matched->name));
                $attachedNamesLower[] = $lower;
            } else {
                $items[] = [
                    'id'        => null,
                    'name'      => $manualText,
                    'points'    => 10,
                    'is_manual' => true,
                ];
                $attachedNamesLower[] = $lower;
            }
        }

        return $items;
    }

    /**
     * Calculate exact total points for a single complaint.
     */
    public function calculateComplaintPoints(Complaint $complaint, ?Collection $masterViolations = null): int
    {
        return (int) collect($this->getComplaintViolationItems($complaint, $masterViolations))->sum('points');
    }

    /**
     * Calculate cumulative violation points across all active complaints of a student.
     */
    public function calculateStudentCumulativePoints(int $studentId, ?Collection $masterViolations = null): int
    {
        $masterViolations = $masterViolations ?? Violation::all();
        $complaints = Complaint::with('violations')
            ->where('student_id', $studentId)
            ->get();

        return (int) $complaints->sum(fn($c) => $this->calculateComplaintPoints($c, $masterViolations));
    }

    /**
     * Store an attachment securely.
     */
    public function storeAttachment(Complaint $complaint, UploadedFile $file): ComplaintAttachment
    {
        $storedName = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path       = $file->storeAs("complaints/{$complaint->id}", $storedName, 'private');

        return ComplaintAttachment::create([
            'complaint_id'  => $complaint->id,
            'uploaded_by'   => Auth::id(),
            'original_name' => $file->getClientOriginalName(),
            'stored_name'   => $storedName,
            'storage_path'  => $path,
            'mime_type'     => $file->getMimeType(),
            'file_size'     => $file->getSize(),
        ]);
    }
}
