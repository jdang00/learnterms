<script lang="ts">
	import { relativeTime } from './utils';
	import LiveDot from './viz/LiveDot.svelte';
	import { LIVE_MS } from './viz';

	let {
		connected,
		everConnected,
		lastAnswerAt,
		now
	}: { connected: boolean; everConnected: boolean; lastAnswerAt: number | null; now: number } =
		$props();
	const reconnecting = $derived(!connected && everConnected);
	const busy = $derived(!!lastAnswerAt && now - lastAnswerAt <= LIVE_MS);
</script>

<span
	class="inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs {reconnecting
		? 'bg-warning/15 text-warning-ink'
		: 'bg-muted text-muted-foreground'}"
	role="status"
>
	{#if reconnecting}
		<span class="size-2 rounded-full bg-warning"></span>Reconnecting
	{:else}
		<LiveDot active={busy} />
		<span class="font-medium text-foreground">Live</span>
		{#if lastAnswerAt}<span class="hidden sm:inline"
				>Last answer {relativeTime(lastAnswerAt, now).toLowerCase()}</span
			>{/if}
	{/if}
</span>
