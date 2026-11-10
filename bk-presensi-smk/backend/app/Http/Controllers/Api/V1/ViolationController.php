<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Violation;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ViolationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $violations = Violation::when($request->active_only, fn($q) => $q->where('is_active', true))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 30));

        return response()->json([
            'success'    => true,
            'message'    => 'Daftar pelanggaran.',
            'request_id' => app('request.id'),
            'data'       => $violations->items(),
            'meta'       => ['total' => $violations->total()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:150', 'unique:violations,name'],
            'description' => ['nullable', 'string', 'max:1000'],
            'points'      => ['required', 'integer', 'min:0', 'max:100'],
        ]);

        $violation = Violation::create(array_merge($data, ['created_by' => auth()->id()]));
        AuditService::log('violation_created', 'violations', $violation->id);

        return response()->json([
            'success'    => true,
            'message'    => 'Pelanggaran berhasil ditambahkan.',
            'request_id' => app('request.id'),
            'data'       => $violation,
        ], 201);
    }

    public function update(Request $request, Violation $violation): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['sometimes', 'string', 'max:150', Rule::unique('violations', 'name')->ignore($violation->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'points'      => ['sometimes', 'integer', 'min:0', 'max:100'],
            'is_active'   => ['sometimes', 'boolean'],
        ]);

        $violation->update($data);
        AuditService::log('violation_updated', 'violations', $violation->id);

        return response()->json([
            'success'    => true,
            'message'    => 'Pelanggaran berhasil diperbarui.',
            'request_id' => app('request.id'),
            'data'       => $violation->fresh(),
        ]);
    }

    public function destroy(Violation $violation): JsonResponse
    {
        // Archive instead of hard delete to preserve snapshot history
        $violation->update(['is_active' => false]);
        AuditService::log('violation_archived', 'violations', $violation->id);

        return response()->json([
            'success'    => true,
            'message'    => 'Pelanggaran berhasil dinonaktifkan.',
            'request_id' => app('request.id'),
        ]);
    }
}
