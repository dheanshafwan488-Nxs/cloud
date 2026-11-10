<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Complaint;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Models\Violation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ComplaintApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_complaint_and_update_status_flow(): void
    {
        $guruBk = User::create([
            'name'      => 'Guru BK User',
            'email'     => 'gurubk@smkiptek.sch.id',
            'password'  => bcrypt('password'),
            'role'      => 'guru_bk',
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

        $student = Student::create([
            'nis'               => '2026001',
            'name'              => 'Ahmad Test',
            'class_id'          => $class->id,
            'enrollment_status' => 'aktif',
        ]);

        $violation = Violation::create([
            'name'        => 'Keterlambatan Upacara',
            'description' => 'Terlambat lebih dari 15 menit',
            'points'      => 5,
            'is_active'   => true,
        ]);

        // 1. Create Complaint
        $response = $this->actingAs($guruBk)->postJson('/api/v1/complaints', [
            'student_id'     => $student->id,
            'chronology'     => 'Siswa datang terlambat pada saat upacara bendera.',
            'incident_at'    => '2026-10-12 07:45:00',
            'parent_visible' => true,
            'violation_ids'  => [$violation->id],
        ]);

        $response->assertStatus(201)
                 ->assertJson(['success' => true]);

        $complaintId = $response->json('data.id');

        // Check snapshot point
        $this->assertDatabaseHas('complaint_violations', [
            'complaint_id'    => $complaintId,
            'violation_id'    => $violation->id,
            'points_snapshot' => 5,
        ]);

        // 2. Update status to Diproses
        $statusResp = $this->actingAs($guruBk)->postJson("/api/v1/complaints/{$complaintId}/status", [
            'status' => 'Diproses',
            'note'   => 'Siswa dipanggil ke ruang BK untuk pembinaan.',
        ]);

        $statusResp->assertStatus(200);

        $this->assertDatabaseHas('complaint_status_histories', [
            'complaint_id' => $complaintId,
            'new_status'   => 'Diproses',
        ]);
    }
}
