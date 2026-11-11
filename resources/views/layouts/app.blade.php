<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Dashboard') · IRack IT Solution</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; }
        .badge { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium; }
    </style>
</head>
<body class="bg-[#f8f6ee] text-teal-950">
    <header class="sticky top-0 z-30 border-b border-teal-100 bg-[#fffdf5] shadow-sm">
        <div class="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <a href="{{ route('dashboard') }}" class="flex items-center gap-3 group">
                <img src="{{ asset('images/logo-circle.png') }}" alt="IRack IT Solution Logo" class="h-9 w-9 rounded-full object-cover shadow-sm group-hover:opacity-90 transition-opacity">
                <div>
                    <span class="block text-base font-bold tracking-tight text-teal-900 leading-tight">IRack IT Solution</span>
                    <span class="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Workforce ERP</span>
                </div>
            </a>
            <nav class="hidden items-center gap-1 md:flex" aria-label="Main navigation">
                <a href="{{ route('dashboard') }}" class="rounded-lg px-3 py-2 text-sm font-medium {{ request()->routeIs('dashboard') ? 'bg-teal-100 text-teal-900' : 'text-stone-600 hover:bg-teal-50 hover:text-teal-900' }}">Dashboard</a>
                @if (!auth()->user()->isManager())
                    <a href="{{ route('punch.index') }}" class="rounded-lg px-3 py-2 text-sm font-medium {{ request()->routeIs('punch.*') ? 'bg-teal-100 text-teal-900' : 'text-stone-600 hover:bg-teal-50 hover:text-teal-900' }}">Punch In/Out</a>
                @endif
                <a href="{{ route('plans.index') }}" class="rounded-lg px-3 py-2 text-sm font-medium {{ request()->routeIs('plans.*') ? 'bg-teal-100 text-teal-900' : 'text-stone-600 hover:bg-teal-50 hover:text-teal-900' }}">Plans &amp; Daily Workflow</a>
            </nav>
            <div class="hidden text-right md:block">
                <div class="text-sm font-medium text-teal-950">{{ auth()->user()->name ?? 'Guest' }}</div>
                <div class="text-xs capitalize text-stone-500">{{ auth()->user()->role ?? '' }}</div>
            </div>
            <button id="mobile-menu-button" type="button" class="inline-flex items-center justify-center rounded-lg p-2 text-teal-900 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 md:hidden" aria-controls="mobile-menu" aria-expanded="false" aria-label="Open navigation menu">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
        </div>
    </header>

    <div id="mobile-menu-backdrop" class="fixed inset-0 z-40 hidden bg-teal-950/40 md:hidden"></div>
    <aside id="mobile-menu" class="fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col bg-teal-900 text-teal-100 shadow-xl transition-transform duration-200 md:hidden" aria-label="Mobile navigation">
        <div class="flex items-center justify-between border-b border-teal-800 px-5 py-4">
            <div class="flex items-center gap-2">
                <img src="{{ asset('images/logo-circle.png') }}" alt="IRack IT Solution" class="h-8 w-8 rounded-full object-cover">
                <span class="text-base font-semibold text-white">IRack IT Solution</span>
            </div>
            <button id="mobile-menu-close" type="button" class="rounded-md p-2 text-teal-100 hover:bg-teal-800" aria-label="Close navigation menu">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        <nav class="flex-1 space-y-1 px-3 py-4 text-sm" aria-label="Main navigation">
            <a href="{{ route('dashboard') }}" class="block rounded-md px-3 py-2 hover:bg-teal-800 {{ request()->routeIs('dashboard') ? 'bg-teal-800 text-white' : '' }}">Dashboard</a>
            @if (!auth()->user()->isManager())
                <a href="{{ route('punch.index') }}" class="block rounded-md px-3 py-2 hover:bg-teal-800 {{ request()->routeIs('punch.*') ? 'bg-teal-800 text-white' : '' }}">Punch In/Out</a>
            @endif
            <a href="{{ route('plans.index') }}" class="block rounded-md px-3 py-2 hover:bg-teal-800 {{ request()->routeIs('plans.*') ? 'bg-teal-800 text-white' : '' }}">Plans &amp; Daily Workflow</a>
        </nav>
        <div class="border-t border-teal-800 px-5 py-4 text-sm">
            <div class="font-medium text-white">{{ auth()->user()->name ?? 'Guest' }}</div>
            <div class="text-xs capitalize text-teal-200">{{ auth()->user()->role ?? '' }}</div>
        </div>
    </aside>

    <main class="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-screen-2xl p-4 sm:p-6 lg:p-8">
        @if (session('success'))
            <div class="mb-4 rounded-md bg-teal-50 border border-teal-200 text-teal-800 px-4 py-3 text-sm">
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
    <script>
        const menu = document.getElementById('mobile-menu');
        const backdrop = document.getElementById('mobile-menu-backdrop');
        const menuButton = document.getElementById('mobile-menu-button');
        const closeButton = document.getElementById('mobile-menu-close');
        const setMenuOpen = (open) => {
            menu.classList.toggle('-translate-x-full', !open);
            backdrop.classList.toggle('hidden', !open);
            menuButton.setAttribute('aria-expanded', String(open));
            document.body.classList.toggle('overflow-hidden', open);
        };
        menuButton.addEventListener('click', () => setMenuOpen(true));
        closeButton.addEventListener('click', () => setMenuOpen(false));
        backdrop.addEventListener('click', () => setMenuOpen(false));
        document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenuOpen(false); });
    </script>
    @stack('scripts')
</body>
</html>
