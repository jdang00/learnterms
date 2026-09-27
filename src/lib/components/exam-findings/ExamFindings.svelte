<script lang="ts">
	import type { ExamFinding, ExamFindingSize } from '$lib/examFindings/findings';
	import { buildExamFindingView } from '$lib/examFindings/view';
	import ExamFindingCard from './ExamFindingCard.svelte';

	let {
		findings,
		compact = false,
		class: className = '',
		reveal = true,
		onOpen
	}: {
		findings?: ExamFinding[];
		compact?: boolean;
		class?: string;
		// Pass false while the question is unanswered so pattern quizzes don't give the answer away.
		reveal?: boolean;
		// Makes each box a button (the curator preview opens it in the editor).
		onOpen?: (index: number) => void;
	} = $props();

	// Boxes wrap by container width. Small boxes are fixed square-ish tiles; half and full boxes
	// grow to take whatever room is left in their row.
	const BASIS: Record<ExamFindingSize, string> = {
		small: 'grow-0 self-start basis-full @xs:basis-[calc((100%-var(--gap))/2)] @xl:basis-48',
		half: 'grow basis-full @2xl:basis-[calc((100%-var(--gap))/2)]',
		full: 'grow basis-full'
	};
	const COMPACT_BASIS: Record<ExamFindingSize, string> = {
		small: '@xl:basis-40',
		half: '@4xl:basis-[calc((100%-2*var(--gap))/3)]',
		full: ''
	};

	const views = $derived(
		(findings ?? []).flatMap((finding, index) => {
			const view = buildExamFindingView(finding);
			return view ? [{ view, index }] : [];
		})
	);
</script>

{#if views.length}
	<div class="@container my-4 {className}">
		<section
			aria-label="Exam findings"
			class="flex flex-wrap gap-(--gap) text-sm {compact ? '[--gap:0.5rem]' : '[--gap:0.75rem]'}"
		>
			{#each views as { view, index } (index)}
				<div
					class="relative min-w-0 {BASIS[view.size]} {compact
						? COMPACT_BASIS[view.size]
						: ''} {onOpen
						? 'rounded-2xl transition-shadow hover:ring-2 hover:ring-primary/25'
						: ''}"
				>
					<ExamFindingCard
						{view}
						{compact}
						{reveal}
						class="h-full {onOpen ? 'pointer-events-none' : ''}"
					/>
					{#if onOpen}
						<button
							type="button"
							class="absolute inset-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
							aria-label="Edit {view.title}"
							title="Edit {view.title}"
							onclick={() => onOpen(index)}
						></button>
					{/if}
				</div>
			{/each}
		</section>
	</div>
{/if}
