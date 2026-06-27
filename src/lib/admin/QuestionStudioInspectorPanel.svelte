<script lang="ts">
	import { Sparkles } from 'lucide-svelte';
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '../../convex/_generated/api';
	import ShimmerText from '$lib/components/ShimmerText.svelte';
	import QuestionStudioAgentTimeline from './QuestionStudioAgentTimeline.svelte';

	type AgentJob = NonNullable<FunctionReturnType<typeof api.questionStudio.getGenerationJob>>;

	interface Props {
		activeJob?: AgentJob | null;
		hasStudioContext: boolean;
		topicsLength: number;
		canStartNewRun?: boolean;
		onStartNewRun?: () => void;
	}

	let {
		activeJob = null,
		hasStudioContext,
		topicsLength,
		canStartNewRun = false,
		onStartNewRun
	}: Props = $props();
</script>

<aside
	class="hidden min-h-0 flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xs xl:col-span-4 xl:flex"
>
	{#if activeJob}
		<div
			class="flex shrink-0 items-center justify-between gap-3 border-b border-base-300 px-4 py-3"
		>
			<div class="min-w-0">
				<p class="truncate text-xs font-medium text-base-content/55">{activeJob.statusText}</p>
			</div>
			{#if canStartNewRun && onStartNewRun}
				<button class="btn btn-ghost btn-xs rounded-full" onclick={onStartNewRun}>New run</button>
			{/if}
		</div>
		<QuestionStudioAgentTimeline job={activeJob} />
	{:else if hasStudioContext && topicsLength === 0}
		<div class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
			<span
				class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"
			>
				<Sparkles size={18} />
			</span>
			<ShimmerText text="Reading your source notes…" tone="primary" class="text-sm font-medium" />
		</div>
	{:else}
		<div class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
			<span
				class="flex h-10 w-10 items-center justify-center rounded-full bg-base-200 text-base-content/35"
			>
				<Sparkles size={18} />
			</span>
			<p class="max-w-[15rem] text-sm text-base-content/45">
				The agent's progress will appear here as it works.
			</p>
		</div>
	{/if}
</aside>
