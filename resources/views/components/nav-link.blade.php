@props(['active'])

@php
$classes = ($active ?? false)
            ? 'inline-flex items-center px-1 pt-1 border-b-2 border-teal-400 text-sm font-medium leading-5 text-teal-950 focus:outline-none focus:border-teal-700 transition duration-150 ease-in-out'
            : 'inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium leading-5 text-stone-500 hover:text-teal-800 hover:border-teal-200 focus:outline-none focus:text-teal-800 focus:border-teal-200 transition duration-150 ease-in-out';
@endphp

<a {{ $attributes->merge(['class' => $classes]) }}>
    {{ $slot }}
</a>
