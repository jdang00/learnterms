<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Copy from '@lucide/svelte/icons/copy';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { Button } from '$lib/components/ui/button';

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
		class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10 text-warning-ink"
	>
		<TriangleAlert size={24} />
	</div>
	<p class="text-sm font-semibold">{title}</p>
	{#if description}
		<p class="mt-1.5 max-w-sm text-xs leading-relaxed text-foreground/55">{description}</p>
	{/if}

	{#if onRetry}
		<Button size="sm" class="mt-4 gap-1.5" onclick={onRetry}>
			<RotateCcw size={13} />
			{retryLabel}
		</Button>
	{/if}

	{#if errorText}
		<div class="mt-5 w-full max-w-md text-left">
			<button
				type="button"
				class="flex w-full items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted/60"
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
					<Button
						variant="ghost"
						tone="neutral"
						size="xs"
						class="absolute right-1.5 top-1.5 z-10 gap-1"
						onclick={copyLog}
					>
						{#if copied}
							<Check size={12} />
							Copied
						{:else}
							<Copy size={12} />
							Copy
						{/if}
					</Button>
					<pre
						class="max-h-48 overflow-auto whitespace-pre-wrap break-words surface-inset p-3 pr-16 text-left font-mono text-[11px] leading-relaxed text-foreground/70">{errorText}</pre>
				</div>
			{/if}
		</div>
	{/if}
</div>
