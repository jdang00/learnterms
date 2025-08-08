<script lang="ts">
    import { ArrowLeft, Eye, Flag } from 'lucide-svelte';
    import AnswerOptions from '$lib/components/AnswerOptions.svelte';
    import ResultBanner from '$lib/components/ResultBanner.svelte';
    import { Confetti } from 'svelte-confetti';

    type Option = { id: string; text: string };
    type Question = { stem: string; options: Option[]; correctAnswers: string[]; solution: string };

    const question: Question = {
        stem: 'Which of the following are true about ophthalmic fluoroquinolones?',
        options: [
            { id: 'A', text: 'They are used for severe infections' },
            { id: 'B', text: 'They have increased affinity for topoisomerase IV' },
            { id: 'C', text: 'They are used for viral infections' },
            { id: 'D', text: 'They are safe for children' },
            { id: 'E', text: 'They are used for fungal infections' }
        ],
        correctAnswers: ['A', 'B', 'D'],
        solution:
            'Ophthalmic fluoroquinolones are used for severe infections, have increased affinity for topoisomerase IV, and are safe for children.'
    };

    let flagged = $state(false);
    let showConfetti = $state(false);

    // Minimal quiz state to drive shared components
    let qs = $state({
        checkResult: '' as string,
        selectedAnswers: [] as string[],
        eliminatedAnswers: [] as string[],
        showSolution: false,
        scheduleSave: () => {},
        toggleOption(id: string) {
            if (qs.eliminatedAnswers.includes(id)) return;
            qs.selectedAnswers = qs.selectedAnswers.includes(id)
                ? qs.selectedAnswers.filter((x) => x !== id)
                : [...qs.selectedAnswers, id];
        },
        toggleElimination(id: string) {
            if (qs.eliminatedAnswers.includes(id)) {
                qs.eliminatedAnswers = qs.eliminatedAnswers.filter((x) => x !== id);
            } else {
                qs.eliminatedAnswers = [...qs.eliminatedAnswers, id];
                qs.selectedAnswers = qs.selectedAnswers.filter((x) => x !== id);
            }
        },
        isOptionSelected: (id: string) => qs.selectedAnswers.includes(id),
        isOptionEliminated: (id: string) => qs.eliminatedAnswers.includes(id),
        isCorrect: (id: string) => question.correctAnswers.includes(id)
    });

    function handleCheck() {
        const sortedCorrect = [...question.correctAnswers].sort();
        const sortedUser = [...qs.selectedAnswers].sort();
        qs.checkResult =
            sortedCorrect.length === sortedUser.length &&
            sortedCorrect.every((a, i) => a === sortedUser[i])
                ? 'Correct!'
                : 'Incorrect. Please try again.';
        if (qs.checkResult === 'Correct!') {
            showConfetti = true;
            setTimeout(() => (showConfetti = false), 1200);
        }
    }

    function handleClear() {
        qs.selectedAnswers = [];
        qs.eliminatedAnswers = [];
        qs.checkResult = '';
    }

    function handleFlag() {
        flagged = !flagged;
    }
</script>

<div class="hidden lg:block size-2/5 lg:border-r border-base-300">
    <button class="btn btn-ghost mt-4 ms-2">
        <ArrowLeft />Back
    </button>

    <div class="mx-8 mt-4">
        <p class="font-bold text-sm tracking-wide text-secondary mb-2">CHAPTER 2</p>
        <h1 class="text-3xl font-bold">Anti-Infectives</h1>
        <p class="text-base-content mt-2">
            Anti-infective medications, including antibiotics, antifungals, antivirals, and antiparasitics.
        </p>

        <div class="card bg-base-100 shadow-xl mt-12">
            <div class="card-body">
                <div class="flex flex-row justify-between border-b pb-2">
                    <h2 class="card-title">Solution</h2>
                    <button class="btn btn-ghost" onclick={() => (qs.showSolution = !qs.showSolution)} aria-label="toggle solution">
                        <Eye />
                    </button>
                </div>

                <p class="{qs.showSolution ? '' : 'blur'} mt-2">
                    {question.solution}
                </p>
            </div>
        </div>
    </div>
    <ResultBanner bind:qs />
    {#if showConfetti}
        <div class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-[65] w-0 h-0">
            <Confetti />
        </div>
    {/if}
    
</div>

<div class="container mx-auto lg:w-3/5 flex flex-col items-center">
    <div class="lg:hidden flex flex-row mt-2 items-center justify-between">
        <div class="flex-shrink-0 w-24"></div>
    </div>

    <div class="flex flex-row w-full lg:mt-6 mt-4 overflow-y-scroll">
        <div class="indicator">
            <button class="btn btn-circle btn-primary mx-2">1</button>
            {#each Array(5), i (i)}
                <button class="btn btn-circle btn-soft mx-2" disabled>{i + 2}</button>
            {/each}
        </div>
    </div>

    <div class="border-t border-base-300 w-full my-6"></div>

    <div class="mb-8 mt-2 w-full">
        <div class="mx-6 sm:mx-8">
            <div class="flex flex-row justify-between mb-4">
                <div class="flex flex-row flex-wrap items-end">
                    <h4 class="text-lg font-semibold">{question.stem}</h4>
                    <span class="text-base-content/70 font-medium text-xs ms-2 mb-1 sm:mt-0">Pick {question.correctAnswers.length}.</span>
                </div>
            </div>

            <AnswerOptions bind:qs currentlySelected={question} compact={true} />
        </div>

        <div class="flex flex-row justify-center mt-6 gap-3">
            <button class="btn btn-xs sm:btn-sm btn-outline" onclick={handleClear}>Clear</button>
            <div class="relative inline-block">
                <button class="btn btn-xs sm:btn-sm btn-success btn-soft" onclick={handleCheck}>Check</button>
                {#if showConfetti && qs.checkResult === 'Correct!'}
                    <div class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-[65] w-0 h-0">
                        <Confetti />
                    </div>
                {/if}
            </div>
            <button class="btn btn-xs sm:btn-sm {flagged ? 'btn-warning' : 'btn-warning btn-soft'}" onclick={handleFlag} aria-label="flag question">
                <Flag />
            </button>
        </div>
    </div>
</div>
