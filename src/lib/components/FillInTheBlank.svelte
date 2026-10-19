<script lang="ts">
	import type { Snippet } from 'svelte';
	import HighlightedStem from './HighlightedStem.svelte';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import { Eye } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { tick } from 'svelte';
	import { getQuizCommands } from './quiz-dock/commands.svelte';
	type Option = { id: string; text: string };
	let {
		qs = $bindable(),
		currentlySelected,
		submitOnly = false,
		allowSolution = true,
		showAnswerPanel = true,
		showRevealHint = true,
		highlightEnabled = undefined,
		highlightResetVersion = 0,
		belowStem = undefined as Snippet | undefined
	} = $props();
	let inputText: string = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);
	const quizCommands = getQuizCommands();

	const correctRaw = $derived(() => {
		const first = (currentlySelected?.correctAnswers && currentlySelected.correctAnswers[0]) || '';
		const opts = (currentlySelected?.options || []) as Option[];
		const fromOption = opts.find((o) => o.id === first)?.text;
		return String(fromOption ?? first ?? '');
	});

	const displayAnswer = $derived(() => {
		const raw = correctRaw();
		const [before] = String(raw || '').split(' | flags=');
		const firstColon = before.indexOf(':');
		if (firstColon > -1) {
			const maybe = before.slice(0, firstColon);
			if (['exact', 'exact_cs', 'contains', 'regex'].includes(maybe)) {
				return before.slice(firstColon + 1);
			}
		}
		return before;
	});

	function decodeFitb(text: string): string {
		const [before] = String(text || '').split(' | flags=');
		const firstColon = before.indexOf(':');
		if (firstColon > -1) {
			const maybe = before.slice(0, firstColon);
			if (['exact', 'exact_cs', 'contains', 'regex'].includes(maybe)) {
				return before.slice(firstColon + 1);
			}
		}
		return before;
	}

	const alternateAnswers = $derived(() => {
		const answers = (currentlySelected?.correctAnswers || []) as Array<string>;
		const opts = (currentlySelected?.options || []) as Option[];
		const texts: string[] = answers.map((a) => {
			const fromOption = opts.find((o) => o.id === a)?.text;
			return String(fromOption ?? a ?? '');
		});
		const decoded = texts.map((t) => decodeFitb(t)).filter((t) => t.length > 0);
		if (decoded.length <= 1) return [] as string[];
		return decoded.slice(1);
	});

	$effect(() => {
		inputText = qs.selectedAnswers && qs.selectedAnswers[0] ? qs.selectedAnswers[0] : '';
		// On touch screens focusing would pop the keyboard over the question on every navigation.
		if (matchMedia('(pointer: fine)').matches) tick().then(() => inputEl?.focus());
	});

	function handleEnter(source: 'keyboard' | 'button') {
		if (submitOnly) {
			qs.selectedAnswers = inputText ? [inputText] : [];
			if (qs.selectedAnswers.length > 0) {
				qs.markCurrentQuestionInteracted?.();
			}
			qs.scheduleSave?.();
			return;
		}
		if (quizCommands) {
			void quizCommands.get('check')?.run(source);
			return;
		}
		qs.checkFillInTheBlank(inputText ?? '', currentlySelected);
	}

	function handleToggleSolution() {
		if (!allowSolution) return;
		qs.handleSolution();
	}
</script>

<div class="flex flex-col items-center p-4 w-full">
	<div class="text-base sm:text-lg mb-4 text-left font-medium tiptap-content whitespace-pre-line">
		{#if highlightEnabled !== undefined}
			<HighlightedStem
				question={currentlySelected}
				enabled={highlightEnabled}
				resetVersion={highlightResetVersion}
			/>
		{:else}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html sanitizeHtml(currentlySelected.stem)}
		{/if}
	</div>
	{#if belowStem}<div class="w-full">{@render belowStem()}</div>{/if}
	<div class="flex w-full max-w-sm items-center mt-4 mb-6">
		<Input
			type="text"
			placeholder="Type here"
			enterkeyhint="done"
			autocomplete="off"
			autocapitalize="off"
			autocorrect="off"
			spellcheck="false"
			class="flex-1"
			value={inputText}
			oninput={(e) => {
				inputText = (e.target as HTMLInputElement).value;
				qs.selectedAnswers = inputText ? [inputText] : [];
				if (qs.selectedAnswers.length > 0) {
					qs.markCurrentQuestionInteracted?.();
				}
				qs.scheduleSave?.();
			}}
			onkeydown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					handleEnter('keyboard');
				} else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
					e.stopPropagation();
				}
			}}
			disabled={qs.showSolution}
			bind:ref={inputEl}
		/>
		<Button
			class="ms-2"
			onclick={() => handleEnter('button')}
			disabled={qs.showSolution || !inputText.trim()}>{submitOnly ? 'Save' : 'Enter'}</Button
		>
	</div>

	{#if showAnswerPanel}
		<Card.Root
			class="mt-6 w-72 gap-0 rounded-2xl border-foreground/10 bg-background shadow-md sm:w-80"
		>
			<Card.Content class="gap-2">
				<h3 class="text-lg font-semibold mb-2 {qs.showSolution ? '' : 'blur-xs'}">
					{displayAnswer()}
				</h3>
				{#if qs.showSolution && alternateAnswers().length > 0}
					<div class="mt-2">
						<p class="text-sm opacity-70">Alternate answers:</p>
						<ul class="mt-1 list-disc list-inside text-sm opacity-80">
							{#each alternateAnswers() as a, i (i)}
								<li>{a}</li>
							{/each}
						</ul>
					</div>
				{/if}
				{#if allowSolution}
					<Button
						variant="soft"
						tone="neutral"
						onclick={handleToggleSolution}
						aria-label="toggle rationale"
					>
						<Eye />
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	{#if showRevealHint}
		<p class="text-sm text-foreground/70 mt-6">Press tab to reveal term.</p>
	{/if}
</div>
