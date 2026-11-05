<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Team Control') · ERP</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; }
        .badge { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium; }
    </style>
</head>
<body class="bg-slate-50 text-slate-900">
    <div class="flex min-h-screen">
        <aside class="w-56 bg-slate-900 text-slate-200 flex flex-col">
            <div class="px-5 py-5 text-lg font-semibold text-white border-b border-slate-800">Team Control</div>
            <nav class="flex-1 px-3 py-4 space-y-1 text-sm">
                <a href="{{ route('dashboard') }}" class="block px-3 py-2 rounded-md hover:bg-slate-800 {{ request()->routeIs('dashboard') ? 'bg-slate-800 text-white' : '' }}">Dashboard</a>
                @if (!auth()->user()->isManager())
                    <a href="{{ route('punch.index') }}" class="block px-3 py-2 rounded-md hover:bg-slate-800 {{ request()->routeIs('punch.*') ? 'bg-slate-800 text-white' : '' }}">Punch In/Out</a>
                @endif
                <a href="{{ route('plans.index') }}" class="block px-3 py-2 rounded-md hover:bg-slate-800 {{ request()->routeIs('plans.*') ? 'bg-slate-800 text-white' : '' }}">Plans</a>
                <a href="{{ route('reports.index') }}" class="block px-3 py-2 rounded-md hover:bg-slate-800 {{ request()->routeIs('reports.*') ? 'bg-slate-800 text-white' : '' }}">Reports</a>
            </nav>
            <div class="px-5 py-4 border-t border-slate-800 text-xs text-slate-400">
                {{ auth()->user()->name ?? 'Guest' }}<br>
                {{ ucfirst(auth()->user()->role ?? '') }}
            </div>
        </aside>

        <main class="flex-1 p-8">
            @if (session('success'))
                <div class="mb-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm">
                    {{ session('success') }}
                </div>
            @endif
            @if (session('error'))
                <div class="mb-4 rounded-md bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 text-sm">
                    {{ session('error') }}
                </div>
            @endif

            @yield('content')
        </main>
    </div>
</body>
</html>
