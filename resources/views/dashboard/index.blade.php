@extends('layouts.app')
@section('title', 'Dashboard')

@section('content')
    <!-- Company Header & Employee Greeting Banner -->
    <div class="mb-6 rounded-xl border border-teal-100 bg-gradient-to-r from-[#fffdf5] via-[#fffdf5] to-teal-50/50 p-6 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-4">
                <img src="{{ asset('images/logo-circle.png') }}" alt="IRack IT Solution" class="h-14 w-14 rounded-full object-cover shadow-sm border-2 border-white">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-xl font-bold tracking-tight text-teal-950">IRack IT Solution</span>
                        <span class="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-900 capitalize">
                            {{ auth()->user()->role ?? 'Employee' }}
                        </span>
                    </div>
                    <p class="text-sm text-stone-600 mt-0.5">
                        Welcome back, <strong class="text-teal-950">{{ auth()->user()->name }}</strong>
                        @if(auth()->user()->department)
                            · <span class="text-stone-500">{{ auth()->user()->department->name }}</span>
                        @endif
                        @if(auth()->user()->badge_number)
                            · <span class="text-stone-500">Badge #{{ auth()->user()->badge_number }}</span>
                        @endif
                    </p>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                @if(!auth()->user()->isManager())
                    @if($todayAttendance?->punch_in && !$todayAttendance?->punch_out)
                        <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                            <span class="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
                            Punched IN ({{ $todayAttendance->punch_in->format('H:i') }})
                        </span>
                        <form method="POST" action="{{ route('punch.out') }}" class="inline">
                            @csrf
                            <button type="submit" class="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition">
                                Punch Out
                            </button>
                        </form>
                    @elseif($todayAttendance?->punch_out)
                        <span class="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                            Punched OUT ({{ $todayAttendance->punch_out->format('H:i') }})
                        </span>
                    @else
                        <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                            Not punched in today
                        </span>
                        <form method="POST" action="{{ route('punch.in') }}" class="inline">
                            @csrf
                            <button type="submit" class="rounded-lg bg-teal-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 transition">
                                Punch In
                            </button>
                        </form>
                    @endif
                @endif
                <button type="button" onclick="document.getElementById('logout-modal').showModal()"
                        class="rounded-lg border border-teal-200 bg-white px-3.5 py-1.5 text-xs font-medium text-teal-900 shadow-sm hover:bg-teal-50 transition">
                    Log out
                </button>
            </div>
        </div>
    </div>

    @php
        $now = \Carbon\Carbon::now();
        $isMonday = $now->isMonday();
        $isFriday = $now->isFriday();
    @endphp

    @if($isMonday)
        <div class="mb-6 flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950">
            <div class="flex items-center gap-2">
                <span class="text-base">⚡</span>
                <span><strong>Today is Monday!</strong> Kick off your week by outlining your <strong>Weekly Plan</strong> below.</span>
            </div>
            <a href="{{ route('plans.create') }}" class="font-semibold text-teal-900 underline hover:text-teal-700">Set weekly plan &rarr;</a>
        </div>
    @elseif($isFriday)
        <div class="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <div class="flex items-center gap-2">
                <span class="text-base">📋</span>
                <span><strong>Today is Friday!</strong> Wrap up your accomplishments and submit your <strong>Weekly Report</strong>.</span>
            </div>
            <a href="{{ route('reports.create') }}" class="font-semibold text-amber-900 underline hover:text-amber-700">Submit weekly report &rarr;</a>
        </div>
    @endif

    <!-- Key Performance Analytics Cards Grid -->
    <div class="mb-8">
        <h2 class="text-lg font-semibold text-teal-950 mb-3">Key Performance &amp; Attendance Analytics</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <!-- Card 1: Attendance Rate -->
            <div class="rounded-xl border border-teal-100 bg-[#fffdf5] p-5 shadow-sm">
                <div class="flex items-center justify-between text-sm text-stone-500 mb-1">
                    <span>Attendance Rate</span>
                    <span class="text-xs font-medium text-teal-700">This Month</span>
                </div>
                <div class="flex items-baseline gap-2">
                    <p class="text-3xl font-bold text-teal-950">{{ $stats['attendance'] }}%</p>
                    <span class="text-xs text-stone-500">({{ $stats['weeklyAttendance'] }}% this week)</span>
                </div>
                <div class="mt-3 h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div class="h-full rounded-full {{ $stats['attendance'] >= 90 ? 'bg-emerald-500' : ($stats['attendance'] >= 75 ? 'bg-amber-500' : 'bg-rose-500') }}"
                         style="width: {{ min(100, $stats['attendance']) }}%"></div>
                </div>
                <p class="mt-2 text-xs text-stone-500">Based on working weekdays attended</p>
            </div>

            <!-- Card 2: Hours Worked -->
            <div class="rounded-xl border border-teal-100 bg-[#fffdf5] p-5 shadow-sm">
                <div class="flex items-center justify-between text-sm text-stone-500 mb-1">
                    <span>Hours Worked</span>
                    <span class="text-xs font-medium text-teal-700">This Week</span>
                </div>
                <div class="flex items-baseline gap-2">
                    <p class="text-3xl font-bold text-teal-950">{{ $stats['hoursThisWeek'] }} <span class="text-lg font-medium">hrs</span></p>
                </div>
                <div class="mt-3 h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div class="h-full rounded-full bg-teal-600"
                         style="width: {{ min(100, ($stats['hoursThisWeek'] / 40) * 100) }}%"></div>
                </div>
                <p class="mt-2 text-xs text-stone-500">{{ $stats['hoursThisMonth'] }} hrs logged this month</p>
            </div>

            <!-- Card 3: On-Time Rate -->
            <div class="rounded-xl border border-teal-100 bg-[#fffdf5] p-5 shadow-sm">
                <div class="flex items-center justify-between text-sm text-stone-500 mb-1">
                    <span>On-Time Arrival</span>
                    <span class="text-xs font-medium text-teal-700">Cutoff 09:00</span>
                </div>
                <div class="flex items-baseline gap-2">
                    <p class="text-3xl font-bold text-teal-950">{{ $stats['onTime'] }}%</p>
                    <span class="text-xs text-stone-500">punctuality</span>
                </div>
                <div class="mt-3 h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div class="h-full rounded-full {{ $stats['onTime'] >= 90 ? 'bg-emerald-500' : ($stats['onTime'] >= 75 ? 'bg-amber-500' : 'bg-rose-500') }}"
                         style="width: {{ min(100, $stats['onTime']) }}%"></div>
                </div>
                <p class="mt-2 text-xs text-stone-500">Punctuality score across shifts</p>
            </div>

            <!-- Card 4: Plan & Report Completion -->
            <div class="rounded-xl border border-teal-100 bg-[#fffdf5] p-5 shadow-sm">
                <div class="flex items-center justify-between text-sm text-stone-500 mb-1">
                    <span>Plan Completion</span>
                    <span class="text-xs font-medium text-teal-700">Report Avg</span>
                </div>
                <div class="flex items-baseline gap-2">
                    <p class="text-3xl font-bold text-teal-950">{{ $stats['planCompletion'] }}%</p>
                    <span class="text-xs text-stone-500">completion</span>
                </div>
                <div class="mt-3 h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div class="h-full rounded-full {{ $stats['planCompletion'] >= 80 ? 'bg-emerald-500' : ($stats['planCompletion'] >= 50 ? 'bg-amber-500' : 'bg-rose-500') }}"
                         style="width: {{ min(100, $stats['planCompletion']) }}%"></div>
                </div>
                <p class="mt-2 text-xs text-stone-500">Average progress of submitted reports</p>
            </div>
        </div>
    </div>

    <!-- Visual Chart & Daily Workflow Section -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        <!-- Daily Hours Visual Bar Chart (2 columns) -->
        <div class="rounded-xl border border-teal-100 bg-[#fffdf5] p-6 shadow-sm lg:col-span-2">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h2 class="text-base font-semibold text-teal-950">Work Hours by Day (This Week)</h2>
                    <p class="text-xs text-stone-500">Standard reference line: 8.0 hours/day</p>
                </div>
                <span class="text-xs font-semibold text-teal-900 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100">
                    Week total: {{ $stats['hoursThisWeek'] }} hrs
                </span>
            </div>

            @php
                $maxHours = 9.0;
                foreach($weekDays as $wd) {
                    if ($wd['hours'] > $maxHours) $maxHours = $wd['hours'];
                }
                $targetLineY = 110 - (8.0 / $maxHours * 85);
            @endphp

            <div class="w-full">
                <svg viewBox="0 0 320 140" class="w-full h-44 overflow-visible">
                    <!-- 8h Target Dashed Line -->
                    <line x1="10" y1="{{ $targetLineY }}" x2="310" y2="{{ $targetLineY }}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>
                    <text x="312" y="{{ $targetLineY + 3 }}" text-anchor="end" font-size="9" fill="#64748b">8h target</text>

                    <!-- Baseline -->
                    <line x1="10" y1="110" x2="310" y2="110" stroke="#e2e8f0" stroke-width="1"/>

                    @foreach($weekDays as $idx => $wd)
                        @php
                            $barX = $idx * 60 + 20;
                            $barHeight = $wd['hours'] > 0 ? max(4, ($wd['hours'] / $maxHours * 85)) : 0;
                            $barY = 110 - $barHeight;
                            $barColor = $wd['hours'] >= 8.0 ? '#059669' : ($wd['hours'] >= 4.0 ? '#0d9488' : ($wd['hours'] > 0 ? '#d97706' : ($wd['isPast'] ? '#e2e8f0' : '#f1f5f9')));
                        @endphp
                        <rect x="{{ $barX }}" y="{{ $barY }}" width="36" height="{{ $barHeight }}" rx="4" fill="{{ $barColor }}"/>
                        <text x="{{ $barX + 18 }}" y="125" text-anchor="middle" font-size="11" fill="#64748b" font-weight="{{ $wd['isToday'] ? '700' : '400' }}">
                            {{ $wd['dayName'] }}
                        </text>
                        <text x="{{ $barX + 18 }}" y="{{ max(14, $barY - 5) }}" text-anchor="middle" font-size="10" font-weight="600" fill="#0f172a">
                            {{ $wd['hours'] > 0 ? $wd['hours'] . 'h' : '—' }}
                        </text>
                    @endforeach
                </svg>
            </div>

            <!-- Breakdown list -->
            <div class="grid grid-cols-5 gap-2 mt-4 pt-4 border-t border-teal-50 text-center text-xs">
                @foreach($weekDays as $wd)
                    <div class="rounded-lg p-2 {{ $wd['isToday'] ? 'bg-teal-50 border border-teal-200' : 'bg-[#f8f6ee]' }}">
                        <div class="font-semibold text-teal-950">{{ $wd['dayName'] }}</div>
                        <div class="text-[11px] text-stone-500">{{ $wd['dayNumber'] }}</div>
                        <div class="mt-1 font-medium {{ $wd['hours'] >= 8 ? 'text-emerald-700' : 'text-stone-700' }}">
                            {{ $wd['hours'] > 0 ? $wd['hours'] . 'h' : ($wd['isPast'] ? 'Absent' : 'Pending') }}
                        </div>
                    </div>
                @endforeach
            </div>
        </div>

        <!-- Today's Action Center (1 column) -->
        <div class="flex flex-col gap-4">
            <!-- Today's Plan & Report Card -->
            <div class="rounded-xl border border-teal-100 bg-[#fffdf5] p-5 shadow-sm flex-1">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="font-semibold text-teal-950">Today's Daily Workflow</h3>
                    <span class="text-xs font-medium text-stone-500">{{ now()->format('d M Y') }}</span>
                </div>

                <!-- Daily Plan Section -->
                <div class="rounded-lg border border-teal-100 bg-[#f8f6ee] p-3 mb-3">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-xs font-semibold text-teal-900 uppercase tracking-wide">Daily Plan</span>
                        @if($todayPlan)
                            <span class="badge bg-emerald-100 text-emerald-800 text-[10px]">Planned ✓</span>
                        @else
                            <span class="badge bg-amber-100 text-amber-800 text-[10px]">Required Morning</span>
                        @endif
                    </div>
                    @if($todayPlan)
                        <p class="text-sm font-medium text-teal-950 line-clamp-1">{{ $todayPlan->title }}</p>
                        @if($todayPlan->description)
                            <p class="text-xs text-stone-600 line-clamp-2 mt-0.5">{{ $todayPlan->description }}</p>
                        @endif
                    @else
                        <p class="text-xs text-stone-500 mb-2">Set your daily goals before starting work today.</p>
                        <a href="{{ route('plans.create', ['plan_date' => now()->toDateString()]) }}"
                           class="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:text-teal-950">
                            + Write today's plan &rarr;
                        </a>
                    @endif
                </div>

                <!-- Daily Report Section -->
                <div class="rounded-lg border border-teal-100 bg-[#f8f6ee] p-3">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-xs font-semibold text-teal-900 uppercase tracking-wide">Daily Report</span>
                        @if($todayReport)
                            <span class="badge bg-emerald-100 text-emerald-800 text-[10px]">{{ $todayReport->percentage }}% Complete</span>
                        @else
                            <span class="badge bg-stone-100 text-stone-700 text-[10px]">Due End of Day</span>
                        @endif
                    </div>
                    @if($todayReport)
                        <p class="text-xs text-stone-700 line-clamp-2">{{ $todayReport->description }}</p>
                        <div class="mt-1 flex items-center justify-between text-[11px] text-stone-500">
                            <span>Status: {{ str_replace('_', ' ', $todayReport->status) }}</span>
                            @if($todayReport->start_time || $todayReport->end_time)
                                <span>{{ $todayReport->start_time }} - {{ $todayReport->end_time }}</span>
                            @endif
                        </div>
                    @else
                        <p class="text-xs text-stone-500 mb-2">Submit your accomplishments before punching out.</p>
                        <a href="{{ route('reports.create', ['report_date' => now()->toDateString(), 'plan_id' => $todayPlan?->id]) }}"
                           class="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:text-teal-950">
                            + Submit today's report &rarr;
                        </a>
                    @endif
                </div>
            </div>

            <!-- Weekly Schedule Widget (Monday Plan · Friday Report) -->
            <div class="rounded-xl border border-teal-100 bg-[#fffdf5] p-5 shadow-sm">
                <h3 class="font-semibold text-teal-950 text-sm mb-2">Weekly Rhythm</h3>
                <div class="space-y-2 text-xs">
                    <div class="flex items-center justify-between p-2 rounded-lg bg-[#f8f6ee]">
                        <div>
                            <span class="font-semibold text-teal-900">Monday Weekly Plan</span>
                            <div class="text-[11px] text-stone-500">Set every Monday kickoff</div>
                        </div>
                        @if($weeklyPlan)
                            <span class="badge bg-emerald-100 text-emerald-800">Set ✓</span>
                        @else
                            <a href="{{ route('plans.create') }}" class="text-teal-900 font-semibold underline">Set &rarr;</a>
                        @endif
                    </div>

                    <div class="flex items-center justify-between p-2 rounded-lg bg-[#f8f6ee]">
                        <div>
                            <span class="font-semibold text-teal-900">Friday Weekly Report</span>
                            <div class="text-[11px] text-stone-500">Submit every Friday wrap-up</div>
                        </div>
                        @if($weeklyReport)
                            <span class="badge bg-emerald-100 text-emerald-800">Done ✓</span>
                        @else
                            <a href="{{ route('reports.create') }}" class="text-teal-900 font-semibold underline">Submit &rarr;</a>
                        @endif
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Previous Plans for Employee ("they should be able to see previous plans") -->
    <div class="mb-8 rounded-xl border border-teal-100 bg-[#fffdf5] p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <div>
                <h2 class="text-base font-semibold text-teal-950">Previous Plans &amp; Reports History</h2>
                <p class="text-xs text-stone-500">Review your past commitments, accomplishments, and progress</p>
            </div>
            <a href="{{ route('plans.index') }}" class="text-xs font-semibold text-teal-900 hover:underline">
                View all plans &rarr;
            </a>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="bg-[#f8f6ee] text-stone-500 text-left text-xs uppercase tracking-wider">
                    <tr>
                        <th class="px-4 py-2.5 rounded-l-lg">Plan Date</th>
                        <th class="px-4 py-2.5">Title</th>
                        <th class="px-4 py-2.5">Status</th>
                        <th class="px-4 py-2.5">Linked Report &amp; Progress</th>
                        <th class="px-4 py-2.5 rounded-r-lg text-right">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-teal-50">
                    @forelse ($previousPlans as $p)
                        <tr class="hover:bg-teal-50/30 transition-colors">
                            <td class="px-4 py-3 font-medium text-stone-700 whitespace-nowrap">
                                {{ $p->plan_date->format('d M Y') }}
                                <div class="text-[11px] text-stone-400">{{ $p->plan_date->format('l') }}</div>
                            </td>
                            <td class="px-4 py-3">
                                <div class="font-medium text-teal-950">{{ $p->title }}</div>
                                @if($p->description)
                                    <div class="text-xs text-stone-500 line-clamp-1">{{ $p->description }}</div>
                                @endif
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap">
                                <span class="badge {{ $p->status === 'completed' ? 'bg-emerald-100 text-emerald-800' : ($p->status === 'missed' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800') }}">
                                    {{ str_replace('_', ' ', $p->status) }}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-xs">
                                @if($p->latestReport)
                                    <div class="font-medium text-stone-800">{{ $p->latestReport->description }}</div>
                                    <div class="flex items-center gap-2 mt-0.5 text-stone-500">
                                        <span class="font-semibold text-teal-900">{{ $p->latestReport->percentage }}% completed</span>
                                        <span>&bull;</span>
                                        <span>{{ str_replace('_', ' ', $p->latestReport->status) }}</span>
                                    </div>
                                @else
                                    <span class="text-stone-400 italic">No report submitted</span>
                                @endif
                            </td>
                            <td class="px-4 py-3 text-right whitespace-nowrap">
                                @if(!$p->latestReport)
                                    <a href="{{ route('reports.create', ['plan_id' => $p->id, 'report_date' => $p->plan_date->toDateString()]) }}"
                                       class="inline-flex items-center rounded-md bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-900 hover:bg-teal-200">
                                        Add report
                                    </a>
                                @else
                                    <span class="text-xs text-stone-400">Reported ✓</span>
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="5" class="px-4 py-6 text-center text-sm text-stone-400">
                                No past plans recorded yet. Your daily and weekly plans will be archived here for easy reference.
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <!-- Recent Attendance Log (Last 7 Days) -->
    <div class="rounded-xl border border-teal-100 bg-[#fffdf5] p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <div>
                <h2 class="text-base font-semibold text-teal-950">Recent Attendance (Last 7 Days)</h2>
                <p class="text-xs text-stone-500">Punch records and calculated shift hours</p>
            </div>
            @if(!auth()->user()->isManager())
                <a href="{{ route('punch.index') }}" class="text-xs font-semibold text-teal-900 hover:underline">
                    Manage punches &rarr;
                </a>
            @endif
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="bg-[#f8f6ee] text-stone-500 text-left text-xs uppercase tracking-wider">
                    <tr>
                        <th class="px-4 py-2.5 rounded-l-lg">Date</th>
                        <th class="px-4 py-2.5">Punch In</th>
                        <th class="px-4 py-2.5">Punch Out</th>
                        <th class="px-4 py-2.5">Total Hours</th>
                        <th class="px-4 py-2.5 rounded-r-lg">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-teal-50">
                    @forelse ($recentAttendances as $row)
                        <tr class="hover:bg-teal-50/30 transition-colors">
                            <td class="px-4 py-3 font-medium text-stone-800">
                                {{ $row->date->format('D, d M Y') }}
                            </td>
                            <td class="px-4 py-3 font-mono text-xs">{{ $row->punch_in?->format('H:i') ?? '—' }}</td>
                            <td class="px-4 py-3 font-mono text-xs">{{ $row->punch_out?->format('H:i') ?? '—' }}</td>
                            <td class="px-4 py-3 font-semibold text-teal-950">{{ $row->total_hours ? $row->total_hours . ' hrs' : '—' }}</td>
                            <td class="px-4 py-3">
                                <span class="badge {{ $row->status === 'present' ? 'bg-emerald-100 text-emerald-800' : ($row->status === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800') }}">
                                    {{ str_replace('_', ' ', $row->status) }}
                                </span>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="5" class="px-4 py-6 text-center text-sm text-stone-400">
                                No attendance records logged yet.
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <!-- Log Out Dialog Modal -->
    <dialog id="logout-modal" class="rounded-xl p-0 max-w-sm w-full backdrop:bg-teal-950/50 shadow-2xl">
        <div class="px-6 py-5">
            <h2 class="text-lg font-semibold text-teal-950">Log out</h2>
            <p class="mt-2 text-sm text-stone-600">Are you sure you want to end your session?</p>
        </div>
        <div class="px-6 py-4 bg-[#f8f6ee] flex justify-end gap-3 rounded-b-xl border-t border-teal-100">
            <button type="button" onclick="document.getElementById('logout-modal').close()"
                    class="rounded-lg border border-teal-200 bg-white px-4 py-2 text-xs font-semibold text-teal-900 shadow-sm hover:bg-teal-50">
                Cancel
            </button>
            <form method="POST" action="{{ route('logout') }}">
                @csrf
                <button type="submit"
                        class="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500">
                    Log out
                </button>
            </form>
        </div>
    </dialog>
@endsection

@push('scripts')
    <script>
        // Refresh dashboard data while it is open so attendance and workflow
        // changes from other sessions appear without a manual reload.
        window.setInterval(() => {
            if (document.visibilityState === 'visible' && !document.querySelector('dialog[open]')) {
                window.location.reload();
            }
        }, 30000);
    </script>
@endpush
