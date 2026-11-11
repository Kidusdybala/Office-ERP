<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ config('app.name', 'Laravel') }}</title>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600,700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-[#f8f6ee] font-sans text-teal-950 antialiased">
    <main class="grid min-h-screen lg:grid-cols-2">
        <section class="relative hidden overflow-hidden bg-teal-900 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
            <div class="absolute -right-28 -top-28 h-96 w-96 rounded-full border border-teal-700/70"></div>
            <div class="absolute -bottom-40 -left-24 h-[30rem] w-[30rem] rounded-full border border-teal-700/70"></div>
            <a href="/" class="relative z-10 inline-flex items-center gap-3 text-lg font-semibold tracking-tight">
                <img src="{{ asset('images/logo-circle.png') }}" alt="IRack IT Solution Logo" class="h-10 w-10 rounded-full object-cover shadow">
                IRack IT Solution
            </a>
            <div class="relative z-10 max-w-lg pb-16">
                <p class="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-teal-300">People. Plans. Progress.</p>
                <h1 class="text-4xl font-semibold leading-tight xl:text-5xl">A clearer view of your team’s day.</h1>
                <p class="mt-5 max-w-md text-base leading-7 text-teal-100/80">Manage attendance, daily plans, and reports from one calm, focused workspace.</p>
            </div>
            <p class="relative z-10 text-sm text-teal-200/70">Team operations, made simple.</p>
        </section>

        <section class="flex min-h-screen flex-col px-5 py-7 sm:px-10 lg:px-14 xl:px-24">
            <a href="/" class="inline-flex items-center gap-3 text-base font-semibold tracking-tight text-teal-900 lg:hidden">
                <img src="{{ asset('images/logo-circle.png') }}" alt="IRack IT Solution Logo" class="h-9 w-9 rounded-full object-cover">
                IRack IT Solution
            </a>
            <div class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
                {{ $slot }}
            </div>
        </section>
    </main>
</body>
</html>
