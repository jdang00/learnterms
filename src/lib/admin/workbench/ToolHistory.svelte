<script lang="ts">
	import { Layers, Trash2 } from 'lucide-svelte';

	import ShimmerText from '$lib/components/ShimmerText.svelte';
	import { type ToolRun, toolDefinitions, formatTime, runSummary } from './model';
	let {
		toolRuns = $bindable(),
		selectedRunId = $bindable(),
		isRunningTool,
		selectedToolDefinition,
		selectedRun
	}: {
		toolRuns: ToolRun[];
		selectedRunId: string;
		isRunningTool: boolean;
		selectedToolDefinition: (typeof toolDefinitions)[number];
		selectedRun: ToolRun | null;
	} = $props();
</script>

<aside
	class="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xs xl:col-span-4"
>
	<div class="flex shrink-0 items-center justify-between gap-3 border-b border-base-300 px-4 py-3">
		<div class="flex items-center gap-2">
			<Layers size={14} class="text-base-content/45" />
			<p class="text-sm font-semibold">Run log</p>
			{#if toolRuns.length}
				<span
					class="rounded-full bg-base-200 px-2 py-0.5 font-mono text-[10px] text-base-content/50"
				>
					{toolRuns.length}
				</span>
			{/if}
		</div>
		{#if toolRuns.length}
			<button
				class="btn btn-ghost btn-xs gap-1 rounded-full text-base-content/45"
				onclick={() => {
					toolRuns = [];
					selectedRunId = '';
				}}
			>
				<Trash2 size={12} />
				Clear
			</button>
		{/if}
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto p-2">
		{#if isRunningTool}
			<div class="flex items-center gap-2.5 rounded-lg px-3 py-2.5">
				<span class="relative mt-0.5 flex h-2 w-2 shrink-0">
					<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60"
					></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
				</span>
				<ShimmerText
					text="Running {selectedToolDefinition.label}…"
					tone="primary"
					class="font-mono text-xs font-medium"
				/>
			</div>
		{/if}

		{#if toolRuns.length === 0 && !isRunningTool}
			<div
				class="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 p-6 text-center"
			>
				<span
					class="flex h-10 w-10 items-center justify-center rounded-full bg-base-200 text-base-content/35"
				>
					<Layers size={17} />
				</span>
				<p class="max-w-[15rem] text-xs leading-relaxed text-base-content/45">
					Every tool call lands here so you can replay and compare payloads while shaping agent
					behavior.
				</p>
			</div>
		{:else}
			{#each toolRuns as run (run.id)}
				{@const isSelected = selectedRun?.id === run.id}
				<button
					class="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition {isSelected
						? 'bg-primary/8'
						: 'hover:bg-base-200/60'}"
					onclick={() => (selectedRunId = run.id)}
				>
					<span
						class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full {isSelected
							? 'bg-primary'
							: 'bg-base-content/25'}"
					></span>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-2">
							<span
								class="truncate font-mono text-xs font-semibold {isSelected
									? 'text-primary'
									: 'text-base-content/75'}"
							>
								{run.tool}
							</span>
							<span class="ml-auto shrink-0 font-mono text-[10px] text-base-content/35">
								{run.result.diagnostics.elapsedMs} ms
							</span>
						</span>
						<span class="mt-0.5 block truncate text-[11px] text-base-content/45">
							{runSummary(run)}
						</span>
						<span class="mt-0.5 block font-mono text-[10px] text-base-content/30">
							{formatTime(run.at)}
						</span>
					</span>
				</button>
			{/each}
		{/if}
	</div>
</aside>
