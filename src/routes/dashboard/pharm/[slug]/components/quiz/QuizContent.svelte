<script>
	let { qm = $bindable() } = $props();
	import { ArrowDownNarrowWide, Flag, BookmarkCheck } from 'lucide-svelte';
	import AnswerOptions from './AnswerOptions.svelte';
	import ActionButtons from './ActionButtons.svelte';
</script>

{#if qm.questionMap[qm.currentlySelectedId]}
	<div class="w-full mb-8 mt-2 overflow-y-auto max-h-[70vh] pb-16 sm:pb-0">
		<div class="mx-4 sm:mx-6">
			<div class="flex flex-row justify-between">
				<div class="font-bold text-lg sm:text-xl mb-4 self-center">
					{qm.questionMap[qm.currentlySelectedId].question_data.question}
					<span class="text-base-content/50 font-medium text-sm ms-2"
						>Pick {qm.correctAnswersCount}.</span
					>
				</div>

				<div class="dropdown dropdown-end lg:block hidden">
					<div tabindex="0" role="button" class="btn btn-soft btn-accent m-1 btn-circle">
						<ArrowDownNarrowWide />
					</div>
					<ul
						tabindex="-1"
						class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
					>
						<li>
							<button onclick={() => qm.toggleSortByFlagged()}
								><Flag size="16" />{qm.fm.showFlagged ? 'Show All' : 'Show Flagged'}</button
							>
						</li>
						<li>
							<button onclick={qm.toggleShowIncomplete}>
								<BookmarkCheck size="16" />
								{qm.showIncomplete ? 'Show All' : 'Show Incomplete'}
							</button>
						</li>
					</ul>
				</div>
			</div>

			{#key qm.refreshKey}
				<div class="flex flex-col justify-start mt-4 space-y-4">
					{#each qm.questionAnswerStates as option, index (index)}
						<AnswerOptions bind:qm {option} {index} />
					{/each}
				</div>
			{/key}
		</div>
		<ActionButtons {qm} />
	</div>
{/if}
