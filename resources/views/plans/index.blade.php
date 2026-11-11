@extends('layouts.app')
@section('title', 'Plans & Daily Workflow')

@section('content')
    @php
        $now = \Carbon\Carbon::now();
        $isMonday = $now->isMonday();
        $isFriday = $now->isFriday();
    @endphp

    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
            <h1 class="text-2xl font-bold tracking-tight text-teal-950">Plans &amp; Daily Workflow</h1>
            <p class="text-sm text-stone-600 mt-1">Plan and report every day · Set weekly plans on Mondays · Submit weekly reports on Fridays</p>
            <div class="flex items-center gap-2 mt-3 text-sm">
                <a href="{{ route('plans.index', ['week' => 'this_week']) }}" class="px-3 py-1.5 rounded-lg {{ $week === 'this_week' ? 'bg-teal-900 text-white font-medium' : 'bg-white border border-teal-200 text-stone-600 hover:bg-teal-50' }}">This week</a>
                <a href="{{ route('plans.index', ['week' => 'last_week']) }}" class="px-3 py-1.5 rounded-lg {{ $week === 'last_week' ? 'bg-teal-900 text-white font-medium' : 'bg-white border border-teal-200 text-stone-600 hover:bg-teal-50' }}">Last week</a>
                <a href="{{ route('plans.index', ['week' => 'all']) }}" class="px-3 py-1.5 rounded-lg {{ $week === 'all' ? 'bg-teal-900 text-white font-medium' : 'bg-white border border-teal-200 text-stone-600 hover:bg-teal-50' }}">All previous plans</a>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <a href="{{ route('plans.create', ['type' => 'weekly']) }}" class="px-3.5 py-2 rounded-lg border border-teal-200 bg-white text-teal-900 text-xs font-semibold hover:bg-teal-50 shadow-sm">
                + Monday Weekly Plan
            </a>
            <a href="{{ route('plans.create') }}" class="px-4 py-2 rounded-lg bg-teal-900 text-white text-xs font-semibold hover:bg-teal-800 shadow-sm">
                + New Daily Plan
            </a>
        </div>
    </div>

    @if($isMonday)
        <div class="mb-6 flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950">
            <div class="flex items-center gap-2">
                <span class="text-base">⚡</span>
                <span><strong>Today is Monday:</strong> Kick off your week! Set your weekly goals and targets.</span>
            </div>
            <a href="{{ route('plans.create', ['type' => 'weekly']) }}" class="font-semibold text-teal-900 underline hover:text-teal-700">Set weekly plan &rarr;</a>
        </div>
    @elseif($isFriday)
        <div class="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <div class="flex items-center gap-2">
                <span class="text-base">📋</span>
                <span><strong>Today is Friday:</strong> Wrap up your week! Submit your weekly progress report.</span>
            </div>
            <a href="{{ route('reports.create') }}" class="font-semibold text-amber-900 underline hover:text-amber-700">Submit weekly report &rarr;</a>
        </div>
    @endif

    <div class="bg-[#fffdf5] rounded-xl border border-teal-100 overflow-hidden shadow-sm">
        <table class="w-full text-sm">
            <thead class="bg-[#f8f6ee] text-stone-500 text-left text-xs uppercase tracking-wider">
                <tr>
                    <th class="px-4 py-3">Plan Date</th>
                    <th class="px-4 py-3">Employee</th>
                    <th class="px-4 py-3">Title &amp; Goals</th>
                    <th class="px-4 py-3">Status</th>
                    <th class="px-4 py-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-teal-50">
                @forelse ($plans as $plan)
                    <tr class="hover:bg-teal-50/30 transition-colors {{ $plan->latestReport ? 'border-b-0' : '' }}">
                        <td class="px-4 py-3 whitespace-nowrap text-stone-700">
                            <span class="font-semibold text-teal-950">{{ $plan->plan_date->format('d M Y') }}</span>
                            <div class="text-[11px] text-stone-400">{{ $plan->plan_date->format('l') }}</div>
                        </td>
                        <td class="px-4 py-3 font-medium text-stone-800">{{ $plan->user->name }}</td>
                        <td class="px-4 py-3">
                            <div class="font-semibold text-teal-950">{{ $plan->title }}</div>
                            @if($plan->description)
                                <div class="text-xs text-stone-500 line-clamp-2 mt-0.5">{{ $plan->description }}</div>
                            @endif
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap">
                            <span class="badge {{ $plan->status === 'completed' ? 'bg-emerald-100 text-emerald-800' : ($plan->status === 'missed' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800') }}">
                                {{ str_replace('_', ' ', $plan->status) }}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-right whitespace-nowrap">
                            @if(!$plan->latestReport)
                                <a href="{{ route('reports.create', ['plan_id' => $plan->id, 'report_date' => $plan->plan_date->toDateString()]) }}"
                                   class="inline-flex items-center rounded-md bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900 hover:bg-teal-200">
                                    + Add Report
                                </a>
                            @else
                                <a href="{{ route('reports.create', ['plan_id' => $plan->id, 'report_date' => $plan->plan_date->toDateString()]) }}"
                                   class="inline-flex items-center rounded-md border border-teal-200 bg-white px-2.5 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50">
                                    Update Report
                                </a>
                            @endif
                        </td>
                    </tr>
                    @if($plan->latestReport)
                        <tr class="bg-[#f8f6ee]/60 text-stone-600 text-xs border-b border-teal-50">
                            <td colspan="5" class="px-4 py-2.5 pb-3">
                                <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <span class="font-semibold text-teal-900">Report:</span>
                                    <span>{{ $plan->latestReport->description }}</span>
                                    <span class="text-teal-200">&bull;</span>
                                    <span><strong>Progress:</strong> <span class="font-semibold text-teal-950">{{ $plan->latestReport->percentage }}%</span></span>
                                    <span class="text-teal-200">&bull;</span>
                                    <span><strong>Status:</strong> {{ str_replace('_', ' ', $plan->latestReport->status) }}</span>
                                    @if($plan->latestReport->start_time || $plan->latestReport->end_time)
                                        <span class="text-teal-200">&bull;</span>
                                        <span><strong>Hours:</strong> {{ $plan->latestReport->start_time ?? '?' }} - {{ $plan->latestReport->end_time ?? '?' }}</span>
                                    @endif
                                </div>
                            </td>
                        </tr>
                    @endif
                @empty
                    <tr>
                        <td class="px-4 py-8 text-center text-stone-400" colspan="5">
                            No plans found for this period. Click "+ New Daily Plan" above to create your schedule.
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="mt-4">{{ $plans->links() }}</div>
@endsection
