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
    let lastShuffleKey = $state('');

    function seededHash(input: string): number {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < input.length; i++) {
            h ^= input.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function mulberry32(seed: number) {
        return function () {
            let t = (seed += 0x6d2b79f5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function fisherYatesWithSeed<T>(arr: T[], seedInput: string): T[] {
        const a = [...arr];
        const rand = mulberry32(seededHash(seedInput));
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    $effect(() => {
        const answerOpts = answers();
        const promptOpts = prompts();
        const questionId = String((currentlySelected as { _id?: string } | null | undefined)?._id ?? '');
        const key = `${questionId}|${promptOpts.map((o) => o.id).join(',')}|${answerOpts.map((o) => o.id).join(',')}|${(currentlySelected?.correctAnswers || []).join(',')}`;

        if (key === lastShuffleKey) {
            return;
        }
        lastShuffleKey = key;

        if (answerOpts.length <= 1) {
            shuffledAnswers = answerOpts;
            return;
        }

        const answersInPromptOrder = promptOpts
            .map((prompt) => correctAnswerIdForPrompt(prompt.id))
            .map((answerId) => answerOpts.find((opt) => opt.id === answerId))
            .filter((opt): opt is Option => Boolean(opt));

        let out = fisherYatesWithSeed(answerOpts, key);

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

    function splitAnswerToken(answerToken: string): string[] {
        return String(answerToken ?? '')
            .split('|')
            .map((part) => part.trim())
            .filter((part) => part.length > 0);
    }

    function parsePairToken(value: string): { promptToken: string; answerToken: string } | null {
        const raw = String(value ?? '').trim();
        const sep = raw.indexOf('::');
        if (sep <= 0) return null;
        const promptToken = raw.slice(0, sep).trim();
        const answerToken = raw.slice(sep + 2).trim();
        if (!promptToken || !answerToken) return null;
        return { promptToken, answerToken };
    }

    function resolveOptionTokenToId(token: string): string | null {
        const raw = String(token ?? '').trim();
        if (!raw) return null;

        const opts = (currentlySelected?.options || []) as Option[];
        if (opts.some((o) => o.id === raw)) return raw;

        if (/^\d+$/.test(raw)) {
            const index = Number(raw);
            if (Number.isInteger(index) && index >= 0 && index < opts.length) {
                return opts[index]?.id ?? null;
            }
        }

        return null;
    }

    function normalizeAnswerText(text: string): string {
        return String(text ?? '')
            .replace(/^\s*answer:\s*/i, '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
    }

    function directCorrectAnswerIdsForPrompt(promptId: string): string[] {
        const parsedPair = ((currentlySelected?.correctAnswers || []) as string[])
            .map((raw) => parsePairToken(raw))
            .find((pair): pair is { promptToken: string; answerToken: string } => {
                if (!pair) return false;
                const resolvedPromptId = resolveOptionTokenToId(pair.promptToken);
                return resolvedPromptId === promptId;
            });
        if (!parsedPair) return [];
        const validAnswerIds = new Set(answers().map((a) => a.id));
        return splitAnswerToken(parsedPair.answerToken)
            .map((token) => resolveOptionTokenToId(token))
            .filter((id): id is string => Boolean(id))
            .filter((id) => validAnswerIds.has(id));
    }

    function acceptedAnswerIdsForPrompt(promptId: string): Set<string> {
        const direct = directCorrectAnswerIdsForPrompt(promptId);
        const accepted = new Set<string>(direct);
        if (direct.length === 0) return accepted;

        const answerKeyById = new Map<string, string>();
        for (const answer of answers()) {
            answerKeyById.set(answer.id, normalizeAnswerText(answer.text));
        }

        const keys = new Set(direct.map((id) => answerKeyById.get(id)).filter((key): key is string => Boolean(key)));
        for (const [answerId, answerKey] of answerKeyById.entries()) {
            if (keys.has(answerKey)) accepted.add(answerId);
        }

        return accepted;
    }

    function correctAnswerIdForPrompt(promptId: string): string | undefined {
        const direct = directCorrectAnswerIdsForPrompt(promptId);
        if (direct.length > 0) return direct[0];
        const accepted = Array.from(acceptedAnswerIdsForPrompt(promptId));
        return accepted.length > 0 ? accepted[0] : undefined;
    }

    function isSelectionCorrectForPrompt(promptId: string): boolean {
        const selectedId = getUserSelectionForPrompt(promptId);
        if (!selectedId) return false;
        return acceptedAnswerIdsForPrompt(promptId).has(selectedId);
    }

    function isAcceptedAnswerForPrompt(promptId: string, answerId: string): boolean {
        return acceptedAnswerIdsForPrompt(promptId).has(answerId);
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
                            class="btn select select-bordered w-full rounded-full {qs.showSolution && isSelectionCorrectForPrompt(p.id) ? 'select-success' : ''} {qs.showSolution ? 'btn-disabled' : ''}"
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
                                        class="btn btn-ghost justify-start w-full {qs.showSolution && isAcceptedAnswerForPrompt(p.id, a.id) ? 'bg-success text-success-content hover:bg-success hover:text-success-content' : ''}"
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
