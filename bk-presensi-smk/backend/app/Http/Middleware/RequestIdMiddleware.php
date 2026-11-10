<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class RequestIdMiddleware
{
    private const HEADER = 'X-Request-ID';
    private const MAX_LENGTH = 100;
    private const ALLOWED_PATTERN = '/^[a-zA-Z0-9_\-\.]+$/';

    public function handle(Request $request, Closure $next): Response
    {
        $incomingId = $request->header(self::HEADER);
        $requestId  = $this->resolveRequestId($incomingId);

        // Share request ID for use throughout the request lifecycle
        app()->instance('request.id', $requestId);

        $response = $next($request);

        $response->headers->set(self::HEADER, $requestId);

        return $response;
    }

    private function resolveRequestId(?string $incoming): string
    {
        if (
            $incoming
            && strlen($incoming) <= self::MAX_LENGTH
            && preg_match(self::ALLOWED_PATTERN, $incoming)
        ) {
            return $incoming;
        }

        return 'req_' . Str::uuid()->toString();
    }
}
