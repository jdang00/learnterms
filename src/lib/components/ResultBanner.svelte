<script lang="ts">
	import { scale, fade } from 'svelte/transition';
	import { backOut } from 'svelte/easing';

	type BannerState = { checkResult: string };
	let { qs = $bindable<BannerState>(), durationMs = 1800 } = $props();

	let visible = $state(false);
	let timer: number | null = null;
	let rafId: number | null = null;

	$effect(() => {
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}

		const result = qs?.checkResult;
		if (!result || result.trim() === '') {
			visible = false;
			return () => {};
		}

		visible = false;
		rafId = requestAnimationFrame(() => {
			visible = true;
			timer = window.setTimeout(() => (visible = false), durationMs);
		});

		return () => {
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}
		};
	});
</script>

{#if visible && qs?.checkResult}
	<div
		class="fixed inset-x-0 top-20 md:top-16 z-[70] flex justify-center px-3 touch-pan-y pointer-events-none"
		in:scale={{ start: 0.9, duration: 180, easing: backOut }}
		out:fade={{ duration: 240 }}
	>
		<div
			class="alert rounded-full shadow-lg px-4 sm:px-6 py-2.5 sm:py-3 max-w-[92vw]
                {qs.checkResult === 'Correct!' ? 'alert-success' : 'alert-error'}"
		>
			<span class="font-extrabold text-base sm:text-lg">{qs.checkResult}</span>
		</div>
	</div>
{/if}
