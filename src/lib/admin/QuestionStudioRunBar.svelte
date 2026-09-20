<script lang="ts">
	import { ArrowLeft, Check, Info, ListTree, RotateCcw, TriangleAlert } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import ShimmerText from '$lib/components/ShimmerText.svelte';
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
		activityOpen?: boolean;
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
		activityOpen = $bindable(false),
		canStartNewRun,
		unsavedCount = 0,
		onStartNewRun
	}: Props = $props();

	let detailsOpen = $state(false);
	let confirmingNewRun = $state(false);

	function closeDetails() {
		detailsOpen = false;
		confirmingNewRun = false;
	}

	const phase = $derived(runPhase(job));
	const working = $derived(phase === 'planning' || phase === 'writing' || phase === 'checking');
	const planned = $derived(plannedSlots(job).length || job?.requestedCount || 0);
	const headline = $derived(runHeadline(job, candidateCount));
	const progress = $derived(planned > 0 ? Math.min(1, candidateCount / planned) : 0);
	const mix = $derived(
		questionTypes
			.filter((type) => counts[type] > 0)
			.map((type) => `${counts[type]} ${questionTypeDefinitions[type].label}`)
			.join(' · ')
	);
</script>

<div class="shrink-0 border-b border-base-300 bg-base-100">
	<div class="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 sm:px-4">
		<a class="btn btn-ghost btn-sm btn-circle" href={resolve('/admin')} aria-label="Back to admin">
			<ArrowLeft size={16} />
		</a>

		<!-- Breadcrumb + setup details -->
		<div class="relative flex min-w-0 items-center gap-1.5">
			<span class="min-w-0 truncate text-sm font-medium">
				{className}<span class="mx-1.5 text-base-content/25">/</span>{moduleTitle}
			</span>
			<button
				type="button"
				class="btn btn-ghost btn-xs btn-circle shrink-0 text-base-content/40"
				aria-label="Run setup"
				onclick={() => (detailsOpen ? closeDetails() : (detailsOpen = true))}
			>
				<Info size={13} />
			</button>
			{#if detailsOpen}
				<div class="fixed inset-0 z-30" onclick={closeDetails} role="none"></div>
				<div
					class="absolute left-0 top-full z-40 mt-1.5 w-72 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-lg"
				>
					<dl class="space-y-2 text-xs">
						<div class="flex items-baseline justify-between gap-3">
							<dt class="shrink-0 text-base-content/45">Source</dt>
							<dd class="truncate text-right font-medium">{sourceTitle || '—'}</dd>
						</div>
						<div class="flex items-baseline justify-between gap-3">
							<dt class="shrink-0 text-base-content/45">
								{job?.sourceMode === 'pages' ? 'Pages' : 'Topics'}
							</dt>
							<dd class="text-right font-medium">
								{job?.sourceMode === 'pages'
									? job.selectedPageNumbers?.join(', ')
									: `${topicsSelected} of ${topicsTotal}`}
							</dd>
						</div>
						<div class="flex items-baseline justify-between gap-3">
							<dt class="shrink-0 text-base-content/45">Mix</dt>
							<dd class="text-right font-medium">{mix || '—'}</dd>
						</div>
					</dl>
					{#if canStartNewRun && confirmingNewRun}
						<p class="mt-4 text-xs leading-relaxed text-base-content/60">
							{unsavedCount} draft{unsavedCount === 1 ? '' : 's'} in this run
							{unsavedCount === 1 ? 'has' : 'have'} not been saved. Starting over discards
							{unsavedCount === 1 ? 'it' : 'them'}.
						</p>
						<div class="mt-2 flex gap-1.5">
							<button
								class="btn btn-ghost btn-sm flex-1 rounded-full"
								onclick={() => (confirmingNewRun = false)}
							>
								Cancel
							</button>
							<button
								class="btn btn-error btn-sm flex-1 rounded-full"
								onclick={() => {
									closeDetails();
									onStartNewRun();
								}}
							>
								Discard
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Status -->
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

			<button
				class="btn btn-ghost btn-sm gap-1.5 rounded-full text-base-content/60"
				onclick={() => (activityOpen = !activityOpen)}
			>
				<ListTree size={14} />
				<span class="hidden sm:inline">Activity</span>
			</button>

			{#if canStartNewRun}
				<button
					class="btn btn-sm gap-1.5 rounded-full"
					onclick={() => {
						if (unsavedCount > 0) {
							detailsOpen = true;
							confirmingNewRun = true;
							return;
						}
						onStartNewRun();
					}}
				>
					<RotateCcw size={13} />
					<span class="hidden sm:inline">New run</span>
				</button>
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
