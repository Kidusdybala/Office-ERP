@extends('layouts.app')
@section('title', 'New report')

@section('content')
    <h1 class="text-2xl font-semibold mb-6">New report</h1>

    <form method="POST" action="{{ route('reports.store') }}" class="bg-white rounded-lg border border-slate-200 p-6 max-w-lg space-y-4">
        @csrf

        <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Linked plan (optional)</label>
            <select name="plan_id" class="w-full rounded-md border-slate-300 text-sm">
                <option value="">— No linked plan —</option>
                @foreach ($plans as $plan)
                    <option value="{{ $plan->id }}" {{ old('plan_id') == $plan->id ? 'selected' : '' }}>
                        {{ $plan->plan_date->format('d M') }} — {{ $plan->title }}
                    </option>
                @endforeach
            </select>
        </div>

        <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Report date</label>
            <input type="date" name="report_date" value="{{ old('report_date', now()->toDateString()) }}" required
                   class="w-full rounded-md border-slate-300 text-sm">
        </div>

        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Start time (optional)</label>
                <input type="time" name="start_time" value="{{ old('start_time') }}"
                       class="w-full rounded-md border-slate-300 text-sm">
                @error('start_time') <p class="text-rose-600 text-xs mt-1">{{ $message }}</p> @enderror
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">End time (optional)</label>
                <input type="time" name="end_time" value="{{ old('end_time') }}"
                       class="w-full rounded-md border-slate-300 text-sm">
                @error('end_time') <p class="text-rose-600 text-xs mt-1">{{ $message }}</p> @enderror
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea name="description" rows="4" required class="w-full rounded-md border-slate-300 text-sm">{{ old('description') }}</textarea>
            @error('description') <p class="text-rose-600 text-xs mt-1">{{ $message }}</p> @enderror
        </div>

        <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Progress (%)</label>
            <input type="number" name="percentage" min="0" max="100" value="{{ old('percentage', 0) }}" required
                   class="w-full rounded-md border-slate-300 text-sm">
            @error('percentage') <p class="text-rose-600 text-xs mt-1">{{ $message }}</p> @enderror
        </div>

        <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select name="status" class="w-full rounded-md border-slate-300 text-sm">
                <option value="on_track">On track</option>
                <option value="delayed">Delayed</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
            </select>
        </div>

        <button class="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium">Submit report</button>
    </form>
@endsection
