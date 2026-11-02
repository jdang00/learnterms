<script lang="ts">
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import { Button } from '#lib/components/ui/button/index.js';
	import {
		answerLetter,
		clearMatch,
		matchingLabel,
		matchingSides,
		matchResults,
		selectionsByPrompt,
		setMatch,
		shuffledAnswers,
		type MatchingQuestion
	} from '#lib/utils/matching.js';
	import MatchingBoard from './MatchingBoard.svelte';
	import MatchPicker, { type PickerAnswer } from './MatchPicker.svelte';
	import MatchResultCell from './MatchResultCell.svelte';

	type MatchingState = {
		selectedAnswers: string[];
		showSolution: boolean;
		handleSolution: () => void;
		markCurrentQuestionInteracted?: () => void;
		scheduleSave?: () => void;
	};

	let {
		qs,
		currentlySelected,
		allowSolution = true
	}: { qs: MatchingState; currentlySelected: MatchingQuestion; allowSolution?: boolean } = $props();

	const prompts = $derived(matchingSides(currentlySelected.options).prompts);
	const bank = $derived(
		shuffledAnswers(currentlySelected).map((answer, i) => ({
			id: answer.id,
			label: matchingLabel(answer.text),
			letter: answerLetter(i)
		}))
	);
	const letterById = $derived(new Map(bank.map((answer) => [answer.id, answer.letter])));
	const chosen = $derived(selectionsByPrompt(currentlySelected, qs.selectedAnswers));
	const promptLabels = $derived(
		new Map(prompts.map((prompt) => [prompt.id, matchingLabel(prompt.text)]))
	);
	const usedIds = $derived(new Set(chosen.values()));
	const pickerAnswers = $derived<PickerAnswer[]>(
		bank.map((answer) => ({ ...answer, used: usedIds.has(answer.id) }))
	);
	const results = $derived(
		qs.showSolution ? matchResults(currentlySelected, qs.selectedAnswers) : []
	);
	const rows = $derived(
		qs.showSolution ? results : [...promptLabels].map(([id, prompt]) => ({ id, prompt }))
	);
	const resultById = $derived(new Map(results.map((result) => [result.id, result])));
	const correctCount = $derived(results.filter((result) => result.status === 'correct').length);

	function update(next: string[]) {
		qs.selectedAnswers = next;
		qs.markCurrentQuestionInteracted?.();
		qs.scheduleSave?.();
	}
</script>

<div class="flex w-full flex-col gap-4 p-2 sm:p-4">
	<MatchingBoard {rows}>
		{#snippet answer(row)}
			{@const result = resultById.get(row.id)}
			{#if result}
				<MatchResultCell
					chosen={result.chosen}
					correct={result.correct}
					status={result.status}
					chosenLetter={letterById.get(result.chosenId ?? '')}
					correctLetter={letterById.get(result.correctId ?? '')}
				/>
			{:else}
				<MatchPicker
					prompt={row.prompt}
					answers={pickerAnswers}
					value={chosen.get(row.id)}
					onSelect={(answerId) => update(setMatch(qs.selectedAnswers ?? [], row.id, answerId))}
					onClear={() => update(clearMatch(qs.selectedAnswers ?? [], row.id))}
				/>
			{/if}
		{/snippet}
	</MatchingBoard>

	<div class="flex min-h-9 items-center gap-3">
		{#if allowSolution}
			<Button
				variant="soft"
				tone="neutral"
				onclick={() => qs.handleSolution()}
				aria-pressed={qs.showSolution}
				aria-label={qs.showSolution ? 'Hide answers' : 'Show answers'}
				tooltip={qs.showSolution ? 'Hide answers' : 'Show answers'}
			>
				{#if qs.showSolution}<EyeOff />{:else}<Eye />{/if}
			</Button>
		{/if}
		<p class="text-xs font-medium tabular-nums text-muted-foreground" aria-live="polite">
			{#if qs.showSolution}
				{correctCount} of {prompts.length} correct
			{:else}
				{chosen.size} of {prompts.length} matched
			{/if}
		</p>
	</div>
</div>
