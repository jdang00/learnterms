<script lang="ts">
	import type { ExamFinding } from '$lib/examFindings/findings';
	import { buildExamFindingView } from '$lib/examFindings/view';
	import ExamFindingCard from './ExamFindingCard.svelte';

	let {
		findings,
		compact = false,
		class: className = ''
	}: { findings?: ExamFinding[]; compact?: boolean; class?: string } = $props();

	const views = $derived(
		(findings ?? []).map(buildExamFindingView).filter((view) => view !== null)
	);
</script>

{#if views.length}
	<section
		aria-label="Exam findings"
		class="grid grid-cols-1 text-sm md:grid-cols-2 {compact
			? 'gap-2 xl:grid-cols-3'
			: 'gap-3'} {className}"
	>
		{#each views as view, index (index)}
			<ExamFindingCard {view} {compact} class={view.wide ? 'md:col-span-2' : ''} />
		{/each}
	</section>
{/if}
