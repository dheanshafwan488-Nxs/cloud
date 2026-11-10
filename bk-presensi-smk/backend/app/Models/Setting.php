<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    public static function get(string $key, ?string $default = null): ?string
    {
        $setting = static::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public static function set(string $key, ?string $value): self
    {
        return static::updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );
    }

    public static function getAllSettings(): array
    {
        $defaults = [
            'school_name'          => 'SMK IPTEK SANGGABUANA',
            'school_address'       => 'Jl. Terusan Pangrango No. 45, Karawang, Jawa Barat',
            'school_phone'         => '0812-3456-7890',
            'school_email'         => 'bk@smkiptek.sch.id',
            'cutoff_time'          => '08:00',
            'active_academic_year' => '2026/2027',
        ];

        $stored = static::all()->pluck('value', 'key')->toArray();

        return array_merge($defaults, $stored);
    }
}
