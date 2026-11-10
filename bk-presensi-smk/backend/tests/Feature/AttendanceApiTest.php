<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_bulk_attendance_save_transaction(): void
    {
        $user = User::create([
            'name'      => 'Admin User',
            'email'     => 'admin@smkiptek.sch.id',
            'password'  => bcrypt('password'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $ay = AcademicYear::create([
            'label'      => '2026/2027',
            'start_date' => '2026-07-15',
            'end_date'   => '2027-06-20',
            'is_active'  => true,
        ]);

        $class = SchoolClass::create([
            'academic_year_id' => $ay->id,
            'name'             => 'X RPL 1',
            'grade_level'      => 'X',
            'is_active'        => true,
        ]);

        $student1 = Student::create([
            'nis'               => '2026001',
            'name'              => 'Ahmad Test',
            'class_id'          => $class->id,
            'enrollment_status' => 'aktif',
        ]);

        $student2 = Student::create([
            'nis'               => '2026002',
            'name'              => 'Budi Test',
            'class_id'          => $class->id,
            'enrollment_status' => 'aktif',
        ]);

        $payload = [
            'class_id'    => $class->id,
            'date'        => '2026-10-12',
            'attendances' => [
                ['student_id' => $student1->id, 'status' => 'Hadir'],
                ['student_id' => $student2->id, 'status' => 'Sakit', 'notes' => 'Demam'],
            ],
        ];

        $response = $this->actingAs($user)
                         ->postJson('/api/v1/attendances/bulk', $payload);

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                 ]);

        $this->assertTrue(
            \App\Models\Attendance::where('student_id', $student1->id)
                ->whereDate('date', '2026-10-12')
                ->where('status', 'Hadir')
                ->exists()
        );

        $this->assertTrue(
            \App\Models\Attendance::where('student_id', $student2->id)
                ->whereDate('date', '2026-10-12')
                ->where('status', 'Sakit')
                ->exists()
        );
    }
}
