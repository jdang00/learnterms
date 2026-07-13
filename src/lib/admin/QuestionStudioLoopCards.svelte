<script lang="ts">
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '../../convex/_generated/api';
	import { ClipboardList, Filter, PencilLine, Workflow } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import type { LoopPassKey } from './questionStudioTypes';

	type AgentJob = NonNullable<FunctionReturnType<typeof api.questionStudio.getGenerationJob>>;

	interface Props {
		job: AgentJob;
	}

	let { job }: Props = $props();

	const passCards: Array<{
		key: LoopPassKey;
		label: string;
		description: string;
		icon: typeof ClipboardList;
	}> = [
		{
			key: 'plan',
			label: 'Plan',
			description:
				'The server assigns each slot a topic, reasoning order, objective, and template.',
			icon: ClipboardList
		},
		{
			key: 'draft',
			label: 'Draft',
			description:
				'Each worker writes up to three related questions in one turn, with an optional same-thread continuation.',
			icon: PencilLine
		},
		{
			key: 'gate',
			label: 'Gate',
			description:
				'Deterministic checks: citations present, answer matches one option, no source-mention language.',
			icon: Filter
		}
	];

	const passOrder = ['plan', 'draft', 'gate', 'done'] as const;
	const currentIndex = $derived(passOrder.indexOf(job.loop?.pass ?? 'plan'));
	const running = $derived(job.status === 'running' || job.status === 'queued');
	const failed = $derived(job.status === 'failed');
	const ready = $derived(job.status === 'ready');

	function passState(key: LoopPassKey): 'done' | 'active' | 'pending' {
		const index = passOrder.indexOf(key);
		if (ready || index < currentIndex) return 'done';
		if (index === currentIndex) return running || failed ? 'active' : 'pending';
		return 'pending';
	}

	const workerTotal = $derived(job.plan?.workerBatches.length ?? 0);
	const workersDone = $derived((job.completedWorkerCount ?? 0) + (job.failedWorkerCount ?? 0));

	function passDetail(key: LoopPassKey): string {
		const loop = job.loop;
		if (!loop) return '';
		switch (key) {
			case 'plan':
				return loop.blueprintCount !== undefined ? `${loop.blueprintCount} blueprints` : '';
			case 'draft': {
				if (workerTotal === 0) return '';
				return `${Math.min(workersDone, workerTotal)}/${workerTotal} workers · ${job.candidateCount ?? 0} drafts`;
			}
			case 'gate':
				return loop.gatePassedCount !== undefined ? `${loop.gatePassedCount} passed` : '';
		}
	}
</script>

<div class="card border border-base-300 bg-base-100 shadow-xs" in:fly={{ y: 14, duration: 260 }}>
	<div class="card-body gap-3 p-4 sm:p-5">
		<div class="flex items-center gap-2.5">
			<span
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
			>
				<Workflow size={16} />
			</span>
			<div class="min-w-0">
				<h2 class="text-sm font-semibold">Tool-guided generation</h2>
				<p class="text-xs text-base-content/55">
					Plan → draft → deterministic checks, then you pick what to keep.
				</p>
			</div>
		</div>
		<div class="grid gap-2 sm:grid-cols-3">
			{#each passCards as card (card.key)}
				{@const state = passState(card.key)}
				{@const detail = passDetail(card.key)}
				<div
					class="flex flex-col gap-2 rounded-2xl border p-3 text-left transition
						{state === 'active' && failed ? 'border-error/50 bg-error/5' : ''}
						{state === 'active' && !failed ? 'border-primary/50 bg-primary/5' : ''}
						{state !== 'active' ? 'border-base-300 bg-base-100' : ''}
						{state === 'pending' ? 'opacity-60' : ''}"
				>
					<div class="flex items-center gap-2">
						<span
							class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
								{state === 'done' ? 'bg-success/10 text-success' : ''}
								{state === 'active' && !failed ? 'bg-primary/10 text-primary' : ''}
								{state === 'active' && failed ? 'bg-error/10 text-error' : ''}
								{state === 'pending' ? 'bg-base-200 text-base-content/45' : ''}"
						>
							<card.icon size={14} />
						</span>
						{#if state === 'active' && !failed}
							<span class="relative flex h-2 w-2">
								<span
									class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60"
								></span>
								<span class="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
							</span>
						{/if}
					</div>
					<span class="text-xs font-semibold">{card.label}</span>
					<span class="text-[11px] leading-relaxed text-base-content/55">{card.description}</span>
					{#if detail}
						<span class="mt-auto font-mono text-[11px] text-base-content/70">{detail}</span>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
