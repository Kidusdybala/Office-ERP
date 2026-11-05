<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\PunchController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\HikvisionEventController;
use Illuminate\Support\Facades\Route;

Route::post('/hikvision/events', [HikvisionEventController::class, 'store']);

Route::get('/', function () {
    return redirect()->route('login');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    
    // ERP Routes
    Route::controller(PunchController::class)->prefix('punch')->name('punch.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/in', 'punchIn')->name('in');
        Route::post('/out', 'punchOut')->name('out');
    });

    Route::resource('plans', PlanController::class)->only(['index', 'create', 'store']);
    Route::patch('/plans/{plan}/status', [PlanController::class, 'updateStatus'])->name('plans.status');

    Route::resource('reports', ReportController::class)->only(['index', 'create', 'store']);
});

require __DIR__.'/auth.php';
