<script lang="ts">
	import { Eye, X } from 'lucide-svelte';
	type Option = { id: string; text: string };
	let { qs = $bindable(), currentlySelected, allowSolution = true, allowClear = true } = $props();

	function optionRole(text: string): 'prompt' | 'answer' | null {
		const normalized = String(text ?? '')
			.trimStart()
			.toLowerCase();
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
		const questionId = String(
			(currentlySelected as { _id?: string } | null | undefined)?._id ?? ''
		);
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

		const matchesOriginalOrder =
			out.length === answerOpts.length && out.every((o, i) => o.id === answerOpts[i].id);
		const matchesPromptOrder =
			answersInPromptOrder.length === out.length &&
			out.every((o, i) => o.id === answersInPromptOrder[i].id);

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

	function handleSelectionChange(promptId: string, event: Event) {
		const answerId = (event.currentTarget as HTMLSelectElement).value;
		if (answerId) {
			setUserSelection(promptId, answerId);
		} else {
			clearSelection(promptId);
		}
	}

	function availableAnswersForPrompt(promptId: string): Option[] {
		const chosenIds = new Set(
			(qs.selectedAnswers || [])
				.filter((s: string) => !s.startsWith(`${promptId}::`))
				.map((s: string) => s.split('::')[1])
		);
		return shuffledAnswers.filter(
			(a) => a.id === getUserSelectionForPrompt(promptId) || !chosenIds.has(a.id)
		);
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

	function getAnswerLabel(text: string): string {
		return String(text).replace(/^\s*answer:\s*/i, '');
	}

	const promptAnswerLookup = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const promptToDirectAnswerIds = new Map<string, string[]>();
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const promptToAcceptedAnswerIds = new Map<string, Set<string>>();
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const promptToCanonicalCorrectId = new Map<string, string>();
		const answerOptions = answers();
		const validAnswerIds = new Set(answerOptions.map((answer) => answer.id));
		const answerKeyById = new Map(
			answerOptions.map((answer) => [answer.id, normalizeAnswerText(answer.text)])
		);

		for (const raw of (currentlySelected?.correctAnswers || []) as string[]) {
			const parsedPair = parsePairToken(raw);
			if (!parsedPair) continue;

			const promptId = resolveOptionTokenToId(parsedPair.promptToken);
			if (!promptId || promptToDirectAnswerIds.has(promptId)) continue;

			const directAnswerIds = splitAnswerToken(parsedPair.answerToken)
				.map((token) => resolveOptionTokenToId(token))
				.filter((id): id is string => Boolean(id))
				.filter((id) => validAnswerIds.has(id));

			promptToDirectAnswerIds.set(promptId, directAnswerIds);

			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const acceptedAnswerIds = new Set<string>(directAnswerIds);
			if (directAnswerIds.length > 0) {
				const acceptedKeys = new Set(
					directAnswerIds
						.map((id) => answerKeyById.get(id))
						.filter((key): key is string => Boolean(key))
				);
				for (const [answerId, answerKey] of answerKeyById.entries()) {
					if (acceptedKeys.has(answerKey)) {
						acceptedAnswerIds.add(answerId);
					}
				}
			}

			promptToAcceptedAnswerIds.set(promptId, acceptedAnswerIds);
			const canonicalId = directAnswerIds[0] ?? Array.from(acceptedAnswerIds)[0];
			if (canonicalId) {
				promptToCanonicalCorrectId.set(promptId, canonicalId);
			}
		}

		return {
			promptToDirectAnswerIds,
			promptToAcceptedAnswerIds,
			promptToCanonicalCorrectId
		};
	});

	function acceptedAnswerIdsForPrompt(promptId: string): Set<string> {
		return promptAnswerLookup.promptToAcceptedAnswerIds.get(promptId) ?? new Set<string>();
	}

	function correctAnswerIdForPrompt(promptId: string): string | undefined {
		return promptAnswerLookup.promptToCanonicalCorrectId.get(promptId);
	}

	function isSelectionCorrectForPrompt(promptId: string): boolean {
		const selectedId = getUserSelectionForPrompt(promptId);
		if (!selectedId) return false;
		return acceptedAnswerIdsForPrompt(promptId).has(selectedId);
	}

	function solutionSelectClass(promptId: string): string {
		if (!qs.showSolution || !getUserSelectionForPrompt(promptId)) return '';
		return isSelectionCorrectForPrompt(promptId) ? 'select-success' : 'select-error';
	}

	function correctAnswerLabelForPrompt(promptId: string): string {
		const correctAnswerId = correctAnswerIdForPrompt(promptId);
		if (!correctAnswerId) return '';
		return getAnswerLabel(answers().find((answer) => answer.id === correctAnswerId)?.text ?? '');
	}

	function answerOptionLabel(promptId: string, answer: Option): string {
		const label = getAnswerLabel(answer.text);
		return qs.showSolution && answer.id === correctAnswerIdForPrompt(promptId)
			? `${label} (correct)`
			: label;
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
						<span class="font-semibold text-sm md:text-base tiptap-content"
							>{getPromptLabel(p.text)}</span
						>
					</div>
				</div>
				<div class="text-base-content/60" aria-hidden="true">→</div>
				<div class="flex-1 flex gap-2 items-center">
					<div class="flex-1">
						<select
							class="select select-bordered w-full rounded-full {solutionSelectClass(p.id)}"
							value={getUserSelectionForPrompt(p.id) ?? ''}
							onchange={(event) => handleSelectionChange(p.id, event)}
							disabled={qs.showSolution}
							aria-label={`Answer for ${getPromptLabel(p.text) || p.id}`}
						>
							<option value="">Select a choice</option>
							{#each qs.showSolution ? shuffledAnswers : availableAnswersForPrompt(p.id) as a (a.id)}
								<option
									value={a.id}
									data-correct={a.id === correctAnswerIdForPrompt(p.id) ? 'true' : undefined}
								>
									{answerOptionLabel(p.id, a)}
								</option>
							{/each}
						</select>
						{#if qs.showSolution && correctAnswerLabelForPrompt(p.id)}
							<p
								class="mt-1 px-3 text-xs {isSelectionCorrectForPrompt(p.id)
									? 'text-success'
									: 'text-error'}"
							>
								Correct: {correctAnswerLabelForPrompt(p.id)}
							</p>
						{/if}
					</div>
					{#if !qs.showSolution && getUserSelectionForPrompt(p.id)}
						<button
							type="button"
							class="btn btn-ghost btn-sm btn-circle"
							onclick={() => clearSelection(p.id)}
							aria-label={`Clear selection for ${getPromptLabel(p.text) || p.id}`}
						>
							<X size={16} />
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<div class="mt-2 flex gap-2">
		{#if allowSolution}
			<button
				type="button"
				class="btn rounded-full"
				onclick={handleToggleSolution}
				aria-pressed={qs.showSolution}
				aria-label={qs.showSolution ? 'Hide rationale' : 'Show rationale'}
				title={qs.showSolution ? 'Hide rationale' : 'Show rationale'}
			>
				<Eye />
			</button>
		{/if}
		{#if allowClear && !qs.showSolution && qs.selectedAnswers && qs.selectedAnswers.length > 0}
			<button
				type="button"
				class="btn rounded-full"
				onclick={clearAllSelections}
				aria-label="clear all selections"
			>
				<X /> Clear all
			</button>
		{/if}
	</div>
</div>
