<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SchoolClass extends Model
{
    use HasFactory;

    protected $table = 'classes';

    protected $fillable = ['academic_year_id', 'name', 'grade_level', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class, 'class_id');
    }

    public function classAssignments(): HasMany
    {
        return $this->hasMany(ClassAssignment::class, 'class_id');
    }

    public function activeWaliKelas(): HasMany
    {
        return $this->classAssignments()
            ->where('assignment_role', 'wali_kelas')
            ->whereNull('ended_at');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'class_id');
    }
}
