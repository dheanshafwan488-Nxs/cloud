<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BotServiceTokenMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->header('X-Bot-Service-Token');
        $expected = config('services.bot_service_token')
            ?: config('services.telegram.bot_service_token')
            ?: env('BOT_SERVICE_TOKEN', 'secret_bot_service_token_smk_iptek_2026');

        if (!$token || $token !== $expected) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized bot service access.',
                'error_code' => 'BOT_UNAUTHORIZED',
            ], 401);
        }

        return $next($request);
    }
}
