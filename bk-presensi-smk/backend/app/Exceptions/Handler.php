<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    protected $dontFlash = ['current_password', 'password', 'password_confirmation'];

    public function register(): void
    {
        $this->renderable(function (Throwable $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return $this->apiError($e, $request);
            }
        });
    }

    private function apiError(Throwable $e, Request $request): JsonResponse
    {
        $requestId = app()->bound('request.id') ? app('request.id') : null;

        if ($e instanceof ValidationException) {
            return response()->json([
                'success'    => false,
                'message'    => 'Data yang dikirim tidak valid.',
                'error_code' => 'VALIDATION_ERROR',
                'request_id' => $requestId,
                'errors'     => $e->errors(),
            ], 422)->header('X-Request-ID', $requestId ?? '');
        }

        if ($e instanceof AuthenticationException) {
            return response()->json([
                'success'    => false,
                'message'    => 'Anda belum terautentikasi.',
                'error_code' => 'UNAUTHENTICATED',
                'request_id' => $requestId,
            ], 401)->header('X-Request-ID', $requestId ?? '');
        }

        if ($e instanceof HttpException) {
            $status  = $e->getStatusCode();
            $message = match ($status) {
                403 => $e->getMessage() ?: 'Anda tidak memiliki izin untuk aksi ini.',
                404 => 'Data atau endpoint tidak ditemukan.',
                405 => 'HTTP method tidak diizinkan.',
                429 => 'Terlalu banyak permintaan. Coba lagi nanti.',
                default => $e->getMessage() ?: 'Terjadi kesalahan HTTP.',
            };

            return response()->json([
                'success'    => false,
                'message'    => $message,
                'error_code' => 'HTTP_' . $status,
                'request_id' => $requestId,
            ], $status)->header('X-Request-ID', $requestId ?? '');
        }

        // 500 — never expose stack trace in production
        \Log::error($e->getMessage(), [
            'request_id' => $requestId,
            'trace'      => config('app.debug') ? $e->getTraceAsString() : '[hidden in production]',
        ]);

        return response()->json([
            'success'    => false,
            'message'    => 'Terjadi kesalahan pada server. Gunakan Request ID untuk pelacakan.',
            'error_code' => 'INTERNAL_SERVER_ERROR',
            'request_id' => $requestId,
        ], 500)->header('X-Request-ID', $requestId ?? '');
    }
}
