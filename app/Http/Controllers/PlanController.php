<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PlanController extends Controller
{
    public function index(Request $request): View
    {
        $user = auth()->user();
        $week = $request->query('week', 'this_week');

        $query = Plan::with(['user', 'latestReport'])->orderByDesc('plan_date');

        if ($week === 'last_week') {
            $query->whereBetween('plan_date', [now()->subWeek()->startOfWeek(), now()->subWeek()->endOfWeek()]);
        } else {
            // Default to this week
            $query->whereBetween('plan_date', [now()->startOfWeek(), now()->endOfWeek()]);
        }

        // Managers/admins see their team's plans, employees see only their own.
        if ($user->isManager()) {
            $query->whereIn('user_id', $user->subordinates->pluck('id')->push($user->id));
        } else {
            $query->where('user_id', $user->id);
        }

        $plans = $query->paginate(15)->appends(['week' => $week]);

        return view('plans.index', compact('plans', 'week'));
    }

    public function create(): View
    {
        return view('plans.create');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'plan_date' => 'required|date',
        ]);

        $data['user_id'] = auth()->id();
        $data['status'] = 'pending';

        Plan::create($data);

        return redirect()->route('plans.index')->with('success', 'Plan created.');
    }

    public function updateStatus(Request $request, Plan $plan): RedirectResponse
    {
        $this->authorizePlanOwner($plan);

        $request->validate([
            'status' => 'required|in:pending,in_progress,completed,missed',
        ]);

        $plan->update(['status' => $request->status]);

        return back()->with('success', 'Plan status updated.');
    }

    private function authorizePlanOwner(Plan $plan): void
    {
        abort_unless($plan->user_id === auth()->id() || auth()->user()->isManager(), 403);
    }
}
