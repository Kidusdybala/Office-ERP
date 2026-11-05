@extends('layouts.app')
@section('title', 'New plan')

@section('content')
    <h1 class="text-2xl font-semibold mb-6">New plan</h1>

    <form method="POST" action="{{ route('plans.store') }}" class="bg-white rounded-lg border border-slate-200 p-6 max-w-lg space-y-4">
        @csrf

        <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input type="text" name="title" value="{{ old('title') }}" required
                   class="w-full rounded-md border-slate-300 text-sm">
            @error('title') <p class="text-rose-600 text-xs mt-1">{{ $message }}</p> @enderror
        </div>

        <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea name="description" rows="3" class="w-full rounded-md border-slate-300 text-sm">{{ old('description') }}</textarea>
        </div>

        <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Plan date</label>
            <input type="date" name="plan_date" value="{{ old('plan_date', now()->toDateString()) }}" required
                   class="w-full rounded-md border-slate-300 text-sm">
            @error('plan_date') <p class="text-rose-600 text-xs mt-1">{{ $message }}</p> @enderror
        </div>

        <button class="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium">Save plan</button>
    </form>
@endsection
