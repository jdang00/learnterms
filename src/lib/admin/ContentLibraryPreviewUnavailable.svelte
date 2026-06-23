<script lang="ts">
	import { Check, ChevronRight, Copy, RotateCcw, TriangleAlert } from 'lucide-svelte';

	interface Props {
		title: string;
		description?: string;
		errorText?: string;
		retryLabel?: string;
		onRetry?: () => void;
	}

	let {
		title,
		description = '',
		errorText = '',
		retryLabel = 'Try again',
		onRetry
	}: Props = $props();

	let showLog = $state(false);
	let copied = $state(false);

	async function copyLog() {
		try {
			await navigator.clipboard.writeText(errorText);
			copied = true;
			setTimeout(() => (copied = false), 1200);
		} catch {
			// clipboard unavailable — no-op
		}
	}
</script>

<div class="flex h-full min-h-72 flex-col items-center justify-center p-8 text-center">
	<div
		class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10 text-warning"
	>
		<TriangleAlert size={24} />
	</div>
	<p class="text-sm font-semibold">{title}</p>
	{#if description}
		<p class="mt-1.5 max-w-sm text-xs leading-relaxed text-base-content/55">{description}</p>
	{/if}

	{#if onRetry}
		<button class="btn btn-primary btn-sm mt-4 gap-1.5 rounded-full" onclick={onRetry}>
			<RotateCcw size={13} />
			{retryLabel}
		</button>
	{/if}

	{#if errorText}
		<div class="mt-5 w-full max-w-md text-left">
			<button
				type="button"
				class="flex w-full items-center gap-1.5 rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-xs font-medium text-base-content/60 transition-colors hover:bg-base-200/60"
				aria-expanded={showLog}
				onclick={() => (showLog = !showLog)}
			>
				<ChevronRight
					size={13}
					class="shrink-0 transition-transform duration-200 {showLog ? 'rotate-90' : ''}"
				/>
				Advanced error log
			</button>
			{#if showLog}
				<div class="relative mt-2">
					<button
						type="button"
						class="btn btn-ghost btn-xs absolute right-1.5 top-1.5 z-10 gap-1 rounded-full"
						onclick={copyLog}
					>
						{#if copied}
							<Check size={12} />
							Copied
						{:else}
							<Copy size={12} />
							Copy
						{/if}
					</button>
					<pre
						class="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-base-300 bg-base-200/50 p-3 pr-16 text-left font-mono text-[11px] leading-relaxed text-base-content/70">{errorText}</pre>
				</div>
			{/if}
		</div>
	{/if}
</div>
