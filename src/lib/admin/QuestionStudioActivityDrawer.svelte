<script lang="ts">
	import { Sparkles, X } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import QuestionStudioAgentTimeline from './QuestionStudioAgentTimeline.svelte';
	import type { AgentJob, CandidateReview } from './questionStudioRun';

	interface Props {
		open?: boolean;
		job?: AgentJob | null;
		reviews?: CandidateReview[];
	}

	let { open = $bindable(false), job = null, reviews = [] }: Props = $props();
</script>

{#if open}
	<button
		type="button"
		class="fixed inset-0 z-40 bg-black/20"
		aria-label="Close activity"
		transition:fade={{ duration: 150 }}
		onclick={() => (open = false)}
	></button>
	<aside
		class="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[26rem] flex-col border-l border-base-300 bg-base-100 shadow-2xl"
		transition:fly={{ x: 380, duration: 240 }}
	>
		<div class="flex shrink-0 items-center gap-2.5 border-b border-base-300 px-4 py-3">
			<span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
				<Sparkles size={15} />
			</span>
			<div class="min-w-0 flex-1">
				<h2 class="text-sm font-semibold leading-tight">Agent activity</h2>
				<p class="truncate text-xs text-base-content/50">What the agent did, step by step.</p>
			</div>
			<button
				class="btn btn-ghost btn-sm btn-circle"
				aria-label="Close activity"
				onclick={() => (open = false)}
			>
				<X size={16} />
			</button>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto p-3">
			{#if job}
				<QuestionStudioAgentTimeline {job} {reviews} />
			{:else}
				<p class="px-2 py-4 text-sm text-base-content/50">Starting run…</p>
			{/if}
		</div>
	</aside>
{/if}
