<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplaintAttachment extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'complaint_id', 'uploaded_by', 'original_name',
        'stored_name', 'storage_path', 'mime_type', 'file_size',
    ];

    protected $hidden = ['storage_path', 'stored_name'];

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
