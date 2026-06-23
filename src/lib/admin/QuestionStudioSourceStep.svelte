<script lang="ts">
	import { Check, Network } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import QuestionStudioSourceAttachment from './QuestionStudioSourceAttachment.svelte';
	import type { Id } from '../../convex/_generated/dataModel';

	interface Props {
		cohortId?: Id<'cohort'> | null;
		cohortLoading: boolean;
		selectedDocumentId?: Id<'contentLib'> | null;
		selectedSourceSummary?: string;
		hasStudioContext: boolean;
		topicsLength: number;
		isTopicMapLoading: boolean;
	}

	let {
		cohortId = null,
		cohortLoading,
		selectedDocumentId = $bindable<Id<'contentLib'> | null>(null),
		selectedSourceSummary = $bindable(''),
		hasStudioContext,
		topicsLength,
		isTopicMapLoading
	}: Props = $props();
</script>

<div class="card border border-base-300 bg-base-100 shadow-xs" in:fly={{ y: 14, duration: 260 }}>
	<div class="card-body gap-3 p-4 sm:p-5">
		<div class="flex items-center gap-2.5">
			<span
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl {selectedDocumentId
					? 'bg-success/15 text-success'
					: 'bg-primary/10 text-primary'}"
			>
				{#if selectedDocumentId}<Check size={16} />{:else}<Network size={16} />{/if}
			</span>
			<div class="min-w-0">
				<h2 class="text-sm font-semibold">Attach a source</h2>
				<p class="text-xs text-base-content/55">Pick an indexed document for the agent to read.</p>
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<QuestionStudioSourceAttachment
				{cohortId}
				{cohortLoading}
				bind:selectedDocumentId
				bind:selectedSourceSummary
			/>
			{#if hasStudioContext && topicsLength === 0}
				<span class="flex items-center gap-1.5 text-xs text-base-content/50">
					<span class="loading loading-spinner loading-xs"></span>
					{isTopicMapLoading ? 'Reading notes…' : 'Finding topics…'}
				</span>
			{:else if topicsLength > 0}
				<span class="flex items-center gap-1 text-xs text-success">
					<Check size={13} />
					{topicsLength} topics found
				</span>
			{/if}
		</div>
	</div>
</div>
