@props(['disabled' => false])

<input @disabled($disabled) {{ $attributes->merge(['class' => 'border-teal-200 focus:border-teal-500 focus:ring-teal-500 rounded-md shadow-sm']) }}>
