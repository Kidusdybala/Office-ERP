@props(['value'])

<label {{ $attributes->merge(['class' => 'block font-medium text-sm text-teal-800']) }}>
    {{ $value ?? $slot }}
</label>
