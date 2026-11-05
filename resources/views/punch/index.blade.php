@extends('layouts.app')
@section('title', 'Punch In/Out')

@section('content')
    <h1 class="text-2xl font-semibold mb-6">Today's attendance</h1>

    @if (auth()->user()->isManager())
        <div class="bg-white rounded-lg border border-slate-200 p-6 max-w-md mb-8 text-sm text-slate-600">
            Managers do not punch in/out. You can review your team's
            <a href="{{ route('reports.index') }}" class="text-slate-900 font-medium underline">reports</a> instead.
        </div>
    @else
    <div class="bg-white rounded-lg border border-slate-200 p-6 max-w-md mb-8">
        <p class="text-sm text-slate-500 mb-4">{{ now()->format('l, d M Y') }}</p>

        <div class="flex gap-4 mb-4 text-sm">
            <div>
                <p class="text-slate-500">Punch in</p>
                <p class="font-medium">{{ $todayAttendance->punch_in?->format('H:i') ?? '—' }}</p>
            </div>
            <div>
                <p class="text-slate-500">Punch out</p>
                <p class="font-medium">{{ $todayAttendance->punch_out?->format('H:i') ?? '—' }}</p>
            </div>
        </div>

        <div class="flex gap-3">
            <form method="POST" action="{{ route('punch.in') }}">
                @csrf
                <button class="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium disabled:opacity-40"
                        {{ $todayAttendance->punch_in ? 'disabled' : '' }}>
                    Punch in
                </button>
            </form>
            <form method="POST" action="{{ route('punch.out') }}">
                @csrf
                <button class="px-4 py-2 rounded-md border border-slate-300 text-sm font-medium disabled:opacity-40"
                        {{ !$todayAttendance->punch_in || $todayAttendance->punch_out ? 'disabled' : '' }}>
                    Punch out
                </button>
            </form>
        </div>
    </div>

    <h2 class="text-lg font-semibold mb-3">Last 7 days</h2>
    <div class="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-slate-50 text-slate-500 text-left">
                <tr>
                    <th class="px-4 py-2">Date</th>
                    <th class="px-4 py-2">In</th>
                    <th class="px-4 py-2">Out</th>
                    <th class="px-4 py-2">Hours</th>
                    <th class="px-4 py-2">Status</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                @forelse ($recent as $row)
                    <tr>
                        <td class="px-4 py-2">{{ $row->date->format('d M') }}</td>
                        <td class="px-4 py-2">{{ $row->punch_in?->format('H:i') ?? '—' }}</td>
                        <td class="px-4 py-2">{{ $row->punch_out?->format('H:i') ?? '—' }}</td>
                        <td class="px-4 py-2">{{ $row->total_hours ?? '—' }}</td>
                        <td class="px-4 py-2">
                            <span class="badge {{ $row->status === 'present' ? 'bg-emerald-50 text-emerald-700' : ($row->status === 'late' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700') }}">
                                {{ str_replace('_', ' ', $row->status) }}
                            </span>
                        </td>
                    </tr>
                @empty
                    <tr><td class="px-4 py-4 text-slate-400" colspan="5">No attendance records yet.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>
    @endif
@endsection
