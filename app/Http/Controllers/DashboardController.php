<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Attendance;
use App\Models\Plan;
use App\Models\Report;
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
        $today = Carbon::today();
        $fromMonth = Carbon::now()->startOfMonth();
        $toMonth = Carbon::now();

        $weekStart = Carbon::now()->startOfWeek(); // Monday
        $weekEnd = Carbon::now()->endOfWeek(); // Sunday

        // Monthly Stats
        $monthlyAttendance = $this->performance->attendancePercentage($user, $fromMonth, $toMonth);
        $monthlyPlanCompletion = $this->performance->planCompletionPercentage($user, $fromMonth, $toMonth);
        $monthlyOnTime = $this->performance->onTimeRate($user, $fromMonth, $toMonth);

        // Weekly Stats
        $weeklyAttendance = $this->performance->attendancePercentage($user, $weekStart, $toMonth);
        $weeklyPlanCompletion = $this->performance->planCompletionPercentage($user, $weekStart, $toMonth);
        $weeklyOnTime = $this->performance->onTimeRate($user, $weekStart, $toMonth);

        // Total hours
        $hoursThisMonth = $user->attendances()
            ->whereBetween('date', [$fromMonth->toDateString(), $toMonth->toDateString()])
            ->sum('total_hours') ?? 0;

        $hoursThisWeek = $user->attendances()
            ->whereBetween('date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->sum('total_hours') ?? 0;

        // Today's attendance
        $todayAttendance = $user->attendances()->whereDate('date', $today)->first();

        // 7-day recent attendance
        $recentAttendances = $user->attendances()
            ->orderByDesc('date')
            ->limit(7)
            ->get();

        // Daily hours breakdown for current week Mon - Fri
        $weekDays = [];
        for ($i = 0; $i < 5; $i++) {
            $dayDate = (clone $weekStart)->addDays($i);
            $att = $user->attendances()->whereDate('date', $dayDate)->first();
            $plan = $user->plans()->whereDate('plan_date', $dayDate)->first();
            $report = $user->reports()->whereDate('report_date', $dayDate)->first();
            $weekDays[] = [
                'date' => $dayDate,
                'dayName' => $dayDate->format('D'),
                'dayNumber' => $dayDate->format('d M'),
                'isToday' => $dayDate->isToday(),
                'isPast' => $dayDate->lt($today),
                'hours' => $att?->total_hours ?? 0,
                'punchIn' => $att?->punch_in?->format('H:i') ?? null,
                'punchOut' => $att?->punch_out?->format('H:i') ?? null,
                'status' => $att?->status ?? ($dayDate->lt($today) ? 'absent' : 'pending'),
                'hasPlan' => !!$plan,
                'planTitle' => $plan?->title,
                'hasReport' => !!$report,
                'reportPercentage' => $report?->percentage,
            ];
        }

        // Today's plan & report
        $todayPlan = $user->plans()->with('latestReport')->whereDate('plan_date', $today)->first();
        $todayReport = $user->reports()->whereDate('report_date', $today)->first();

        // Weekly Plan (Monday kickoff) & Weekly Report (Friday wrap-up)
        $mondayDate = (clone $weekStart);
        $fridayDate = (clone $weekStart)->addDays(4);
        $weeklyPlan = $user->plans()->where(function($q) use ($mondayDate) {
            $q->whereDate('plan_date', $mondayDate)->orWhere('title', 'like', '%weekly%');
        })->whereBetween('plan_date', [$mondayDate->toDateString(), $fridayDate->toDateString()])->latest()->first();

        $weeklyReport = $user->reports()->where(function($q) use ($fridayDate) {
            $q->whereDate('report_date', $fridayDate)->orWhere('description', 'like', '%weekly%');
        })->whereBetween('report_date', [$mondayDate->toDateString(), $fridayDate->toDateString()])->latest()->first();

        // Previous plans for reference
        $previousPlans = $user->plans()
            ->with('latestReport')
            ->whereDate('plan_date', '<', $today)
            ->orderByDesc('plan_date')
            ->limit(6)
            ->get();

        $stats = [
            'attendance' => $monthlyAttendance,
            'planCompletion' => $monthlyPlanCompletion,
            'onTime' => $monthlyOnTime,
            'weeklyAttendance' => $weeklyAttendance,
            'weeklyPlanCompletion' => $weeklyPlanCompletion,
            'weeklyOnTime' => $weeklyOnTime,
            'hoursThisMonth' => round($hoursThisMonth, 1),
            'hoursThisWeek' => round($hoursThisWeek, 1),
        ];

        return view('dashboard.index', compact(
            'stats',
            'todayAttendance',
            'recentAttendances',
            'weekDays',
            'todayPlan',
            'todayReport',
            'weeklyPlan',
            'weeklyReport',
            'previousPlans'
        ));
    }
}
