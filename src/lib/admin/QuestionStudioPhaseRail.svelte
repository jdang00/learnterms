<script lang="ts">
	import { ListTree, Network, PencilLine, ShieldCheck } from 'lucide-svelte';
	import type { QuestionStudioPhase } from './questionStudioTypes';

	interface Props {
		phases: QuestionStudioPhase[];
	}

	let { phases }: Props = $props();
</script>

<div
	class="flex shrink-0 items-center gap-1 overflow-x-auto rounded-t-2xl border-b border-base-300 px-4 py-3"
>
	{#each phases as phase, i (phase.key)}
		<div class="flex shrink-0 items-center gap-2">
			<span
				class="flex h-7 w-7 items-center justify-center rounded-full border transition-colors
					{phase.state === 'done'
					? 'border-primary bg-primary text-primary-content'
					: phase.state === 'active'
						? 'border-primary bg-primary/10 text-primary'
						: 'border-base-300 text-base-content/30'}"
			>
				{#if phase.key === 'source'}
					<Network size={14} />
				{:else if phase.key === 'topics'}
					<ListTree size={14} />
				{:else if phase.key === 'draft'}
					<PencilLine size={14} />
				{:else}
					<ShieldCheck size={14} />
				{/if}
			</span>
			<span
				class="text-xs font-semibold {phase.state === 'active'
					? 'text-primary'
					: phase.state === 'done'
						? 'text-base-content/80'
						: 'text-base-content/35'}"
			>
				{phase.label}
			</span>
		</div>
		{#if i < phases.length - 1}
			<div class="mx-1.5 h-px w-6 shrink-0 bg-base-300"></div>
		{/if}
	{/each}
</div>
