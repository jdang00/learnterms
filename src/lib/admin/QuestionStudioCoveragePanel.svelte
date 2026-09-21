<script lang="ts">
	import { ChevronDown, ChevronUp } from 'lucide-svelte';
	import type { AgentJob, CoverageRow } from './questionStudioRun';

	let {
		rows = [],
		job = null,
		topReject = null,
		open = $bindable(true)
	}: {
		rows?: CoverageRow[];
		job?: AgentJob | null;
		topReject?: { reason: string; count: number } | null;
		open?: boolean;
	} = $props();

	const covered = $derived(rows.filter((row) => row.kept > 0).length);
	const gaps = $derived(rows.filter((row) => row.kept === 0));
	const notes = $derived([...(job?.plan?.riskNotes ?? []), ...(job?.plan?.coverageNotes ?? [])]);
</script>

<div class="shrink-0 rounded-2xl border border-base-300 bg-base-100 shadow-xs">
	<button
		type="button"
		class="flex w-full items-center gap-2 px-3 py-2 text-left"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		<span class="text-sm font-semibold">Coverage</span>
		<span class="text-xs text-base-content/50">
			{covered} of {rows.length} topics
		</span>
		{#if gaps.length > 0}
			<span class="rounded-full bg-warning px-2 py-px text-[11px] font-medium text-warning-content">
				{gaps.length} with nothing
			</span>
		{/if}
		<span class="ml-auto text-base-content/40">
			{#if open}<ChevronUp size={14} />{:else}<ChevronDown size={14} />{/if}
		</span>
	</button>

	{#if open}
		<div class="max-h-52 overflow-y-auto border-t border-base-300 px-3 py-2">
			<ul class="space-y-1">
				{#each rows as row (row.topicId)}
					<li class="flex items-center gap-2 text-xs">
						<span class="min-w-0 flex-1 truncate {row.kept === 0 ? 'text-warning' : ''}">
							{row.topicTitle}
						</span>
						<span class="shrink-0 tabular-nums text-base-content/45">
							{row.kept}/{row.planned || row.drafted}
						</span>
						<span class="flex w-16 shrink-0 gap-px" aria-hidden="true">
							{#each Array.from({ length: Math.max(row.planned, row.drafted, 1) }, (_, i) => i) as slot (slot)}
								<span
									class="h-1.5 flex-1 rounded-full {slot < row.kept
										? 'bg-success'
										: slot < row.drafted
											? 'bg-warning'
											: 'bg-base-300'}"
								></span>
							{/each}
						</span>
					</li>
				{:else}
					<li class="py-3 text-center text-xs text-base-content/40">
						Coverage appears once the agent has planned the set.
					</li>
				{/each}
			</ul>

			{#if topReject}
				<p class="mt-2 border-t border-base-300 pt-2 text-xs leading-relaxed text-base-content/55">
					<span class="font-medium">Most common cut ({topReject.count}):</span>
					{topReject.reason}
				</p>
			{/if}
			{#each notes as note (note)}
				<p class="mt-1.5 text-xs leading-relaxed text-base-content/50">{note}</p>
			{/each}
		</div>
	{/if}
</div>
