@extends('layouts.app')
@section('title', request('type') === 'weekly' ? 'Set Weekly Plan' : 'New Daily Plan')

@section('content')
    @php
        $isWeekly = request('type') === 'weekly';
        $defaultDate = $isWeekly ? now()->startOfWeek()->toDateString() : old('plan_date', now()->toDateString());
        $defaultTitle = $isWeekly ? 'Weekly Plan — Week of ' . now()->startOfWeek()->format('d M Y') : old('title');
    @endphp

    <div class="max-w-2xl">
        <div class="mb-6">
            <a href="{{ route('plans.index') }}" class="text-xs font-semibold text-teal-800 hover:underline">&larr; Back to plans</a>
            <h1 class="text-2xl font-bold tracking-tight text-teal-950 mt-1">
                {{ $isWeekly ? 'Monday Weekly Plan' : 'New Daily Plan' }}
            </h1>
            <p class="text-sm text-stone-600 mt-1">
                {{ $isWeekly ? 'Set your overarching priorities, focus areas, and key deliverables for this week.' : 'Outline your specific tasks and objectives for the day.' }}
            </p>
        </div>

        <form method="POST" action="{{ route('plans.store') }}" class="bg-[#fffdf5] rounded-xl border border-teal-100 p-6 space-y-4 shadow-sm">
            @csrf

            <div>
                <label class="block text-sm font-medium text-teal-900 mb-1">
                    {{ $isWeekly ? 'Weekly Plan Title' : 'Daily Plan Title / Focus' }}
                </label>
                <input type="text" name="title" value="{{ $defaultTitle }}" required
                       placeholder="{{ $isWeekly ? 'e.g. Deliver ERP feature milestones & system tests' : 'e.g. Complete analytics dashboard integration' }}"
                       class="w-full rounded-lg border-teal-200 text-sm focus:border-teal-600 focus:ring-teal-600">
                @error('title') <p class="text-rose-600 text-xs mt-1">{{ $message }}</p> @enderror
            </div>

            <div>
                <label class="block text-sm font-medium text-teal-900 mb-1">Description &amp; Deliverables</label>
                <textarea name="description" rows="4"
                          placeholder="{{ $isWeekly ? '1. Core milestones for this week&#10;2. Cross-team meetings and reviews&#10;3. Key output expected by Friday' : '• Task 1: Complete morning tasks&#10;• Task 2: Code review & verify&#10;• Notes / dependencies' }}"
                          class="w-full rounded-lg border-teal-200 text-sm focus:border-teal-600 focus:ring-teal-600">{{ old('description') }}</textarea>
                @error('description') <p class="text-rose-600 text-xs mt-1">{{ $message }}</p> @enderror
            </div>

            <div>
                <label class="block text-sm font-medium text-teal-900 mb-1">Plan Date</label>
                <input type="date" name="plan_date" value="{{ $defaultDate }}" required
                       class="w-full rounded-lg border-teal-200 text-sm focus:border-teal-600 focus:ring-teal-600">
                @error('plan_date') <p class="text-rose-600 text-xs mt-1">{{ $message }}</p> @enderror
            </div>

            <div class="flex items-center gap-3 pt-2">
                <button type="submit" class="px-5 py-2.5 rounded-lg bg-teal-900 text-white text-xs font-semibold hover:bg-teal-800 shadow-sm transition">
                    Save {{ $isWeekly ? 'Weekly Plan' : 'Daily Plan' }}
                </button>
                <a href="{{ route('plans.index') }}" class="text-xs text-stone-500 hover:text-stone-800">
                    Cancel
                </a>
            </div>
        </form>
    </div>
@endsection
