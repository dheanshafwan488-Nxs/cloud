<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Violation extends Model
{
    protected $fillable = ['name', 'description', 'points', 'is_active', 'created_by'];

    protected $casts = ['is_active' => 'boolean'];

    public function complaints(): BelongsToMany
    {
        return $this->belongsToMany(Complaint::class, 'complaint_violations')
            ->withPivot('points_snapshot')
            ->withTimestamps();
    }
}
