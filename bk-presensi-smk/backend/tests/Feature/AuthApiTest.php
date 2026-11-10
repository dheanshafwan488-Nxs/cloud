<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::create([
            'name'      => 'Admin Test',
            'email'     => 'admin_test@smkiptek.sch.id',
            'password'  => bcrypt('password123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'admin_test@smkiptek.sch.id',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Login berhasil.',
                 ])
                 ->assertHeader('X-Request-ID');
    }

    public function test_login_with_invalid_password_returns_401(): void
    {
        $user = User::create([
            'name'      => 'Admin Test',
            'email'     => 'admin_test@smkiptek.sch.id',
            'password'  => bcrypt('password123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'admin_test@smkiptek.sch.id',
            'password' => 'wrong_password',
        ]);

        $response->assertStatus(401)
                 ->assertJson([
                     'success' => false,
                 ])
                 ->assertHeader('X-Request-ID');
    }

    public function test_login_validation_error_returns_422(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'not-an-email',
        ]);

        $response->assertStatus(422)
                 ->assertJson([
                     'success' => false,
                 ]);
    }
}
