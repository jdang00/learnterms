<script lang="ts">
	import { questionTypeLabel } from './questionStudioTypes';
	import ShimmerText from '$lib/components/ShimmerText.svelte';
	import { Check, ChevronRight, TriangleAlert } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import { acceptedReviews, rejectedReviews, plannedSlots, runPhase } from './questionStudioRun';
	import type { AgentJob, CandidateReview } from './questionStudioRun';

	interface Props {
		job: AgentJob;
		reviews?: CandidateReview[];
	}

	let { job, reviews = [] }: Props = $props();

	let open = $state<Record<string, boolean>>({});
	function toggle(id: string) {
		open = { ...open, [id]: !open[id] };
	}

	const phase = $derived(runPhase(job));
	const running = $derived(job.status === 'running' || job.status === 'queued');
	const batches = $derived(job.plan?.workerBatches ?? []);
	const planned = $derived(plannedSlots(job).length || job.requestedCount || 0);
	const topicTitles = $derived([...new Set(batches.flatMap((batch) => batch.topicTitles))]);
	const draftCount = $derived(job.candidates?.length ?? job.candidateCount ?? 0);
	const workersDone = $derived((job.completedWorkerCount ?? 0) + (job.failedWorkerCount ?? 0));
	const kept = $derived(acceptedReviews(reviews));
	const cut = $derived(rejectedReviews(reviews));

	type Step = {
		id: string;
		title: string;
		meta?: string;
		state: 'done' | 'active' | 'queued' | 'error';
	};

	const steps = $derived.by<Step[]>(() => {
		const planDone = Boolean(job.plan);
		const writeDone = phase === 'checking' || phase === 'ready';
		const checkDone = phase === 'ready';
		const out: Step[] = [
			{
				id: 'plan',
				title: planDone ? 'Read your source and planned the set' : 'Reading your source',
				meta: planDone
					? `${planned} question${planned === 1 ? '' : 's'} · ${topicTitles.length} topic${topicTitles.length === 1 ? '' : 's'}`
					: undefined,
				state: planDone ? 'done' : running ? 'active' : 'queued'
			},
			{
				id: 'write',
				title: 'Writing questions',
				meta: writeDone ? `${draftCount} written` : `${draftCount} of ${planned} written`,
				state: writeDone ? 'done' : planDone && running ? 'active' : 'queued'
			},
			{
				id: 'check',
				title: 'Checking every question',
				meta: reviews.length
					? `${kept.length} kept · ${cut.length} cut`
					: checkDone
						? 'Complete'
						: undefined,
				state: checkDone ? 'done' : writeDone && running ? 'active' : 'queued'
			}
		];
		if (job.status === 'failed')
			out.push({
				id: 'failed',
				title: job.statusText || 'Run stopped',
				meta: job.error,
				state: 'error'
			});
		return out;
	});

	function plainText(value: string): string {
		return (value ?? '')
			.replace(/<[^>]*>/g, '')
			.replace(/&[a-z0-9#]+;/gi, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	function hasDetail(id: string) {
		if (id === 'plan') return Boolean(job.plan);
		if (id === 'write') return batches.length > 0;
		if (id === 'check') return reviews.length > 0;
		return false;
	}
</script>

{#snippet marker(state: Step['state'])}
	{#if state === 'done'}
		<Check size={13} class="text-success" />
	{:else if state === 'error'}
		<TriangleAlert size={13} class="text-error" />
	{:else if state === 'active'}
		<span class="relative flex h-2 w-2">
			<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60"
			></span>
			<span class="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
		</span>
	{:else}
		<span class="h-1.5 w-1.5 rounded-full border border-base-content/25"></span>
	{/if}
{/snippet}

{#snippet stepRow(step: Step, expandable: boolean, isOpen: boolean)}
	<span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
		{@render marker(step.state)}
	</span>
	<span class="min-w-0 flex-1">
		{#if step.state === 'active'}
			<ShimmerText text={step.title} tone="primary" class="text-sm font-medium" />
		{:else}
			<span
				class="block truncate text-sm font-medium {step.state === 'error'
					? 'text-error'
					: step.state === 'queued'
						? 'text-base-content/40'
						: 'text-base-content/75'}"
			>
				{step.title}
			</span>
		{/if}
		{#if step.meta}
			<span class="mt-0.5 block truncate text-xs text-base-content/40">{step.meta}</span>
		{/if}
	</span>
	{#if expandable}
		<ChevronRight
			size={13}
			class="mt-1 shrink-0 text-base-content/30 transition-transform {isOpen ? 'rotate-90' : ''}"
		/>
	{/if}
{/snippet}

<div class="space-y-0.5">
	{#each steps as step (step.id)}
		{@const expandable = hasDetail(step.id)}
		{@const isOpen = !!open[step.id]}
		<div>
			{#if expandable}
				<button
					type="button"
					class="flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-base-200/60"
					onclick={() => toggle(step.id)}
				>
					{@render stepRow(step, true, isOpen)}
				</button>
			{:else}
				<div class="flex w-full items-start gap-2.5 rounded-xl px-2 py-2">
					{@render stepRow(step, false, false)}
				</div>
			{/if}

			{#if expandable && isOpen}
				<div
					class="ml-[15px] space-y-1 border-l border-base-200 py-1 pl-4"
					transition:slide={{ duration: 180 }}
				>
					{#if step.id === 'plan'}
						{#each topicTitles as title (title)}
							<p class="truncate text-xs text-base-content/55">{title}</p>
						{/each}
						{#each job.plan?.coverageNotes ?? [] as note (note)}
							<p class="text-xs leading-relaxed text-base-content/40">{note}</p>
						{/each}
						{#each job.plan?.riskNotes ?? [] as note (note)}
							<p class="text-xs leading-relaxed text-error/80">{note}</p>
						{/each}
					{:else if step.id === 'write'}
						{#each batches as batch, batchIndex (batch.taskId)}
							{@const done = phase === 'ready' || batchIndex < workersDone}
							{@const active = running && batchIndex === workersDone}
							<div class="flex items-center gap-2 text-xs">
								<span class="min-w-0 flex-1 truncate text-base-content/55">
									{questionTypeLabel(batch.questionType)} · {batch.plannedCount} question{batch.plannedCount ===
									1
										? ''
										: 's'}
								</span>
								<span
									class="shrink-0 text-[10px] font-semibold uppercase tracking-wide {done
										? 'text-success'
										: active
											? 'text-primary'
											: 'text-base-content/30'}"
								>
									{done ? 'Done' : active ? 'Writing' : 'Queued'}
								</span>
							</div>
						{/each}
					{:else if step.id === 'check'}
						{#each reviews as review, reviewIndex (reviewIndex)}
							{@const isCut = review.verdict === 'reject'}
							<div class="text-xs">
								<span class={isCut ? 'text-error/80' : 'text-base-content/55'}>
									{isCut ? 'Cut' : 'Kept'} — {review.reasons[0]
										? plainText(review.reasons[0])
										: review.verdict}
								</span>
							</div>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	{/each}
</div>
