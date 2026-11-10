<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class TelegramParent extends Model
{
    protected $table = 'telegram_parents';

    protected $fillable = [
        'telegram_id', 'parent_name', 'is_verified',
        'verified_at', 'last_interaction_at',
    ];

    protected $casts = [
        'is_verified' => 'boolean',
        'verified_at' => 'datetime',
        'last_interaction_at' => 'datetime',
    ];

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'parent_students', 'parent_id', 'student_id')
            ->withPivot('relationship_type', 'verified_at', 'verification_method')
            ->withTimestamps();
    }
}
