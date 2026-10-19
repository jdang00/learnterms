<script lang="ts">
	import { scale, fade } from 'svelte/transition';
	import { backOut } from 'svelte/easing';

	type BannerState = { checkResult: string; checkCount?: number };
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
		void qs?.checkCount;
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
		class="fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+4rem)] z-[70] flex justify-center px-3 touch-pan-y pointer-events-none"
		in:scale={{ start: 0.9, duration: 180, easing: backOut }}
		out:fade={{ duration: 240 }}
	>
		<div
			role="alert"
			class="max-w-[92vw] rounded-full px-4 py-2.5 shadow-lg sm:px-6 sm:py-3 {qs.checkResult ===
			'Correct!'
				? 'bg-success text-success-foreground'
				: 'bg-error text-error-foreground'}"
		>
			<span class="font-extrabold text-base sm:text-lg">{qs.checkResult}</span>
		</div>
	</div>
{/if}
