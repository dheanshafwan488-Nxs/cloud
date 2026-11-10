<?php

namespace App\Services;

use App\Models\Complaint;
use App\Models\ComplaintStatusHistory;
use App\Models\ComplaintAttachment;
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
            if (!empty($data['violation_ids'])) {
                foreach ($data['violation_ids'] as $vid) {
                    $v = \App\Models\Violation::find($vid);
                    if ($v) {
                        $complaint->violations()->attach($vid, ['points_snapshot' => $v->points]);
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
