<x-guest-layout>
    <div class="mb-8">
        <p class="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Welcome back</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-tight text-teal-950">Sign in to your account</h1>
        <p class="mt-2 text-sm leading-6 text-stone-600">Enter your work email and password to continue.</p>
    </div>

    <x-auth-session-status class="mb-5 rounded-lg bg-teal-50 px-4 py-3 text-sm text-teal-800" :status="session('status')" />

    <form method="POST" action="{{ route('login') }}" class="space-y-5">
        @csrf
        <div>
            <label for="email" class="mb-2 block text-sm font-medium text-teal-950">Work email</label>
            <input id="email" name="email" type="email" value="{{ old('email') }}" required autofocus autocomplete="username" placeholder="you@company.com"
                   class="block w-full rounded-xl border border-teal-200 bg-[#fffdf5] px-4 py-3 text-sm text-teal-950 shadow-sm placeholder:text-stone-400 focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-100">
            <x-input-error :messages="$errors->get('email')" class="mt-2" />
        </div>

        <div>
            <div class="mb-2 flex items-center justify-between gap-3">
                <label for="password" class="block text-sm font-medium text-teal-950">Password</label>
                @if (Route::has('password.request'))
                    <a class="text-sm font-medium text-teal-700 hover:text-teal-900" href="{{ route('password.request') }}">Forgot password?</a>
                @endif
            </div>
            <input id="password" name="password" type="password" required autocomplete="current-password" placeholder="Enter your password"
                   class="block w-full rounded-xl border border-teal-200 bg-[#fffdf5] px-4 py-3 text-sm text-teal-950 shadow-sm placeholder:text-stone-400 focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-100">
            <x-input-error :messages="$errors->get('password')" class="mt-2" />
        </div>

        <label for="remember_me" class="flex items-center gap-2.5 text-sm text-stone-600">
            <input id="remember_me" type="checkbox" name="remember" class="h-4 w-4 rounded border-teal-300 text-teal-700 focus:ring-teal-500">
            Remember me
        </label>

        <button type="submit" class="flex w-full items-center justify-center rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-900 focus:outline-none focus:ring-4 focus:ring-teal-200">
            Sign in
            <svg class="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.69L10.22 5.03a.75.75 0 1 1 1.06-1.06l5.5 5.5a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 1 1-1.06-1.06l4.22-4.22H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd" /></svg>
        </button>
    </form>
</x-guest-layout>
