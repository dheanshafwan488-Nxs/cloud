<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ParentVerificationCode;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TelegramBotApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_telegram_verify_fails_without_service_token(): void
    {
        $response = $this->postJson('/api/v1/telegram-bot/verify', [
            'telegram_id' => 12345678,
            'nis'         => '2026001',
            'code'        => 'DEMO123',
        ]);

        $response->assertStatus(401);
    }

    public function test_telegram_verify_succeeds_with_valid_code_and_token(): void
    {
        $admin = User::create([
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

        $student = Student::create([
            'nis'               => '2026001',
            'name'              => 'Ahmad Test',
            'class_id'          => $class->id,
            'enrollment_status' => 'aktif',
        ]);

        ParentVerificationCode::create([
            'student_id'     => $student->id,
            'code_hash'      => hash('sha256', 'DEMO123'),
            'expires_at'     => now()->addDays(7),
            'issued_by'      => $admin->id,
            'attempts_count' => 0,
        ]);

        $token = config('services.telegram.bot_service_token', 'secret_bot_service_token_smk_iptek_2026');

        $response = $this->withHeader('X-Bot-Service-Token', $token)
                         ->postJson('/api/v1/telegram-bot/verify', [
                             'telegram_id' => 98765432,
                             'parent_name' => 'Bapak Budi',
                             'nis'         => '2026001',
                             'code'        => 'DEMO123',
                         ]);

        $response->assertStatus(200)
                 ->assertJson(['success' => true]);

        $this->assertDatabaseHas('telegram_parents', [
            'telegram_id' => 98765432,
            'is_verified' => true,
        ]);
    }
}
