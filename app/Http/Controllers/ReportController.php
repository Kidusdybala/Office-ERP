<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ReportController extends Controller
{
    public function index(Request $request): View
    {
        $user = auth()->user();

        $sort = $request->query('sort', 'percentage_desc');
        $allowed = ['percentage_desc', 'percentage_asc', 'date_desc', 'date_asc', 'employee'];
        if (!in_array($sort, $allowed)) {
            $sort = 'percentage_desc';
        }

        $query = Report::with(['user', 'plan']);

        if ($user->isManager()) {
            // Managers oversee everyone: show reports from all employees.
            $employeeIds = User::where('role', 'employee')->pluck('id');
            $query->whereIn('user_id', $employeeIds);
        } else {
            $query->where('user_id', $user->id);
        }

        switch ($sort) {
            case 'percentage_asc':
                $query->orderBy('percentage', 'asc');
                break;
            case 'date_asc':
                $query->orderBy('report_date', 'asc');
                break;
            case 'date_desc':
                $query->orderBy('report_date', 'desc');
                break;
            case 'employee':
                $query->orderBy(User::select('name')->whereColumn('users.id', 'reports.user_id'), 'asc');
                break;
            case 'percentage_desc':
            default:
                $query->orderBy('percentage', 'desc');
                break;
        }

        $reports = $query->paginate(15)->withQueryString();

        return view('reports.index', compact('reports', 'sort'));
    }

    public function create(): View
    {
        if (auth()->user()->isManager()) {
            return redirect()->route('reports.index');
        }

        $plans = Plan::where('user_id', auth()->id())
            ->whereIn('status', ['pending', 'in_progress'])
            ->orderByDesc('plan_date')
            ->get();

        return view('reports.create', compact('plans'));
    }

    public function store(Request $request): RedirectResponse
    {
        if (auth()->user()->isManager()) {
            return redirect()->route('reports.index');
        }

        $data = $request->validate([
            'plan_id' => 'nullable|exists:plans,id',
            'report_date' => 'required|date',
            'description' => 'required|string',
            'percentage' => 'required|integer|min:0|max:100',
            'status' => 'required|in:on_track,delayed,completed,blocked',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
        ]);

        $data['user_id'] = auth()->id();

        $report = Report::create($data);

        // Keep the linked plan's status in sync with the latest report.
        if ($report->plan_id) {
            $plan = Plan::find($report->plan_id);
            if ($plan && $plan->user_id === auth()->id()) {
                $plan->update([
                    'status' => $report->percentage >= 100 ? 'completed' : 'in_progress',
                ]);
            }
        }

        return redirect()->route('reports.index')->with('success', 'Report submitted.');
    }
}
