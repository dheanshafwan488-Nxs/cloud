<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Complaint extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'complaint_code', 'student_id', 'class_id', 'reported_by_user_id',
        'chronology', 'incident_at', 'status', 'assigned_to',
        'parent_visible', 'resolved_at',
    ];

    protected $casts = [
        'incident_at' => 'datetime',
        'resolved_at' => 'datetime',
        'parent_visible' => 'boolean',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function class(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by_user_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function violations(): BelongsToMany
    {
        return $this->belongsToMany(Violation::class, 'complaint_violations')
            ->withPivot('points_snapshot')
            ->withTimestamps();
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ComplaintAttachment::class);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(ComplaintStatusHistory::class);
    }

    public function followups(): HasMany
    {
        return $this->hasMany(CaseFollowup::class);
    }
}
