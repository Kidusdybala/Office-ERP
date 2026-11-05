@extends('layouts.app')
@section('title', 'Plans')

@section('content')
    <div class="flex items-center justify-between mb-6">
        <div class="flex flex-col space-y-2">
            <h1 class="text-2xl font-semibold">Plans</h1>
            <div class="flex items-center space-x-2 text-sm">
                <a href="{{ route('plans.index', ['week' => 'this_week']) }}" class="px-3 py-1 rounded-md {{ $week === 'this_week' ? 'bg-slate-200 text-slate-800 font-medium' : 'text-slate-500 hover:bg-slate-100' }}">This week</a>
                <a href="{{ route('plans.index', ['week' => 'last_week']) }}" class="px-3 py-1 rounded-md {{ $week === 'last_week' ? 'bg-slate-200 text-slate-800 font-medium' : 'text-slate-500 hover:bg-slate-100' }}">Last week</a>
            </div>
        </div>
        <a href="{{ route('plans.create') }}" class="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium">New plan</a>
    </div>

    <div class="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-slate-50 text-slate-500 text-left">
                <tr>
                    <th class="px-4 py-2">Date</th>
                    <th class="px-4 py-2">Employee</th>
                    <th class="px-4 py-2">Title</th>
                    <th class="px-4 py-2">Status</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                @forelse ($plans as $plan)
                    <tr class="{{ $plan->latestReport ? 'border-b-0' : '' }}">
                        <td class="px-4 py-2">{{ $plan->plan_date->format('d M Y') }}</td>
                        <td class="px-4 py-2">{{ $plan->user->name }}</td>
                        <td class="px-4 py-2">{{ $plan->title }}</td>
                        <td class="px-4 py-2">
                            <span class="badge {{ $plan->status === 'completed' ? 'bg-emerald-50 text-emerald-700' : ($plan->status === 'missed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700') }}">
                                {{ str_replace('_', ' ', $plan->status) }}
                            </span>
                        </td>
                    </tr>
                    @if($plan->latestReport)
                        <tr class="bg-slate-50/50 text-slate-500 text-xs">
                            <td colspan="4" class="px-4 py-2 pb-3">
                                <strong>Report:</strong> {{ $plan->latestReport->description }} 
                                <span class="mx-2 text-slate-300">&bull;</span>
                                <strong>Progress:</strong> {{ $plan->latestReport->percentage }}%
                                @if($plan->latestReport->start_time || $plan->latestReport->end_time)
                                    <span class="mx-2 text-slate-300">&bull;</span>
                                    <strong>Time:</strong> 
                                    {{ $plan->latestReport->start_time ? \Carbon\Carbon::parse($plan->latestReport->start_time)->format('H:i') : '?' }} 
                                    - 
                                    {{ $plan->latestReport->end_time ? \Carbon\Carbon::parse($plan->latestReport->end_time)->format('H:i') : '?' }}
                                @endif
                            </td>
                        </tr>
                    @endif
                @empty
                    <tr><td class="px-4 py-4 text-slate-400" colspan="4">No plans found for this period.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="mt-4">{{ $plans->links() }}</div>
@endsection
