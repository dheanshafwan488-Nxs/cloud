<?php

use App\Http\Controllers\Api\V1\AcademicYearController;
use App\Http\Controllers\Api\V1\AttendanceController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ClassController;
use App\Http\Controllers\Api\V1\ComplaintController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\SchoolCalendarController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\StudentController;
use App\Http\Controllers\Api\V1\TelegramBotController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\ViolationController;
use Illuminate\Support\Facades\Route;

// ─── Auth ────────────────────────────────────────────────────────────────────
Route::prefix('v1/auth')->group(function () {
    Route::get('csrf', [AuthController::class, 'csrf']);
    Route::post('login', [AuthController::class, 'login'])
        ->name('login')
        ->middleware('throttle:10,1');
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
    });
});

// ─── Protected API routes (session auth) ─────────────────────────────────────
Route::prefix('v1')->middleware(['auth:sanctum'])->group(function () {

    // Dashboard
    Route::get('dashboard/summary', [DashboardController::class, 'summary']);
    Route::get('dashboard/attendance-chart', [DashboardController::class, 'attendanceChart']);
    Route::get('dashboard/recent-activities', [DashboardController::class, 'recentActivities']);

    // Students
    Route::get('students/import-template', [StudentController::class, 'importTemplate']);
    Route::post('students/import', [StudentController::class, 'import']);
    Route::get('students/{student}/verification-code', [StudentController::class, 'getVerificationCode']);
    Route::post('students/{student}/verification-code', [StudentController::class, 'generateVerificationCode']);
    Route::apiResource('students', StudentController::class);
    Route::get('students/{student}/attendances', [AttendanceController::class, 'byStudent']);

    // Classes & Academic Years
    Route::apiResource('classes', ClassController::class);
    Route::get('classes/{class}/students', [ClassController::class, 'students']);
    Route::post('classes/{class}/assignments', [ClassController::class, 'assignWaliKelas']);
    Route::apiResource('academic-years', AcademicYearController::class)->only(['index', 'store']);

    // School Calendar
    Route::get('school-calendar', [SchoolCalendarController::class, 'index']);
    Route::post('school-calendar', [SchoolCalendarController::class, 'store']);
    Route::patch('school-calendar/{schoolCalendar}', [SchoolCalendarController::class, 'update']);
    Route::delete('school-calendar/{schoolCalendar}', [SchoolCalendarController::class, 'destroy']);

    // Attendance
    Route::get('attendances/today', [AttendanceController::class, 'today']);
    Route::post('attendances/bulk', [AttendanceController::class, 'bulk']);
    Route::apiResource('attendances', AttendanceController::class)->only(['index', 'store', 'update']);

    // Violations
    Route::apiResource('violations', ViolationController::class)->only(['index', 'store', 'update', 'destroy']);

    // Complaints
    Route::get('complaints/{complaint}/letter', [ComplaintController::class, 'generateLetter']);
    Route::apiResource('complaints', ComplaintController::class)->only(['index', 'store', 'show', 'destroy']);
    Route::post('complaints/{complaint}/status', [ComplaintController::class, 'changeStatus']);
    Route::post('complaints/{complaint}/followups', [ComplaintController::class, 'addFollowup']);
    Route::post('complaints/{complaint}/attachments', [ComplaintController::class, 'uploadAttachment']);
    Route::get('complaints/{complaint}/attachments/{attachment}', [ComplaintController::class, 'downloadAttachment']);

    // Users
    Route::apiResource('users', UserController::class)->only(['index', 'store', 'show', 'update']);
    Route::post('users/{user}/deactivate', [UserController::class, 'deactivate']);
    Route::get('class-assignments', fn() => response()->json([
        'success' => true, 'data' => \App\Models\ClassAssignment::with(['class', 'user'])->get(),
    ]));

    // Reports
    Route::get('reports/attendance', [ReportController::class, 'attendanceReport']);
    Route::get('reports/attendance/classes', [ReportController::class, 'attendanceByClass']);
    Route::get('reports/attendance/students', [ReportController::class, 'attendanceByStudent']);
    Route::get('reports/complaints', [ReportController::class, 'complaintsReport']);

    // Settings (School Name & Institutional Settings)
    Route::get('settings', [SettingController::class, 'index'])->withoutMiddleware(['auth:sanctum']);
    Route::put('settings', [SettingController::class, 'update']);
});

// ─── Bot internal endpoints (service token) ──────────────────────────────────
$botRoutes = function () {
    Route::post('verify', [TelegramBotController::class, 'verify']);
    Route::get('my-students', [TelegramBotController::class, 'myStudents']);
    Route::get('attendance', [TelegramBotController::class, 'attendance']);
    Route::get('attendance-history', [TelegramBotController::class, 'attendanceHistory']);
    Route::get('complaints', [TelegramBotController::class, 'complaints']);
};

Route::prefix('v1/bot')->middleware(['App\Http\Middleware\BotServiceTokenMiddleware'])->group($botRoutes);
Route::prefix('v1/telegram-bot')->middleware(['App\Http\Middleware\BotServiceTokenMiddleware'])->group($botRoutes);

