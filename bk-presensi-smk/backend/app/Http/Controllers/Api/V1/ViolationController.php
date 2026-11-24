<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Violation;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ViolationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $onlyActive = $request->boolean('active_only') || ($request->has('is_active') && $request->boolean('is_active'));
        $onlyInactive = $request->has('is_active') && !$request->boolean('is_active');

        $violations = Violation::when($onlyActive, fn($q) => $q->where('is_active', true))
            ->when($onlyInactive, fn($q) => $q->where('is_active', false))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 100));

        return response()->json([
            'success'    => true,
            'message'    => 'Daftar pelanggaran.',
            'request_id' => $this->requestId(),
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
            'request_id' => $this->requestId(),
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
            'request_id' => $this->requestId(),
            'data'       => $violation->fresh(),
        ]);
    }

    public function archive(Request $request, Violation $violation): JsonResponse
    {
        $isActive = $request->has('is_active') ? $request->boolean('is_active') : !$violation->is_active;
        $violation->update(['is_active' => $isActive]);
        AuditService::log($isActive ? 'violation_activated' : 'violation_archived', 'violations', $violation->id);

        return response()->json([
            'success'    => true,
            'message'    => $isActive ? 'Pelanggaran berhasil diaktifkan kembali.' : 'Pelanggaran berhasil diarsipkan.',
            'request_id' => $this->requestId(),
            'data'       => $violation->fresh(),
        ]);
    }

    public function destroy(Request $request, Violation $violation): JsonResponse
    {
        if ($request->boolean('archive')) {
            $violation->update(['is_active' => false]);
            AuditService::log('violation_archived', 'violations', $violation->id);

            return response()->json([
                'success'    => true,
                'message'    => 'Pelanggaran berhasil diarsipkan (dinonaktifkan).',
                'request_id' => $this->requestId(),
            ]);
        }

        return $this->performForceDelete($violation);
    }

    public function forceDestroy(Violation $violation): JsonResponse
    {
        return $this->performForceDelete($violation);
    }

    protected function performForceDelete(Violation $violation): JsonResponse
    {
        DB::transaction(function () use ($violation) {
            // Keep complaint textual description safe by copying violation name to manual_violation if not already there
            $complaints = $violation->complaints()->get();
            foreach ($complaints as $complaint) {
                $currentManual = trim($complaint->manual_violation ?? '');
                $manualItems = $currentManual !== '' ? array_map('trim', explode(',', $currentManual)) : [];
                $hasItem = false;
                foreach ($manualItems as $mi) {
                    if (mb_strtolower($mi) === mb_strtolower($violation->name)) {
                        $hasItem = true;
                        break;
                    }
                }
                if (!$hasItem) {
                    $manualItems[] = $violation->name;
                    $complaint->manual_violation = implode(', ', array_filter($manualItems));
                    $complaint->save();
                }
            }

            // Detach pivot relationship so MySQL restrictOnDelete constraint does not fail
            $violation->complaints()->detach();

            AuditService::log('violation_deleted', 'violations', $violation->id, [
                'name'   => $violation->name,
                'points' => $violation->points,
            ]);

            $violation->delete();
        });

        return response()->json([
            'success'    => true,
            'message'    => 'Pelanggaran berhasil dihapus secara permanen.',
            'request_id' => $this->requestId(),
        ]);
    }

    private function requestId(): ?string
    {
        return app()->bound('request.id') ? app('request.id') : null;
    }
}
