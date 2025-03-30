<script>
	let { qm = $bindable() } = $props();
	import { Flag, Shuffle, ArrowRight, ArrowLeft } from 'lucide-svelte';
</script>

<div class=" flex-row justify-center mt-8 gap-4 hidden lg:flex">
	<button class="btn btn-outline" onclick={qm.clearSelectedAnswers}>Clear</button>
	<button class="btn btn-soft btn-success" onclick={qm.checkAnswers}>Check</button>
	<button
		class="btn btn-warning btn-soft"
		aria-label="flag question {qm.questionIds.indexOf(qm.currentlySelectedId)}"
		onclick={() => qm.toggleFlag()}
	>
		<Flag />
	</button>
	<button class="btn btn-secondary" onclick={qm.toggleShuffle}
		><Shuffle size="18" /> {qm.isShuffled ? 'Unshuffle' : 'Shuffle'}
	</button>

	<button
		class="btn btn-outline"
		onclick={qm.goToPreviousQuestion}
		disabled={qm.questionIds.indexOf(qm.currentlySelectedId) === 0}
	>
		<ArrowLeft />
	</button>

	<button
		class="btn btn-outline"
		onclick={qm.goToNextQuestion}
		disabled={qm.questionIds.indexOf(qm.currentlySelectedId) === qm.questions.length - 1}
	>
		<ArrowRight />
	</button>
</div>

{#if qm.checkResult !== null}
	<div
		class="my-4 text-center font-bold {qm.checkResult === 'Correct!'
			? 'text-green-500'
			: 'text-red-500'}"
	>
		{qm.checkResult}
	</div>
{/if}
