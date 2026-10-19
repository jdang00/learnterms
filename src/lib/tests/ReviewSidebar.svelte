<script lang="ts">
	import { RadialProgress } from '$lib/components/ui/radial-progress';
	import { Button } from '$lib/components/ui/button';
	import QuestionAttachmentsSidebar from '$lib/components/QuestionAttachmentsSidebar.svelte';
	import { resolve } from '$app/paths';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Plus from '@lucide/svelte/icons/plus';
	import type { Id } from '../../convex/_generated/dataModel';
	import type { AttemptResults } from './results';
	import type { ReviewState } from './review.svelte';

	let {
		review,
		attempt,
		classId,
		hidden = $bindable(false)
	}: {
		review: ReviewState;
		attempt: AttemptResults['attempt'];
		classId: Id<'class'>;
		hidden?: boolean;
	} = $props();
	const summary = $derived(attempt.resultSummary);
</script>

<div
	class="hidden lg:flex lg:flex-col relative overflow-y-auto overflow-x-hidden border border-border rounded-4xl p-3 px-4 transition-all duration-200 ease-out bg-background/80 backdrop-blur-md shadow-lg shrink-0 h-full
	{hidden ? 'w-[72px]' : 'w-[min(22rem,30vw)] xl:w-[min(24rem,28vw)]'}"
>
	<Button
		variant="ghost"
		tone="neutral"
		size="sm"
		shape="circle"
		class="absolute top-6 left-5 size-9"
		onclick={() => (hidden = !hidden)}
		aria-label="Toggle sidebar"
	>
		<PanelRight size={18} class="transition-transform duration-300 {hidden ? 'rotate-180' : ''}" />
	</Button>

	{#if !hidden}
		<div class="p-4 md:p-5 lg:p-6 pt-12 mt-8">
			<h4 class="font-bold text-sm tracking-wide text-secondary-ink -ms-6">
				<Button href={resolve('/classes')} variant="ghost" tone="secondary" class="font-bold">
					<ChevronLeft size={16} />
					{attempt.className ?? 'Class'}
				</Button>
			</h4>
			<h2 class="font-semibold text-2xl mt-2 flex items-start gap-3 min-w-0">
				<span class="text-2xl shrink-0">📋</span>
				<span class="break-words hyphens-auto overflow-hidden">Review Mode</span>
			</h2>
			<p class="text-foreground/60 mt-2 text-sm">
				Step through each question to see the correct answer and rationale.
			</p>

			<div class="mt-6">
				<div class="flex items-center gap-3 text-sm">
					<RadialProgress
						value={summary?.scorePct ?? 0}
						tone={summary?.passed ? 'success' : 'error'}
						thickness={3}
						label="Score"
						class="text-sm font-bold"
					>
						{summary?.scorePct ?? 0}%
					</RadialProgress>
					<div>
						<div class="font-semibold">{summary?.passed ? 'Passed' : 'Not Passed'}</div>
						<div class="text-xs text-foreground/50">
							{summary?.scoreEarned ?? 0}/{summary?.scorePossible ?? 0} points
						</div>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-3 gap-2 text-sm mt-5">
				<div class="surface-sm p-2 text-center">
					<div class="font-bold text-success-ink">{summary?.correctCount ?? 0}</div>
					<div class="text-[10px] text-foreground/40">Correct</div>
				</div>
				<div class="surface-sm p-2 text-center">
					<div class="font-bold text-error-ink">{summary?.incorrectCount ?? 0}</div>
					<div class="text-[10px] text-foreground/40">Wrong</div>
				</div>
				<div class="surface-sm p-2 text-center">
					<div class="font-bold">{summary?.unansweredCount ?? 0}</div>
					<div class="text-[10px] text-foreground/40">Skipped</div>
				</div>
			</div>
		</div>

		<div class="flex flex-col justify-center m-4 gap-3">
			<Button variant="soft" tone="neutral" size="sm" onclick={() => review.showSummary()}>
				<BarChart3 size={16} />
				Back to Summary
			</Button>
			<Button
				href={resolve('/classes/[classId]/tests/new', { classId })}
				variant="soft"
				tone="primary"
				size="sm"
			>
				<Plus size={16} />
				New Test
			</Button>

			<QuestionAttachmentsSidebar
				questionId={review.selectedItem?.questionId}
				showSolution={true}
				solutionOnlyBehavior="show"
				showSolutionBadges={true}
			/>
		</div>
	{:else}
		<div class="mt-16 justify-self-center flex flex-col items-center space-y-4 ms-1">
			<a
				class="group flex items-center justify-center font-bold text-secondary-foreground bg-secondary text-center w-full rounded-full transition-colors"
				href={resolve('/classes')}
			>
				<span class="group-hover:hidden">📋</span>
				<span class="hidden group-hover:inline-flex items-center justify-center"
					><ChevronLeft size={24} /></span
				>
			</a>
			<RadialProgress
				value={summary?.scorePct ?? 0}
				tone={summary?.passed ? 'success' : 'error'}
				thickness={3}
				label="Score"
				class="text-xs"
			>
				{summary?.scorePct ?? 0}%
			</RadialProgress>
			<Button
				variant="soft"
				tone="neutral"
				size="lg"
				shape="circle"
				onclick={() => review.showSummary()}
				title="Back to Summary"
			>
				<BarChart3 size={20} />
			</Button>
			<QuestionAttachmentsSidebar
				questionId={review.selectedItem?.questionId}
				showSolution={true}
				solutionOnlyBehavior="show"
				showSolutionBadges={true}
				collapsed={true}
			/>
		</div>
	{/if}
</div>
