<script>
	let { qs = $bindable(), currentlySelected } = $props();
	let isSettingsModalOpen = $state(false);
	import {
		Eye,
		ArrowLeft,
		ArrowRight,
		ListRestart,
		ChevronUp,
		Flag,
		BookmarkCheck,
		Shuffle,
		Settings,
		Check,
		ArrowUpWideNarrow
	} from 'lucide-svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';

	async function handleClear() {
		qs.selectedAnswers = [];
		qs.eliminatedAnswers = [];
		qs.checkResult = '';

		if (qs.saveProgressFunction) {
			await qs.saveProgressFunction();
		}
	}

	async function handleCheck() {
		if (currentlySelected) {
			qs.checkAnswer(currentlySelected.correctAnswers, qs.selectedAnswers);
		}
	}

	async function handleFlag() {
		qs.toggleFlag();

		if (qs.saveProgressFunction) {
			await qs.saveProgressFunction();
		}
	}

	async function handleNext() {
		await qs.goToNextQuestion();
	}

	async function handlePrevious() {
		await qs.goToPreviousQuestion();
	}

	function handleShuffle() {
		qs.toggleShuffle();
	}

	function handleShowFlagged() {
		qs.toggleSortByFlagged();
	}

	function handleShowIncomplete() {
		qs.toggleShowIncomplete();
	}
</script>

<div
	class="fixed bottom-0 left-0 w-full bg-base-100 shadow-lg border-t border-base-300 z-50 flex gap-2 items-center px-4 py-4 lg:hidden flex-wrap justify-center"
>
	<div class="dropdown dropdown-top">
		<div tabindex="0" role="button" class="btn btn-sm btn-soft btn-accent m-1">
			<ArrowUpWideNarrow />
		</div>
		<ul tabindex="-1" class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
			<li>
				<button class="text-error" onclick={() => (qs.isResetModalOpen = true)}
					><ListRestart size="18" />Reset</button
				>
			</li>
			<li>
				<button class="" onclick={handleShuffle}
					><Shuffle size="18" /> {qs.isShuffled ? 'Unshuffle' : 'Shuffle'}
				</button>
			</li>
			<li>
				<button onclick={handleShowFlagged}
					><Flag size="16" />{qs.showFlagged ? 'Show All' : 'Show Flagged'}</button
				>
			</li>
			<li>
				<button onclick={handleShowIncomplete}>
					<BookmarkCheck size="16" />
					{qs.showIncomplete ? 'Show All' : 'Show Incomplete'}
				</button>
			</li>
			<li>
				<button onclick={() => (isSettingsModalOpen = true)}>
					<Settings size="16" />Settings
				</button>
			</li>
		</ul>
	</div>
	<button class="btn btn-outline btn-sm" onclick={handleClear}>Clear</button>
	<button class="btn btn-outline btn-success btn-sm" onclick={handleCheck}><Check /></button>
	<button
		class="btn btn-warning btn-outline btn-sm"
		aria-label="flag question"
		onclick={handleFlag}
	>
		<Flag />
	</button>

	<button class="btn modal-button lg:hidden btn-sm" onclick={() => (qs.isModalOpen = true)}
		><Eye /></button
	>

	<div class="flex flex-row gap-2">
		<button class="btn btn-outline btn-sm" onclick={handlePrevious} disabled={!qs.canGoPrevious()}>
			<ArrowLeft />
		</button>
		<button class="btn btn-outline btn-sm" onclick={handleNext} disabled={!qs.canGoNext()}>
			<ArrowRight />
		</button>
	</div>

	<dialog class="modal max-w-full p-4" class:modal-open={qs.isModalOpen}>
		<div class="modal-box">
			<form method="dialog">
				<button
					class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
					onclick={() => (qs.isModalOpen = false)}>✕</button
				>
			</form>
			<h3 class="text-lg font-bold">Solution</h3>
			{#if typeof currentlySelected.explanation === 'string' && currentlySelected.explanation.trim().length > 0}
				<p class="py-4">{currentlySelected.explanation}</p>
			{/if}
		</div>
	</dialog>

	<SettingsModal bind:qs bind:isOpen={isSettingsModalOpen} />
</div>
