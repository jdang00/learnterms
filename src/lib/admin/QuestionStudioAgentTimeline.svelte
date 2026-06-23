<script lang="ts">
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '../../convex/_generated/api';
	import ShimmerText from '$lib/components/ShimmerText.svelte';

	type AgentJob = NonNullable<FunctionReturnType<typeof api.questionStudio.getGenerationJob>>;

	interface Props {
		job: AgentJob;
	}

	let { job }: Props = $props();

	const running = $derived(job.status === 'running');
	const lastEventIndex = $derived(job.events.length - 1);
</script>

<div class="flex h-full flex-col overflow-hidden">
	<div class="flex shrink-0 items-center justify-between border-b border-base-300 p-4">
		<div>
			<h3 class="text-sm font-semibold">Agent activity</h3>
			<p class="text-xs text-base-content/50">{job.model}</p>
		</div>
		<span
			class="badge badge-sm {job.status === 'failed'
				? 'badge-error'
				: job.status === 'ready'
					? 'badge-success'
					: 'badge-ghost'}"
		>
			{job.status}
		</span>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto p-4">
		<!-- Event feed -->
		<div class="relative space-y-3 pl-4">
			<div class="absolute bottom-1 left-[3px] top-2 w-px bg-base-300"></div>
			{#each job.events as event, i (event.at)}
				<div class="relative">
					<span
						class="absolute -left-4 top-1.5 h-1.5 w-1.5 rounded-full {i === lastEventIndex &&
						running
							? 'bg-primary'
							: 'bg-base-content/30'}"
					></span>
					<div class="min-w-0">
						{#if i === lastEventIndex && running}
							<ShimmerText text={event.label} tone="primary" class="text-xs font-medium" />
						{:else}
							<p class="text-xs font-medium text-base-content/75">{event.label}</p>
						{/if}
						{#if event.detail}
							<p class="mt-0.5 text-xs text-base-content/45">{event.detail}</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Plan -->
		<div class="mt-4 border-t border-base-300 pt-3">
			<h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/55">Plan</h4>
			{#if job.plan}
				<div class="grid grid-cols-1 gap-2">
					{#each job.plan.topicAllocations as allocation (allocation.topicId)}
						<div class="rounded-xl border border-base-300 bg-base-100 p-2.5 text-xs">
							<div class="flex flex-wrap items-center gap-2">
								<span class="font-medium">{allocation.topicTitle}</span>
								<span class="badge badge-ghost badge-xs">{allocation.plannedCount} q</span>
								<span class="badge badge-outline badge-xs"
									>{allocation.reasoningOrders.join(', ')}</span
								>
							</div>
							<p class="mt-1 text-base-content/50">
								Pages {allocation.sourcePages.join(', ')} · {allocation.notes}
							</p>
						</div>
					{/each}
				</div>
				{#if job.plan.riskNotes.length > 0}
					<div class="mt-2 rounded-xl bg-warning/10 p-2.5 text-xs text-base-content/70">
						<span class="font-medium">Risks:</span>
						{job.plan.riskNotes.join(' ')}
					</div>
				{/if}
			{:else if running}
				<ShimmerText text="Choosing coverage and risk notes…" tone="primary" class="text-xs" />
			{:else}
				<p class="text-xs text-base-content/40">Waiting to plan.</p>
			{/if}
		</div>

		<!-- Draft -->
		<div class="mt-3 border-t border-base-300 pt-3">
			<h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/55">Draft</h4>
			{#if job.candidates && job.candidates.length > 0}
				<p class="text-xs text-base-content/60">
					{job.candidates.length} draft candidates produced.
					{#if job.blockedDuplicateCount}
						{job.blockedDuplicateCount} high-risk duplicates blocked.
					{/if}
				</p>
			{:else if job.plan && running}
				<ShimmerText text="Drafting candidates from the plan…" tone="primary" class="text-xs" />
			{:else}
				<p class="text-xs text-base-content/40">Drafting starts after planning.</p>
			{/if}
		</div>

		<!-- Review -->
		<div class="mt-3 border-t border-base-300 pt-3">
			<h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/55">
				Review
			</h4>
			{#if job.reviews && job.reviews.length > 0}
				<div class="grid grid-cols-1 gap-2">
					{#each job.reviews as review (review.candidateIndex)}
						<div class="rounded-xl border border-base-300 bg-base-100 p-2.5 text-xs">
							<div class="mb-1 flex flex-wrap items-center gap-2">
								<span class="font-medium">Candidate {review.candidateIndex + 1}</span>
								<span
									class="badge badge-xs {review.verdict === 'reject'
										? 'badge-error'
										: review.verdict === 'revise'
											? 'badge-warning'
											: 'badge-success'}"
								>
									{review.verdict}
								</span>
								<span class="badge badge-ghost badge-xs">{review.sourceSupport} support</span>
								<span class="badge badge-ghost badge-xs">{review.answerQuality}</span>
							</div>
							<p class="text-base-content/50">{review.reasons.join(' ')}</p>
						</div>
					{/each}
				</div>
			{:else if job.candidates && running}
				<ShimmerText
					text="Reviewing source support and answer clarity…"
					tone="primary"
					class="text-xs"
				/>
			{:else}
				<p class="text-xs text-base-content/40">Review starts after drafts are ready.</p>
			{/if}
		</div>
	</div>
</div>
