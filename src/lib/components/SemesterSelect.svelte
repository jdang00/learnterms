<script lang="ts">
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import { SelectField } from '#lib/components/ui/select/index.js';

	// The one semester picker for the whole app. Values are semester names unless `by="id"`.
	let {
		semesters,
		value = $bindable(''),
		by = 'name',
		allLabel,
		size = 'sm',
		class: className = 'w-44',
		id,
		'aria-label': ariaLabel = 'Semester',
		onValueChange
	}: {
		semesters: { _id: string; name: string }[] | undefined | null;
		value?: string;
		by?: 'name' | 'id';
		/** Adds an "All semesters"-style option with an empty value. */
		allLabel?: string;
		size?: 'sm' | 'default';
		class?: string;
		id?: string;
		'aria-label'?: string;
		onValueChange?: (value: string) => void;
	} = $props();

	const options = $derived([
		...(allLabel ? [{ value: '', label: allLabel }] : []),
		...(semesters ?? []).map((s) => ({ value: by === 'id' ? s._id : s.name, label: s.name }))
	]);
</script>

<SelectField
	bind:value
	{options}
	{size}
	{id}
	class={className}
	aria-label={ariaLabel}
	placeholder="Semester"
	{onValueChange}
>
	{#snippet icon()}<CalendarDays class="size-4 text-muted-foreground" />{/snippet}
</SelectField>
