@extends('layouts.app')
@section('title', 'Dashboard')

@section('content')
    <h1 class="text-2xl font-semibold mb-6">This month's overview</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="bg-white rounded-lg border border-slate-200 p-5">
            <p class="text-sm text-slate-500 mb-1">Attendance rate</p>
            <p class="text-3xl font-semibold">{{ $stats['attendance'] }}%</p>
        </div>
        <div class="bg-white rounded-lg border border-slate-200 p-5">
            <p class="text-sm text-slate-500 mb-1">Plan completion</p>
            <p class="text-3xl font-semibold">{{ $stats['planCompletion'] }}%</p>
        </div>
        <div class="bg-white rounded-lg border border-slate-200 p-5">
            <p class="text-sm text-slate-500 mb-1">On-time punch-in rate</p>
            <p class="text-3xl font-semibold">{{ $stats['onTime'] }}%</p>
        </div>
    </div>

    <div class="mt-8">
        <button type="button" onclick="document.getElementById('logout-modal').showModal()"
                class="inline-flex items-center px-4 py-2 bg-gray-800 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-gray-700 focus:bg-gray-700 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150">
            Log out
        </button>
    </div>

    <dialog id="logout-modal" class="rounded-lg p-0 max-w-sm w-full backdrop:bg-slate-900/50">
        <div class="px-6 py-5">
            <h2 class="text-lg font-semibold text-slate-900">Log out</h2>
            <p class="mt-2 text-sm text-slate-600">Are you sure you want to log out?</p>
        </div>
        <div class="px-6 py-4 bg-slate-50 flex justify-end gap-3 rounded-b-lg">
            <button type="button" onclick="document.getElementById('logout-modal').close()"
                    class="inline-flex items-center px-4 py-2 bg-white border border-slate-300 rounded-md font-semibold text-xs text-slate-700 uppercase tracking-widest hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150">
                Cancel
            </button>
            <form method="POST" action="{{ route('logout') }}">
                @csrf
                <button type="submit"
                        class="inline-flex items-center px-4 py-2 bg-rose-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-rose-500 focus:bg-rose-500 active:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition ease-in-out duration-150">
                    Log out
                </button>
            </form>
        </div>
    </dialog>
@endsection
