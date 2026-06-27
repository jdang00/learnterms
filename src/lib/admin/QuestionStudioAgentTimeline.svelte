<script lang="ts">
	import type { FunctionReturnType } from 'convex/server';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import ShimmerText from '$lib/components/ShimmerText.svelte';
	import { Check, ChevronRight, Sparkles, TriangleAlert } from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	type AgentJob = NonNullable<FunctionReturnType<typeof api.questionStudio.getGenerationJob>>;
	type Candidate = NonNullable<AgentJob['candidates']>[number];
	type ReviewItem = FunctionReturnType<typeof api.questionStudio.getGenerationJobReviews>[number];

	interface Props {
		job: AgentJob;
	}

	let { job }: Props = $props();

	let open = $state<Record<string, boolean>>({});
	function toggle(id: string) {
		open = { ...open, [id]: !open[id] };
	}

	const running = $derived(job.status === 'running' || job.status === 'queued');
	const ready = $derived(job.status === 'ready');
	const failed = $derived(job.status === 'failed');

	const batches = $derived(job.plan?.workerBatches ?? []);
	const planReady = $derived(Boolean(job.plan));
	const plannedTotal = $derived(
		batches.reduce((sum, b) => sum + b.plannedCount, 0) || job.requestedCount || 0
	);
	const allTopicTitles = $derived([...new Set(batches.flatMap((b) => b.topicTitles))]);
	const topicTotal = $derived(allTopicTitles.length);
	const candidates = $derived((job.candidates ?? []) as Candidate[]);
	const draftCount = $derived(candidates.length || job.candidateCount || 0);
	const totalBatches = $derived(batches.length);
	const workersDone = $derived((job.completedWorkerCount ?? 0) + (job.failedWorkerCount ?? 0));
	const reviewCount = $derived(job.reviewCount ?? 0);
	const reviewDone = $derived(reviewCount > 0 || ready);
	const draftingDone = $derived(reviewDone || (totalBatches > 0 && workersDone >= totalBatches));

	// Per-candidate verdicts are pulled only once the reviewer phase is opened.
	const reviewsQuery = useQuery(api.questionStudio.getGenerationJobReviews, () =>
		open['review'] ? { jobId: job._id } : 'skip'
	);
	const reviews = $derived((reviewsQuery.data ?? []) as ReviewItem[]);
	const reviewsLoading = $derived(Boolean(open['review']) && reviewsQuery.isLoading);
	const acceptedCount = $derived(reviews.filter((r) => r.verdict === 'accept').length);
	const revisedCount = $derived(reviews.filter((r) => r.verdict === 'revise').length);
	const rejectedCount = $derived(reviews.filter((r) => r.verdict === 'reject').length);

	const orderName: Record<string, string> = {
		first: 'First-order',
		second: 'Second-order',
		third: 'Third-order'
	};

	function plainText(value: string): string {
		return (value ?? '')
			.replace(/<[^>]*>/g, '')
			.replace(/&[a-z0-9#]+;/gi, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	type BatchStatus = 'done' | 'active' | 'queued';
	function batchStatus(i: number): BatchStatus {
		if (ready || i < workersDone) return 'done';
		if (running && i === workersDone) return 'active';
		return 'queued';
	}

	type Marker = 'check' | 'active' | 'error' | 'dot-done' | 'dot-active' | 'dot-queued' | 'dot';
	type Tone = 'normal' | 'muted' | 'error';
	interface TLNode {
		id: string;
		title: string;
		meta?: string;
		metaMono?: boolean;
		marker: Marker;
		statusLabel?: string;
		statusTone?: 'success' | 'primary' | 'muted';
		shimmer?: boolean;
		tone?: Tone;
		clamp?: boolean;
		children?: TLNode[];
	}

	// Default view is a short plain-language thread. Drilling into a phase breaks it out by
	// the agents that did the work; one level deeper exposes the raw, technical detail.
	const tree = $derived.by<TLNode[]>(() => {
		const out: TLNode[] = [];

		out.push({
			id: 'plan',
			title: planReady ? 'Planned your question set' : 'Reading your source notes',
			meta: planReady
				? `${plannedTotal} question${plannedTotal === 1 ? '' : 's'} · ${topicTotal} topic${topicTotal === 1 ? '' : 's'}`
				: undefined,
			marker: planReady ? 'check' : 'active',
			shimmer: !planReady && running,
			children: planReady
				? [
						{
							id: 'plan:mapper',
							title: 'Topic mapper',
							meta: `${topicTotal} topic${topicTotal === 1 ? '' : 's'} identified`,
							marker: 'dot-done',
							children: allTopicTitles.map((t, i) => ({
								id: `plan:t:${i}`,
								title: t,
								marker: 'dot' as Marker,
								tone: 'muted' as Tone,
								clamp: true
							}))
						},
						{
							id: 'plan:planner',
							title: 'Coverage planner',
							meta: `${totalBatches} work order${totalBatches === 1 ? '' : 's'}`,
							marker: 'dot-done',
							children: [
								...batches.map((b, i) => ({
									id: `plan:wo:${i}`,
									title: `${orderName[b.reasoningOrder]} · ${b.plannedCount}q`,
									meta: `${b.taskId} · pp ${b.sourcePages.join(', ')}`,
									metaMono: true,
									marker: 'dot' as Marker,
									tone: 'muted' as Tone
								})),
								...(job.plan?.coverageNotes?.length
									? [
											{
												id: 'plan:cov',
												title: 'Coverage notes',
												meta: job.plan.coverageNotes.join(' '),
												marker: 'dot' as Marker,
												tone: 'muted' as Tone,
												clamp: true
											}
										]
									: []),
								...(job.plan?.riskNotes?.length
									? [
											{
												id: 'plan:risk',
												title: 'Risk notes',
												meta: job.plan.riskNotes.join(' '),
												marker: 'dot' as Marker,
												tone: 'error' as Tone,
												clamp: true
											}
										]
									: [])
							]
						}
					]
				: undefined
		});

		if (planReady) {
			out.push({
				id: 'write',
				title: 'Writing questions',
				meta: draftingDone ? `${draftCount} written` : `${draftCount} of ${plannedTotal} written`,
				marker: draftingDone ? 'check' : 'active',
				shimmer: !draftingDone && running,
				children: [
					...batches.map((b, i) => {
						const st = batchStatus(i);
						return {
							id: `write:${i}`,
							title: `${orderName[b.reasoningOrder]} worker`,
							meta: `${b.plannedCount} planned · ${b.topicCount} topic${b.topicCount === 1 ? '' : 's'}`,
							marker: st === 'done' ? 'dot-done' : st === 'active' ? 'dot-active' : 'dot-queued',
							statusLabel: st === 'done' ? 'Finished' : st === 'active' ? 'Writing' : 'Queued',
							statusTone: st === 'done' ? 'success' : st === 'active' ? 'primary' : 'muted'
						} satisfies TLNode;
					}),
					...(candidates.length
						? [
								{
									id: 'write:candidates',
									title: 'Drafted candidates',
									meta: `${candidates.length} visible · ${job.blockedDuplicateCount ?? 0} blocked`,
									marker: 'dot-done' as Marker,
									children: candidates.map((c, ci) => ({
										id: `write:c:${ci}`,
										title: plainText(c.stem),
										clamp: true,
										meta: `${orderName[c.reasoningOrder]} · dup ${c.duplicateRisk} · ${c.sourceCitations?.length ?? 0} cites · pp ${c.sourcePageNumbers.join(', ')}`,
										metaMono: true,
										marker: 'dot' as Marker,
										tone: 'muted' as Tone
									}))
								}
							]
						: [])
				]
			});
		}

		if (draftingDone) {
			out.push({
				id: 'review',
				title: ready ? 'Checked every question' : 'Reviewing for quality',
				marker: ready ? 'check' : 'active',
				shimmer: !ready && running,
				children:
					reviewCount > 0
						? [
								{
									id: 'review:agent',
									title: 'Reviewer',
									meta: reviewsLoading
										? 'Loading verdicts…'
										: reviews.length
											? `${acceptedCount} kept · ${revisedCount} revised · ${rejectedCount} cut`
											: `${reviewCount} question${reviewCount === 1 ? '' : 's'} reviewed`,
									marker: ready ? 'dot-done' : 'dot-active',
									children: reviews.map((r) => ({
										id: `review:${r.candidateIndex}`,
										title: `Q${r.candidateIndex + 1} — ${r.verdict}`,
										meta: r.reasons.join(' '),
										clamp: true,
										marker: 'dot' as Marker,
										tone: (r.verdict === 'reject' ? 'error' : 'muted') as Tone,
										children: [
											{
												id: `review:${r.candidateIndex}:dev`,
												title: `support ${r.sourceSupport} · answer ${r.answerQuality}${r.revisedStem ? ' · revised' : ''}`,
												metaMono: true,
												marker: 'dot' as Marker,
												tone: 'muted' as Tone
											}
										]
									}))
								}
							]
						: undefined
			});
		}

		if (ready) {
			out.push({
				id: 'ready',
				title: `Ready — ${draftCount} question${draftCount === 1 ? '' : 's'} to review`,
				marker: 'check'
			});
		}
		if (failed) {
			out.push({
				id: 'failed',
				title: job.statusText || 'Run stopped',
				marker: 'error',
				tone: 'error'
			});
		}
		return out;
	});

	let streamEl = $state<HTMLDivElement | null>(null);
	$effect(() => {
		const count = tree.length;
		if (streamEl && count >= 0) streamEl.scrollTop = streamEl.scrollHeight;
	});
</script>

{#snippet marker(m: Marker)}
	{#if m === 'check'}
		<Check size={14} class="text-base-content/30" />
	{:else if m === 'error'}
		<TriangleAlert size={13} class="text-error" />
	{:else if m === 'active'}
		<span class="relative flex h-2 w-2">
			<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60"
			></span>
			<span class="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
		</span>
	{:else if m === 'dot-active'}
		<span class="relative flex h-1.5 w-1.5">
			<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60"
			></span>
			<span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary"></span>
		</span>
	{:else if m === 'dot-done'}
		<span class="h-1.5 w-1.5 rounded-full bg-base-content/40"></span>
	{:else if m === 'dot-queued'}
		<span class="h-1.5 w-1.5 rounded-full border border-base-content/25"></span>
	{:else}
		<span class="h-1 w-1 rounded-full bg-base-content/25"></span>
	{/if}
{/snippet}

{#snippet rowInner(n: TLNode, depth: number, clickable: boolean, isOpen: boolean)}
	{@const titleSize = depth === 0 ? 'text-sm' : 'text-[13px]'}
	{@const titleColor =
		n.tone === 'error'
			? 'text-error'
			: depth === 0
				? n.marker === 'check'
					? 'text-base-content/55'
					: 'text-base-content'
				: 'text-base-content/70'}
	<span class="mt-1 flex h-4 w-4 shrink-0 items-center justify-center">
		{@render marker(n.marker)}
	</span>
	<span class="min-w-0 flex-1">
		<span class="flex items-center gap-2">
			<span class="min-w-0 flex-1">
				{#if n.shimmer}
					<ShimmerText text={n.title} tone="primary" class="text-sm font-medium" />
				{:else}
					<span
						class="block {titleSize} font-medium {n.clamp
							? 'line-clamp-2'
							: 'truncate'} {titleColor}"
					>
						{n.title}
					</span>
				{/if}
			</span>
			{#if n.statusLabel}
				<span
					class="shrink-0 text-[10px] font-semibold uppercase tracking-wide {n.statusTone ===
					'success'
						? 'text-success'
						: n.statusTone === 'primary'
							? 'text-primary'
							: 'text-base-content/35'}"
				>
					{n.statusLabel}
				</span>
			{/if}
			{#if clickable}
				<ChevronRight
					size={13}
					class="shrink-0 text-base-content/30 transition-transform {isOpen ? 'rotate-90' : ''}"
				/>
			{/if}
		</span>
		{#if n.meta}
			<span
				class="mt-0.5 block {n.metaMono ? 'font-mono text-[11px]' : 'text-xs'} {n.clamp
					? 'line-clamp-2'
					: 'truncate'} text-base-content/40"
			>
				{n.meta}
			</span>
		{/if}
	</span>
{/snippet}

{#snippet node(n: TLNode, depth: number)}
	{@const hasChildren = !!(n.children && n.children.length)}
	{@const isOpen = !!open[n.id]}
	<div>
		{#if hasChildren}
			<button
				type="button"
				class="group flex w-full items-start gap-2.5 rounded-lg py-2 pl-1 pr-2 text-left transition hover:bg-base-200/50"
				onclick={() => toggle(n.id)}
			>
				{@render rowInner(n, depth, true, isOpen)}
			</button>
		{:else}
			<div class="flex items-start gap-2.5 py-2 pl-1 pr-2">
				{@render rowInner(n, depth, false, false)}
			</div>
		{/if}
		{#if hasChildren && isOpen}
			<div class="ml-[7px] border-l border-base-200 pl-4" transition:slide={{ duration: 180 }}>
				{#each n.children ?? [] as child (child.id)}
					{@render node(child, depth + 1)}
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<div bind:this={streamEl} class="min-h-0 flex-1 overflow-y-auto">
	<div class="flex gap-3.5 px-5 py-6">
		<span
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
		>
			<Sparkles size={16} />
		</span>

		<div class="min-w-0 flex-1">
			<p class="mb-4 text-sm font-semibold leading-none">Question Studio</p>

			<div class="space-y-0.5">
				{#each tree as n (n.id)}
					{@render node(n, 0)}
				{/each}
			</div>
		</div>
	</div>
</div>
