<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaseFollowup extends Model
{
    protected $fillable = [
        'complaint_id', 'user_id', 'followup_type',
        'notes', 'parent_visible', 'followed_up_at',
    ];

    protected $casts = [
        'followed_up_at' => 'datetime',
        'parent_visible' => 'boolean',
    ];

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
