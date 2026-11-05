<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\PerformanceService;
use Carbon\Carbon;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function __construct(private PerformanceService $performance)
    {
    }

    public function index(): View
    {
        $user = auth()->user();
        $from = Carbon::now()->startOfMonth();
        $to = Carbon::now();

        $stats = [
            'attendance' => $this->performance->attendancePercentage($user, $from, $to),
            'planCompletion' => $this->performance->planCompletionPercentage($user, $from, $to),
            'onTime' => $this->performance->onTimeRate($user, $from, $to),
        ];

        return view('dashboard.index', compact('stats'));
    }
}
