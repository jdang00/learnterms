<script lang="ts">
    import { Eye, X } from 'lucide-svelte';
    type Option = { id: string; text: string };
    let {
        qs = $bindable(),
        currentlySelected,
        allowSolution = true,
        allowClear = true
    } = $props();

    function optionRole(text: string): 'prompt' | 'answer' | null {
        const normalized = String(text ?? '').trimStart().toLowerCase();
        if (normalized.startsWith('prompt:')) return 'prompt';
        if (normalized.startsWith('answer:')) return 'answer';
        return null;
    }

    const prompts = $derived(() => {
        const opts = (currentlySelected?.options || []) as Option[];
        return opts.filter((o) => optionRole(o.text) === 'prompt');
    });

    const answers = $derived(() => {
        const opts = (currentlySelected?.options || []) as Option[];
        return opts.filter((o) => optionRole(o.text) === 'answer');
    });

    let shuffledAnswers = $state<Option[]>([]);

    function fisherYates<T>(arr: T[]): T[] {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    $effect(() => {
        const answerOpts = answers();
        if (answerOpts.length <= 1) {
            shuffledAnswers = answerOpts;
            return;
        }

        const answersInPromptOrder = prompts()
            .map((prompt) => correctAnswerIdForPrompt(prompt.id))
            .map((answerId) => answerOpts.find((opt) => opt.id === answerId))
            .filter((opt): opt is Option => Boolean(opt));

        let out = fisherYates(answerOpts);

        const matchesOriginalOrder = out.length === answerOpts.length && out.every((o, i) => o.id === answerOpts[i].id);
        const matchesPromptOrder =
            answersInPromptOrder.length === out.length && out.every((o, i) => o.id === answersInPromptOrder[i].id);

        if ((matchesOriginalOrder || matchesPromptOrder) && out.length > 1) {
            out = [...out.slice(1), out[0]];
        }

        shuffledAnswers = out;
    });

    function getPromptLabel(text: string): string {
        return String(text).replace(/^\s*prompt:\s*/i, '');
    }

    function getUserSelectionForPrompt(promptId: string): string | undefined {
        const prefix = `${promptId}::`;
        const found = (qs.selectedAnswers || []).find((s: string) => s.startsWith(prefix));
        return found ? found.split('::')[1] : undefined;
    }

    function setUserSelection(promptId: string, answerId: string) {
        const prefix = `${promptId}::`;
        const others = (qs.selectedAnswers || []).filter((s: string) => !s.startsWith(prefix));
        const newSelection = `${promptId}::${answerId}`;
        qs.selectedAnswers = [...others, newSelection];
        qs.markCurrentQuestionInteracted?.();
        qs.scheduleSave?.();
    }

    function availableAnswersForPrompt(promptId: string): Option[] {
        const chosenIds = new Set(
            (qs.selectedAnswers || [])
                .filter((s: string) => !s.startsWith(`${promptId}::`))
                .map((s: string) => s.split('::')[1])
        );
        return shuffledAnswers.filter((a) => a.id === getUserSelectionForPrompt(promptId) || !chosenIds.has(a.id));
    }

    function correctAnswerIdForPrompt(promptId: string): string | undefined {
        const pair = (currentlySelected?.correctAnswers || []).find((cid: string) => String(cid).startsWith(`${promptId}::`));
        return pair ? String(pair).split('::')[1] : undefined;
    }

    function handleToggleSolution() {
        if (!allowSolution) return;
        qs.handleSolution();
    }

    function clearAllSelections() {
        qs.selectedAnswers = [];
        qs.scheduleSave?.();
    }

    function clearSelection(promptId: string) {
        const prefix = `${promptId}::`;
        qs.selectedAnswers = (qs.selectedAnswers || []).filter((s: string) => !s.startsWith(prefix));
        qs.scheduleSave?.();
    }
</script>

<div class="flex flex-col items-start gap-4 w-full p-4">
    <div class="flex flex-col gap-3 w-full">
        {#each prompts() as p (p.id)}
            <div class="flex items-center gap-3 w-full">
                <div class="flex-1">
                    <div
                        class="label rounded-full flex items-center border-2 border-base-300 bg-base-200 px-4 py-3"
                    >
                        <span class="font-semibold text-sm md:text-base tiptap-content">{getPromptLabel(p.text)}</span>
                    </div>
                </div>
                <div class="text-base-content/60" aria-hidden="true">→</div>
                <div class="flex-1 flex gap-2 items-center">
                    {#key p.id}
                    <div class="dropdown flex-1">
                        <label
                            tabindex="0"
                            class="btn select select-bordered w-full rounded-full {qs.showSolution && getUserSelectionForPrompt(p.id) === correctAnswerIdForPrompt(p.id) ? 'select-success' : ''} {qs.showSolution ? 'btn-disabled' : ''}"
                        >
                            {#if qs.showSolution && correctAnswerIdForPrompt(p.id)}
                                {@html (answers().find((a) => a.id === correctAnswerIdForPrompt(p.id))?.text || '').slice('answer:'.length)}
                            {:else if getUserSelectionForPrompt(p.id)}
                                {@html (shuffledAnswers.find(a => a.id === getUserSelectionForPrompt(p.id))?.text || '').slice('answer:'.length)}
                            {:else}
                                Select a choice
                            {/if}
                        </label>
                        <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-2xl w-full z-[1]">
                            {#each (qs.showSolution ? shuffledAnswers : availableAnswersForPrompt(p.id)) as a (a.id)}
                                <li>
                                    <button
                                        onclick={() => !qs.showSolution && setUserSelection(p.id, a.id)}
                                        class="btn btn-ghost justify-start w-full {qs.showSolution && a.id === correctAnswerIdForPrompt(p.id) ? 'bg-success text-success-content hover:bg-success hover:text-success-content' : ''}"
                                        class:pointer-events-none={qs.showSolution}
                                        disabled={qs.showSolution}
                                    >
                                        {@html a.text.slice('answer:'.length)}
                                    </button>
                                </li>
                            {/each}
                        </ul>
                    </div>
                    {#if !qs.showSolution && getUserSelectionForPrompt(p.id)}
                        <button
                            class="btn btn-ghost btn-sm btn-circle"
                            onclick={() => clearSelection(p.id)}
                            aria-label="clear selection"
                        >
                            <X size={16} />
                        </button>
                    {/if}
                    {/key}
                </div>
            </div>
        {/each}
    </div>

    <div class="mt-2 flex gap-2">
        {#if allowSolution}
            <button class="btn rounded-full" onclick={handleToggleSolution} aria-label="toggle rationale">
                <Eye />
            </button>
        {/if}
        {#if allowClear && !qs.showSolution && qs.selectedAnswers && qs.selectedAnswers.length > 0}
            <button class="btn rounded-full" onclick={clearAllSelections} aria-label="clear all selections">
                <X /> Clear all
            </button>
        {/if}
    </div>
</div>
