<script lang="ts">
	let {
		options,
		value,
		onSelect
	}: {
		options: { value: string; label: string }[];
		value: string;
		onSelect: (value: string) => void;
	} = $props();
</script>

<div class="flex flex-wrap gap-1.5" role="group" aria-label="Semester">
	{#each options as option (option.value)}
		<button
			type="button"
			aria-pressed={value === option.value}
			class="btn btn-xs rounded-full px-3 {value === option.value
				? 'btn-primary'
				: 'btn-ghost text-base-content'}"
			onclick={() => onSelect(option.value)}>{option.label}</button
		>
	{/each}
</div>
