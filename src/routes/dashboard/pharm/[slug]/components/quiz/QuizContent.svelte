<script>
	let { qm = $bindable(), class: additionalClass = '' } = $props();
	import { ArrowDownNarrowWide, Flag, BookmarkCheck } from 'lucide-svelte';
	import AnswerOptions from './AnswerOptions.svelte';
	import ActionButtons from './ActionButtons.svelte';
</script>

{#if qm.questionMap[qm.currentlySelectedId]}
	<div class="w-full overflow-y-auto flex-grow flex flex-col {additionalClass}">
		<div>
			<div class="flex flex-row justify-between mb-2 lg:mb-4">
				<div class="font-bold text-md sm:text-lg lg:text-xl self-center pr-2">
					{qm.questionMap[qm.currentlySelectedId].question_data.question}
					<span
						class="text-base-content/70 font-medium text-xs sm:text-sm ms-1 sm:ms-2 block sm:inline mt-1 sm:mt-0"
					>
						Pick {qm.correctAnswersCount}.
					</span>
				</div>
				<div class="dropdown dropdown-end lg:block hidden">
					<div tabindex="0" role="button" class="btn btn-soft btn-accent m-1 btn-circle">
						<ArrowDownNarrowWide />
					</div>
					<ul
						tabindex="-1"
						class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-sm"
					>
						<li>
							<button onclick={() => qm.toggleSortByFlagged()}>
								<Flag size="16" />
								{qm.fm.showFlagged ? 'Show All' : 'Show Flagged'}
							</button>
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
				<div class="flex flex-col justify-start space-y-2 sm:space-y-3 lg:space-y-4">
					{#each qm.questionAnswerStates as option, index (index)}
						<AnswerOptions bind:qm {option} {index} />
					{/each}
				</div>
			{/key}
		</div>
		<ActionButtons {qm} />
	</div>
{/if}
