<script lang="ts">
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	// Green for correct, amber for needs review, both as percentages of the whole module.
	let {
		correct,
		review,
		label,
		size = 'size-12'
	}: { correct: number; review: number; label: number; size?: string } = $props();

	const motion = { duration: () => (prefersReducedMotion.current ? 0 : 600), easing: cubicOut };
	const correctArc = Tween.of(() => correct, motion);
	const filledArc = Tween.of(() => correct + review, motion);
	const background = $derived(
		`conic-gradient(var(--color-success) 0 ${correctArc.current}%, var(--color-warning) 0 ${filledArc.current}%, color-mix(in oklab, var(--color-base-content) 12%, transparent) 0)`
	);
</script>

<span
	class="relative grid {size} place-items-center rounded-full text-[11px] font-semibold tabular-nums"
	style:background
	role="progressbar"
	aria-label="Questions answered"
	aria-valuemin={0}
	aria-valuemax={100}
	aria-valuenow={label}
>
	<span class="absolute inset-[3px] rounded-full bg-base-100"></span>
	<span class="relative">{label}%</span>
</span>
