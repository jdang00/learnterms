<script lang="ts">
    let { qs = $bindable(), currentlySelected } = $props();
    import { Flag, Shuffle, ArrowRight, ArrowLeft } from 'lucide-svelte';
    import { Confetti } from 'svelte-confetti';
    let showConfetti = $state(false);

    function handleCheck() {
        if (currentlySelected) {
            qs.checkAnswer(currentlySelected.correctAnswers, qs.selectedAnswers);
            if (qs.checkResult === 'Correct!') {
                showConfetti = true;
                setTimeout(() => (showConfetti = false), 1200);
            }
        }
        qs.scheduleSave?.();
    }

	async function handleClear() {
		qs.selectedAnswers = [];
		qs.eliminatedAnswers = [];
		qs.checkResult = '';
    qs.scheduleSave?.();
	}

	async function handleFlag() {
		qs.toggleFlag();
    qs.scheduleSave?.();
	}

	async function handleNext() {
		await qs.goToNextQuestion();
    qs.scheduleSave?.();
	}

	async function handlePrevious() {
		await qs.goToPreviousQuestion();
    qs.scheduleSave?.();
	}

	function handleShuffle() {
		qs.toggleShuffle();
    qs.scheduleSave?.();
	}
</script>

<div
    class="hidden md:flex fixed left-1/2 -translate-x-1/2 z-[60]
           items-center gap-2 px-4 md:px-5 lg:px-6 py-4 md:py-5 rounded-full
            backdrop-blur-md border border-base-300 shadow-xl bottom-8 md:bottom-10"
>
    <button class="btn btn-sm btn-outline" onclick={handleClear}>Clear</button>
    <div class="relative inline-block">
        <button class="btn btn-sm btn-success btn-soft" onclick={handleCheck}>Check</button>
        {#if showConfetti && qs.checkResult === 'Correct!'}
            <div class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-[65] w-0 h-0">
                <Confetti />
            </div>
        {/if}
    </div>
    <button
        class="btn btn-sm btn-warning btn-soft"
        onclick={handleFlag}
        aria-label="flag question"
    >
        <Flag />
    </button>
    <button class="btn btn-sm btn-secondary" onclick={handleShuffle}>
        <Shuffle size="18" />
        {qs.isShuffled ? 'Unshuffle' : 'Shuffle'}
    </button>

    <div class="divider divider-horizontal mx-1"></div>

    <button
        class="btn btn-sm btn-outline { !qs.canGoPrevious() ? 'btn-disabled' : '' }"
        onclick={handlePrevious}
        disabled={!qs.canGoPrevious()}
    >
        <ArrowLeft />
    </button>

    <button
        class="btn btn-sm btn-outline { !qs.canGoNext() ? 'btn-disabled' : '' }"
        onclick={handleNext}
        disabled={!qs.canGoNext()}
    >
        <ArrowRight />
    </button>
</div>

<!-- banner is rendered at page level via ResultBanner to avoid overlap with MobileMenu -->


