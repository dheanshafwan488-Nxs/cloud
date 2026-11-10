<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'email'    => ['required', 'string', 'email', 'max:190'],
            'password' => ['required', 'string', 'min:6', 'max:255'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success'    => false,
                'message'    => $validator->errors()->first(),
                'errors'     => $validator->errors(),
                'request_id' => app()->bound('request.id') ? app('request.id') : null,
            ], 422);
        }

        $key = 'login:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 10)) {
            $seconds = RateLimiter::availableIn($key);
            return $this->errorResponse(
                "Terlalu banyak percobaan login. Coba lagi dalam {$seconds} detik.",
                429,
                'TOO_MANY_ATTEMPTS'
            );
        }

        $user = \App\Models\User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            RateLimiter::hit($key, 60);
            return $this->errorResponse('Email atau password tidak sesuai.', 401, 'INVALID_CREDENTIALS');
        }

        if (!$user->is_active) {
            return $this->errorResponse('Akun Anda tidak aktif. Hubungi administrator.', 403, 'ACCOUNT_INACTIVE');
        }

        RateLimiter::clear($key);

        Auth::login($user);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }
        $token = $user->createToken('spa_token')->plainTextToken;

        AuditService::log('login', 'users', $user->id);

        return $this->successResponse('Login berhasil.', [
            'user' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $userId = Auth::id();
        Auth::logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }
        if ($request->user()) {
            $request->user()->currentAccessToken()?->delete();
        }

        if ($userId) {
            AuditService::log('logout', 'users', $userId);
        }

        return $this->successResponse('Logout berhasil.');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user() ?: Auth::user();
        if (!$user) {
            return $this->errorResponse('Unauthenticated', 401, 'UNAUTHENTICATED');
        }
        return $this->successResponse('Data pengguna.', $user);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user() ?: Auth::user();
        if (!$user) {
            return $this->errorResponse('Unauthenticated', 401, 'UNAUTHENTICATED');
        }

        $request->validate([
            'name'             => ['required', 'string', 'max:150'],
            'email'            => ['required', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'current_password' => ['nullable', 'string'],
            'password'         => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        if ($request->filled('password')) {
            if (!$request->filled('current_password') || !Hash::check($request->current_password, $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['Kata sandi saat ini tidak sesuai.'],
                ]);
            }
            $user->password = Hash::make($request->password);
        }

        $user->name = $request->name;
        $user->email = $request->email;
        $user->save();

        AuditService::log('profile_updated', 'users', $user->id, [
            'name'  => $user->name,
            'email' => $user->email,
        ]);

        return $this->successResponse('Profil berhasil diperbarui.', $user->fresh()->makeHidden(['password']));
    }

    public function csrf(): JsonResponse
    {
        return response()->json([
            'csrf_token' => csrf_token(),
            'request_id' => app()->bound('request.id') ? app('request.id') : null,
        ]);
    }

    private function successResponse(string $message, mixed $data = null): JsonResponse
    {
        return response()->json([
            'success'    => true,
            'message'    => $message,
            'request_id' => app()->bound('request.id') ? app('request.id') : null,
            'data'       => $data,
        ]);
    }

    private function errorResponse(string $message, int $status, string $code): JsonResponse
    {
        return response()->json([
            'success'    => false,
            'message'    => $message,
            'error_code' => $code,
            'request_id' => app()->bound('request.id') ? app('request.id') : null,
        ], $status);
    }
}
