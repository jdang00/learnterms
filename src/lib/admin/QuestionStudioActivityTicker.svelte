<script lang="ts">
	import { ChevronDown, ChevronUp } from 'lucide-svelte';
	import { formatDuration } from './questionStudioRun';
	import type { JobEvent } from './questionStudioRun';

	let {
		events = [],
		running = false,
		expanded = $bindable(false)
	}: { events?: JobEvent[]; running?: boolean; expanded?: boolean } = $props();

	const rows = $derived(
		events.map((event, index) => ({
			...event,
			key: `${event.at}:${index}`,
			gapMs: index > 0 ? event.at - events[index - 1].at : 0
		}))
	);
	const latest = $derived(rows.slice(-2));
	const clock = new Intl.DateTimeFormat(undefined, {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
</script>

<div class="shrink-0 rounded-2xl border border-base-300 bg-base-100 shadow-xs">
	<button
		type="button"
		class="flex w-full items-center gap-3 px-3 py-2 text-left"
		aria-expanded={expanded}
		onclick={() => (expanded = !expanded)}
	>
		<span class="shrink-0 text-[11px] text-base-content/50">Activity</span>
		<div class="min-w-0 flex-1 space-y-0.5">
			{#each latest as event (event.key)}
				<p class="truncate text-xs text-base-content/60">
					<span class="tabular-nums text-base-content/35">{clock.format(event.at)}</span>
					<span class="ml-1.5 font-medium text-base-content/80">{event.label}</span>
					{#if event.detail}<span class="ml-1.5">{event.detail}</span>{/if}
				</p>
			{:else}
				<p class="text-xs text-base-content/40">
					{running ? 'Waiting for the first step…' : 'No activity recorded.'}
				</p>
			{/each}
		</div>
		<span class="flex shrink-0 items-center gap-1 text-[11px] text-base-content/45">
			{events.length} steps
			{#if expanded}<ChevronDown size={13} />{:else}<ChevronUp size={13} />{/if}
		</span>
	</button>

	{#if expanded}
		<ul class="max-h-56 overflow-y-auto border-t border-base-300 px-3 py-2 text-xs">
			{#each rows as event (event.key)}
				<li class="flex gap-2 py-1">
					<span class="w-16 shrink-0 tabular-nums text-base-content/35">
						{clock.format(event.at)}
					</span>
					<span class="w-10 shrink-0 text-right tabular-nums text-base-content/30">
						{event.gapMs > 1000 ? `+${formatDuration(event.gapMs)}` : ''}
					</span>
					<span class="min-w-0 flex-1">
						<span class="font-medium">{event.label}</span>
						{#if event.detail}
							<span class="text-base-content/55"> — {event.detail}</span>
						{/if}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
