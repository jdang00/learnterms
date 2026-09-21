<script lang="ts">
	import { ArrowLeft, Check, RotateCcw, TriangleAlert } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import ShimmerText from '$lib/components/ShimmerText.svelte';
	import { formatPageSelection } from './pagePickerSelection';
	import { plannedSlots, runHeadline, runPhase } from './questionStudioRun';
	import type { AgentJob } from './questionStudioRun';
	import type { QuestionType } from './questionStudioTypes';
	import { questionTypes, questionTypeDefinitions } from './questionStudioTypes';

	interface Props {
		job?: AgentJob | null;
		candidateCount: number;
		className: string;
		moduleTitle: string;
		sourceTitle: string;
		counts: Record<QuestionType, number>;
		topicsSelected: number;
		topicsTotal: number;
		canStartNewRun: boolean;
		unsavedCount?: number;
		onStartNewRun: () => void;
	}

	let {
		job = null,
		candidateCount,
		className,
		moduleTitle,
		sourceTitle,
		counts,
		topicsSelected,
		topicsTotal,
		canStartNewRun,
		unsavedCount = 0,
		onStartNewRun
	}: Props = $props();

	let confirmingNewRun = $state(false);

	const phase = $derived(runPhase(job));
	const working = $derived(phase === 'planning' || phase === 'writing' || phase === 'checking');
	const planned = $derived(plannedSlots(job).length || job?.requestedCount || 0);
	const headline = $derived(runHeadline(job, candidateCount));
	const progress = $derived(planned > 0 ? Math.min(1, candidateCount / planned) : 0);
	const scope = $derived(
		job?.sourceMode === 'pages'
			? `pages ${formatPageSelection(job.selectedPageNumbers ?? [])}`
			: topicsTotal > 0
				? topicsSelected === topicsTotal
					? `all ${topicsTotal} topics`
					: `${topicsSelected} of ${topicsTotal} topics`
				: ''
	);

	const mix = $derived(
		questionTypes
			.filter((type) => counts[type] > 0)
			.map((type) => `${counts[type]} ${questionTypeDefinitions[type].label.toLowerCase()}`)
			.join(', ')
	);

	function requestNewRun() {
		if (unsavedCount > 0) confirmingNewRun = true;
		else onStartNewRun();
	}
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && (confirmingNewRun = false)} />

<div class="shrink-0 border-b border-base-300 bg-base-100">
	<div class="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 sm:px-4">
		<a class="btn btn-ghost btn-sm btn-circle" href={resolve('/admin')} aria-label="Back to admin">
			<ArrowLeft size={16} />
		</a>

		<div class="min-w-0 leading-tight">
			<p class="truncate text-sm font-medium">
				{className}<span class="mx-1.5 text-base-content/25">/</span>{moduleTitle}
			</p>
			{#if sourceTitle}
				<p class="truncate text-xs text-base-content/50">
					From {sourceTitle}{scope ? `, ${scope}` : ''}{mix ? `, ${mix}` : ''}
				</p>
			{/if}
		</div>

		<div class="ml-auto flex min-w-0 items-center gap-2.5">
			{#if phase === 'ready'}
				<span
					class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
				>
					<Check size={12} />
				</span>
				<span class="truncate text-sm font-medium">{headline}</span>
			{:else if phase === 'failed'}
				<TriangleAlert size={14} class="shrink-0 text-error" />
				<span class="truncate text-sm font-medium text-error">{headline}</span>
			{:else}
				<span class="relative flex h-2 w-2 shrink-0">
					<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60"
					></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
				</span>
				<ShimmerText text={headline} tone="primary" class="truncate text-sm font-medium" />
			{/if}

			{#if canStartNewRun}
				<div class="relative">
					<button class="btn btn-sm gap-1.5 rounded-full" onclick={requestNewRun}>
						<RotateCcw size={13} />
						<span class="hidden sm:inline">New run</span>
					</button>
					{#if confirmingNewRun}
						<div
							class="fixed inset-0 z-30"
							onclick={() => (confirmingNewRun = false)}
							role="none"
						></div>
						<div
							class="absolute right-0 top-full z-40 mt-1.5 w-72 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-lg"
							role="alertdialog"
							aria-label="Discard unsaved drafts"
						>
							<p class="text-sm leading-relaxed">
								{unsavedCount} draft{unsavedCount === 1 ? " hasn't" : "s haven't"} been saved. Starting
								a new run discards {unsavedCount === 1 ? 'it' : 'them'}.
							</p>
							<div class="mt-3 flex gap-1.5">
								<button
									class="btn btn-ghost btn-sm flex-1 rounded-full"
									onclick={() => (confirmingNewRun = false)}
								>
									Keep reviewing
								</button>
								<button
									class="btn btn-error btn-sm flex-1 rounded-full"
									onclick={() => {
										confirmingNewRun = false;
										onStartNewRun();
									}}
								>
									Discard
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	{#if working}
		<div class="h-0.5 w-full bg-base-200">
			<div
				class="h-full bg-primary transition-[width] duration-500 ease-out"
				style="width: {Math.round(progress * 100)}%"
			></div>
		</div>
	{/if}
</div>
