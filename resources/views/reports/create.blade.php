@extends('layouts.app')
@section('title', 'Submit Report')

@section('content')
    @php
        $now = \Carbon\Carbon::now();
        $isFriday = $now->isFriday();
    @endphp

    <div class="max-w-2xl">
        <div class="mb-6">
            <a href="{{ route('plans.index') }}" class="text-xs font-semibold text-teal-800 hover:underline">&larr; Back to plans</a>
            <h1 class="text-2xl font-bold tracking-tight text-teal-950 mt-1">
                {{ $isFriday ? 'Friday Weekly Report & Wrap-Up' : 'Daily Progress Report' }}
            </h1>
            <p class="text-sm text-stone-600 mt-1">
                {{ $isFriday ? 'Summarize your achievements, finished deliverables, and blockers for this week.' : 'Report completed work, progress percentage, and time spent before punching out.' }}
            </p>
        </div>

        <form method="POST" action="{{ route('reports.store') }}" class="bg-[#fffdf5] rounded-xl border border-teal-100 p-6 space-y-4 shadow-sm">
            @csrf

            <div>
                <label class="block text-sm font-medium text-teal-900 mb-1">Linked Plan (optional)</label>
                <select name="plan_id" class="w-full rounded-lg border-teal-200 text-sm focus:border-teal-600 focus:ring-teal-600">
                    <option value="">— No linked plan —</option>
                    @foreach ($plans as $plan)
                        <option value="{{ $plan->id }}" {{ (old('plan_id', request('plan_id')) == $plan->id) ? 'selected' : '' }}>
                            {{ $plan->plan_date->format('d M') }} — {{ $plan->title }}
                        </option>
                    @endforeach
                </select>
            </div>

            <div>
                <label class="block text-sm font-medium text-teal-900 mb-1">Report Date</label>
                <input type="date" name="report_date" value="{{ old('report_date', request('report_date', now()->toDateString())) }}" required
                       class="w-full rounded-lg border-teal-200 text-sm focus:border-teal-600 focus:ring-teal-600">
                @error('report_date') <p class="text-rose-600 text-xs mt-1">{{ $message }}</p> @enderror
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-teal-900 mb-1">Start Time (optional)</label>
                    <input type="time" name="start_time" value="{{ old('start_time', '08:10') }}"
                           class="w-full rounded-lg border-teal-200 text-sm focus:border-teal-600 focus:ring-teal-600">
                    @error('start_time') <p class="text-rose-600 text-xs mt-1">{{ $message }}</p> @enderror
                </div>
                <div>
                    <label class="block text-sm font-medium text-teal-900 mb-1">End Time (optional)</label>
                    <input type="time" name="end_time" value="{{ old('end_time', '17:30') }}"
                           class="w-full rounded-lg border-teal-200 text-sm focus:border-teal-600 focus:ring-teal-600">
                    @error('end_time') <p class="text-rose-600 text-xs mt-1">{{ $message }}</p> @enderror
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium text-teal-900 mb-1">
                    {{ $isFriday ? 'Weekly Accomplishments, Finished Tasks & Blockers' : 'Description of Work Completed' }}
                </label>
                <textarea name="description" rows="4" required
                          placeholder="{{ $isFriday ? '1. Key accomplishments and completed goals this week&#10;2. Ongoing tasks transitioning to next week&#10;3. Blockers or learnings...' : '• Completed scheduled items&#10;• Progress updates&#10;• Notes for tomorrow...' }}"
                          class="w-full rounded-lg border-teal-200 text-sm focus:border-teal-600 focus:ring-teal-600">{{ old('description') }}</textarea>
                @error('description') <p class="text-rose-600 text-xs mt-1">{{ $message }}</p> @enderror
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-teal-900 mb-1">Progress (%)</label>
                    <input type="number" name="percentage" min="0" max="100" value="{{ old('percentage', 100) }}" required
                           class="w-full rounded-lg border-teal-200 text-sm focus:border-teal-600 focus:ring-teal-600">
                    @error('percentage') <p class="text-rose-600 text-xs mt-1">{{ $message }}</p> @enderror
                </div>

                <div>
                    <label class="block text-sm font-medium text-teal-900 mb-1">Status</label>
                    <select name="status" class="w-full rounded-lg border-teal-200 text-sm focus:border-teal-600 focus:ring-teal-600">
                        <option value="completed" {{ old('status') === 'completed' ? 'selected' : '' }}>Completed</option>
                        <option value="on_track" {{ old('status') === 'on_track' ? 'selected' : '' }}>On track</option>
                        <option value="delayed" {{ old('status') === 'delayed' ? 'selected' : '' }}>Delayed</option>
                        <option value="blocked" {{ old('status') === 'blocked' ? 'selected' : '' }}>Blocked</option>
                    </select>
                </div>
            </div>

            <div class="flex items-center gap-3 pt-2">
                <button type="submit" class="px-5 py-2.5 rounded-lg bg-teal-900 text-white text-xs font-semibold hover:bg-teal-800 shadow-sm transition">
                    Submit Report
                </button>
                <a href="{{ route('plans.index') }}" class="text-xs text-stone-500 hover:text-stone-800">
                    Cancel
                </a>
            </div>
        </form>
    </div>
@endsection
