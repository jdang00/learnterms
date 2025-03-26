<script>
	let { qm } = $props();
	import {
		Eye,
		ArrowLeft,
		ArrowRight,
		ListRestart,
		ChevronUp,
		Flag,
		BookmarkCheck,
		Shuffle
	} from 'lucide-svelte';
</script>

<div
	class="fixed bottom-0 left-0 w-full bg-base-100 shadow-lg border-t border-base-300 z-50 flex gap-2 items-center px-4 py-4 lg:hidden flex-wrap justify-center"
>
	<button class="btn btn-outline btn-sm" onclick={qm.clearSelectedAnswers}>Clear</button>
	<button class="btn btn-outline btn-success btn-sm" onclick={qm.checkAnswers}>Check</button>
	<button
		class="btn btn-warning btn-outline btn-sm"
		aria-label="flag question {qm.questionIds.indexOf(qm.currentlySelectedId)}"
		onclick={() => qm.toggleFlag()}
	>
		<Flag />
	</button>
	<div class="flex flex-row gap-2">
		<button
			class="btn btn-outline btn-sm"
			onclick={qm.goToPreviousQuestion}
			disabled={qm.questionIds.indexOf(qm.currentlySelectedId) === 0}
		>
			<ArrowLeft />
		</button>
		<button
			class="btn btn-outline btn-sm"
			onclick={qm.goToNextQuestion}
			disabled={qm.questionIds.indexOf(qm.currentlySelectedId) === qm.questions.length - 1}
		>
			<ArrowRight />
		</button>
	</div>
	<button class="btn modal-button lg:hidden btn-sm" onclick={() => (qm.isModalOpen = true)}
		><Eye /></button
	>

	<div class="dropdown dropdown-top dropdown-center">
		<div tabindex="0" role="button" class="btn btn-sm btn-soft btn-accent m-1">
			Options <ChevronUp />
		</div>
		<ul tabindex="-1" class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
			<li>
				<button class="text-error" onclick={() => (qm.isResetModalOpen = true)}
					><ListRestart size="18" />Reset</button
				>
			</li>
			<li>
				<button class="" onclick={qm.toggleShuffle}
					><Shuffle size="18" /> {qm.isShuffled ? 'Unshuffle' : 'Shuffle'}
				</button>
			</li>
			<li>
				<button onclick={qm.toggleSortByFlagged}
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

	<dialog class="modal max-w-full p-4" class:modal-open={qm.isModalOpen}>
		<div class="modal-box">
			<form method="dialog">
				<button
					class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
					onclick={() => (qm.isModalOpen = false)}>✕</button
				>
			</form>
			<h3 class="text-lg font-bold">Solution</h3>
			<p class="py-4">{qm.questionSolution}</p>
		</div>
	</dialog>
</div>
