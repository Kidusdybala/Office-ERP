<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;

class PerformanceService
{
    /**
     * Attendance percentage = present/late days ÷ working days in the period.
     * Working days = weekdays only (Mon-Fri), configurable later.
     */
    public function attendancePercentage(User $user, Carbon $from, Carbon $to): float
    {
        $workingDays = 0;
        $period = Carbon::parse($from);
        while ($period->lte($to)) {
            if (!$period->isWeekend()) {
                $workingDays++;
            }
            $period->addDay();
        }

        if ($workingDays === 0) {
            return 0;
        }

        $presentDays = $user->attendances()
            ->whereDate('date', '>=', $from->toDateString())
            ->whereDate('date', '<=', $to->toDateString())
            ->whereIn('status', ['present', 'late', 'half_day'])
            ->whereNotNull('punch_in')
            // A forgotten punch-out (past day, no punch_out) is not a complete
            // working day and therefore lowers the attendance percentage.
            ->where(function ($query) {
                $query->whereNotNull('punch_out')
                    ->orWhereDate('date', Carbon::today()->toDateString());
            })
            ->count();

        return round(min($presentDays / $workingDays, 1) * 100, 1);
    }

    /**
     * Plan completion percentage = average of report percentages in the period.
     */
    public function planCompletionPercentage(User $user, Carbon $from, Carbon $to): float
    {
        $avg = $user->reports()
            ->whereBetween('report_date', [$from->toDateString(), $to->toDateString()])
            ->avg('percentage');

        return $avg ? round($avg, 1) : 0;
    }

    /**
     * On-time punch-in rate = punches before the cutoff ÷ total punches.
     */
    public function onTimeRate(User $user, Carbon $from, Carbon $to, string $cutoff = '09:00'): float
    {
        $attendances = $user->attendances()
            ->whereDate('date', '>=', $from->toDateString())
            ->whereDate('date', '<=', $to->toDateString())
            ->whereNotNull('punch_in')
            ->get();

        if ($attendances->isEmpty()) {
            return 0;
        }

        $onTime = $attendances->filter(function ($a) use ($cutoff) {
            return $a->punch_in->format('H:i') <= $cutoff;
        })->count();

        return round(($onTime / $attendances->count()) * 100, 1);
    }
}
