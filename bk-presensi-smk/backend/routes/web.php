<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn() => response()->json([
    'app'     => config('app.name'),
    'version' => 'v1',
    'status'  => 'API Ready',
]));
