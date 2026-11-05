<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PunchController extends Controller
{
    public function index(): View
    {
        $user = auth()->user();
        $today = Carbon::today();

        $todayAttendance = null;
        $recent = collect();

        if (!$user->isManager()) {
            $todayAttendance = Attendance::where('user_id', $user->id)
                ->whereDate('date', $today->toDateString())
                ->first();

            if (!$todayAttendance) {
                $todayAttendance = new Attendance([
                    'user_id' => $user->id,
                    'date' => $today->toDateString(),
                ]);
            }

            $recent = Attendance::where('user_id', $user->id)
                ->orderByDesc('date')
                ->limit(7)
                ->get();
        }

        return view('punch.index', compact('todayAttendance', 'recent'));
    }

    public function punchIn(Request $request): RedirectResponse
    {
        if (auth()->user()->isManager()) {
            return back()->with('error', 'Managers cannot punch in/out.');
        }

        $user = auth()->user();
        $today = Carbon::today();
        $now = Carbon::now();

        $attendance = Attendance::where('user_id', $user->id)
            ->whereDate('date', $today->toDateString())
            ->first();

        if ($attendance && $attendance->punch_in) {
            return back()->with('error', 'You already punched in today.');
        }

        if (!$attendance) {
            $attendance = new Attendance([
                'user_id' => $user->id,
                'date' => $today->toDateString(),
            ]);
        }

        $cutoff = Carbon::today()->setTimeFromTimeString('09:00');
        $attendance->punch_in = $now;
        $attendance->status = $now->gt($cutoff) ? 'late' : 'present';
        $attendance->save();

        return back()->with('success', 'Punched in at ' . $now->format('H:i'));
    }

    public function punchOut(Request $request): RedirectResponse
    {
        if (auth()->user()->isManager()) {
            return back()->with('error', 'Managers cannot punch in/out.');
        }

        $user = auth()->user();
        $today = Carbon::today();
        $now = Carbon::now();

        $attendance = Attendance::where('user_id', $user->id)
            ->whereDate('date', $today->toDateString())
            ->first();

        if (!$attendance || !$attendance->punch_in) {
            return back()->with('error', 'You need to punch in before punching out.');
        }

        if ($attendance->punch_out) {
            return back()->with('error', 'You already punched out today.');
        }

        $attendance->punch_out = $now;
        $attendance->total_hours = round($attendance->punch_in->diffInMinutes($now) / 60, 2);

        if ($attendance->total_hours < 4) {
            $attendance->status = 'half_day';
        }

        $attendance->save();

        return back()->with('success', 'Punched out at ' . $now->format('H:i') . ' — ' . $attendance->total_hours . ' hrs logged.');
    }
}
