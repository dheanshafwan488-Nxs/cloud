<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class AttendanceCalculationTest extends TestCase
{
    public function test_physical_attendance_percentage_formula(): void
    {
        $hadir = 18;
        $totalSchoolDays = 20;

        $percentage = round(($hadir / $totalSchoolDays) * 100, 1);

        $this->assertEquals(90.0, $percentage);
    }

    public function test_attendance_percentage_with_zero_days_returns_zero(): void
    {
        $hadir = 0;
        $totalSchoolDays = 0;

        $percentage = $totalSchoolDays > 0 ? round(($hadir / $totalSchoolDays) * 100, 1) : 0;

        $this->assertEquals(0, $percentage);
    }

    public function test_status_breakdown_consistency(): void
    {
        $hadir = 15;
        $sakit = 2;
        $izin = 1;
        $alpa = 2;
        $totalRecorded = $hadir + $sakit + $izin + $alpa;

        $this->assertEquals(20, $totalRecorded);
        $this->assertTrue($hadir <= $totalRecorded);
    }
}
