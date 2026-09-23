<script lang="ts">
	import { Minus, Plus } from 'lucide-svelte';

	interface Props {
		value: number;
		max: number;
		min?: number;
		disabled?: boolean;
		size?: 'lg' | 'sm';
		ariaLabel: string;
		onChange: (value: number) => void;
	}

	let { value, max, min = 0, disabled = false, size = 'sm', ariaLabel, onChange }: Props = $props();

	// While focused the input holds a free-typed buffer so a half-finished number is never
	// clamped mid-keystroke; otherwise it mirrors the committed value.
	let draft = $state('');
	let focused = $state(false);
	const display = $derived(focused ? draft : String(value));

	function commit() {
		const parsed = Number.parseInt(draft, 10);
		const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : value;
		if (next !== value) onChange(next);
	}

	const isLarge = $derived(size === 'lg');
</script>

<div class="flex items-center {isLarge ? 'gap-1.5' : 'gap-1'}">
	<button
		type="button"
		class="btn btn-ghost rounded-full p-0 {isLarge ? 'btn-sm h-10 w-10' : 'btn-xs h-7 w-7'}"
		aria-label="Fewer {ariaLabel}"
		disabled={disabled || value <= min}
		onclick={() => onChange(Math.max(min, value - 1))}
	>
		<Minus size={isLarge ? 16 : 13} />
	</button>

	<input
		type="text"
		inputmode="numeric"
		autocomplete="off"
		class="input input-bordered rounded-xl px-1 text-center tabular-nums {isLarge
			? 'h-11 w-[4.5rem] text-2xl font-semibold'
			: 'h-8 w-12 text-sm font-semibold'}"
		aria-label="Number of {ariaLabel}"
		{disabled}
		value={display}
		oninput={(event) => (draft = event.currentTarget.value)}
		onfocus={(event) => {
			draft = String(value);
			focused = true;
			event.currentTarget.select();
		}}
		onblur={() => {
			commit();
			focused = false;
		}}
		onkeydown={(event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				event.currentTarget.blur();
			}
		}}
	/>

	<button
		type="button"
		class="btn btn-ghost rounded-full p-0 {isLarge ? 'btn-sm h-10 w-10' : 'btn-xs h-7 w-7'}"
		aria-label="More {ariaLabel}"
		disabled={disabled || value >= max}
		onclick={() => onChange(Math.min(max, value + 1))}
	>
		<Plus size={isLarge ? 16 : 13} />
	</button>
</div>
