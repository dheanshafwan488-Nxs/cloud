<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::withTrashed()
            ->when($request->role, fn($q, $r) => $q->where('role', $r))
            ->when($request->search, fn($q, $s) =>
                $q->where(fn($q2) => $q2->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%"))
            )
            ->orderBy('name')
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'success'    => true,
            'message'    => 'Data pengguna.',
            'request_id' => app('request.id'),
            'data'       => $users->items(),
            'meta'       => ['total' => $users->total()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:150'],
            'email'    => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role'     => ['required', Rule::in(['admin', 'guru_bk', 'wali_kelas', 'siswa'])],
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
            'role'     => $data['role'],
        ]);

        AuditService::log('user_created', 'users', $user->id, ['role' => $user->role]);

        return response()->json([
            'success'    => true,
            'message'    => 'Pengguna berhasil dibuat.',
            'request_id' => app('request.id'),
            'data'       => $user->makeHidden(['password']),
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            'success'    => true,
            'message'    => 'Detail pengguna.',
            'request_id' => app('request.id'),
            'data'       => $user->makeHidden(['password'])->load('activeClassAssignments.class'),
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name'     => ['sometimes', 'string', 'max:150'],
            'email'    => ['sometimes', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'role'     => ['sometimes', Rule::in(['admin', 'guru_bk', 'wali_kelas', 'siswa'])],
            'is_active'=> ['sometimes', 'boolean'],
            'password' => ['sometimes', 'string', 'min:8', 'confirmed'],
        ]);

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);
        AuditService::log('user_updated', 'users', $user->id);

        return response()->json([
            'success'    => true,
            'message'    => 'Pengguna berhasil diperbarui.',
            'request_id' => app('request.id'),
            'data'       => $user->fresh()->makeHidden(['password']),
        ]);
    }

    public function deactivate(User $user): JsonResponse
    {
        $user->update(['is_active' => false]);
        AuditService::log('user_deactivated', 'users', $user->id);

        return response()->json([
            'success'    => true,
            'message'    => 'Akun pengguna berhasil dinonaktifkan.',
            'request_id' => app('request.id'),
        ]);
    }
}
