<?php

use App\Http\Middleware\BotServiceTokenMiddleware;
use App\Http\Middleware\RequestIdMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [
            RequestIdMiddleware::class,
        ]);

        $middleware->alias([
            'bot.token' => BotServiceTokenMiddleware::class,
        ]);

        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            return response()->json([
                'success'    => false,
                'message'    => 'Unauthenticated.',
                'error_code' => 'UNAUTHENTICATED',
                'request_id' => app()->bound('request.id') ? app('request.id') : null,
            ], 401);
        });
    })->create();
