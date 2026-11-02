<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	// A count that eases to new values and glows green for a moment when it goes up.
	let { value, class: className = '' }: { value: number; class?: string } = $props();

	const tween = new Tween(0, { duration: 600, easing: cubicOut });
	let bumped = $state(0);
	let previous: number | null = null;
	$effect(() => {
		if (previous !== null && value > previous) bumped++;
		previous = value;
		tween.target = value;
	});
</script>

{#key bumped}
	<span
		class="inline-block tabular-nums {bumped ? 'motion-safe:animate-live-count' : ''} {className}"
		>{Math.round(tween.current)}</span
	>
{/key}
