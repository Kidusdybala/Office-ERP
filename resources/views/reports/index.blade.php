@extends('layouts.app')
@section('title', 'Reports')

@section('content')
    <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-semibold">Reports</h1>
        <div class="flex items-center gap-3">
            <form method="GET" class="flex items-center gap-2">
                <label for="sort" class="text-sm text-slate-500">Sort by</label>
                <select id="sort" name="sort" onchange="this.form.submit()" class="rounded-md border-slate-300 text-sm">
                    @if (auth()->user()->isManager())
                        <option value="percentage_desc" {{ $sort === 'percentage_desc' ? 'selected' : '' }}>Highest progress</option>
                        <option value="percentage_asc" {{ $sort === 'percentage_asc' ? 'selected' : '' }}>Lowest progress</option>
                        <option value="employee" {{ $sort === 'employee' ? 'selected' : '' }}>By employee</option>
                    @else
                        <option value="percentage_desc" {{ $sort === 'percentage_desc' ? 'selected' : '' }}>Highest progress</option>
                        <option value="percentage_asc" {{ $sort === 'percentage_asc' ? 'selected' : '' }}>Lowest progress</option>
                    @endif
                    <option value="date_desc" {{ $sort === 'date_desc' ? 'selected' : '' }}>Newest first</option>
                    <option value="date_asc" {{ $sort === 'date_asc' ? 'selected' : '' }}>Oldest first</option>
                </select>
            </form>
            @if (!auth()->user()->isManager())
                <a href="{{ route('reports.create') }}" class="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium">New report</a>
            @endif
        </div>
    </div>

    <div class="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-slate-50 text-slate-500 text-left">
                <tr>
                    <th class="px-4 py-2">Date</th>
                    <th class="px-4 py-2">Employee</th>
                    <th class="px-4 py-2">Linked plan</th>
                    <th class="px-4 py-2">Progress</th>
                    <th class="px-4 py-2">Status</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                @forelse ($reports as $report)
                    <tr>
                        <td class="px-4 py-2">{{ $report->report_date->format('d M Y') }}</td>
                        <td class="px-4 py-2">{{ $report->user->name }}</td>
                        <td class="px-4 py-2">{{ $report->plan->title ?? '—' }}</td>
                        <td class="px-4 py-2">
                            <div class="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div class="h-full bg-slate-900" style="width: {{ $report->percentage }}%"></div>
                            </div>
                            <span class="text-xs text-slate-500">{{ $report->percentage }}%</span>
                        </td>
                        <td class="px-4 py-2">
                            <span class="badge {{ $report->status === 'completed' ? 'bg-emerald-50 text-emerald-700' : ($report->status === 'blocked' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700') }}">
                                {{ str_replace('_', ' ', $report->status) }}
                            </span>
                        </td>
                    </tr>
                @empty
                    <tr><td class="px-4 py-4 text-slate-400" colspan="5">No reports yet.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="mt-4">{{ $reports->links() }}</div>
@endsection
