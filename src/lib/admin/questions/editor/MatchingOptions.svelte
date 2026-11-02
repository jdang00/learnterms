<script lang="ts">
	import { tick } from 'svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import type { QuestionEditorState } from './questionEditor.svelte';

	let { form }: { form: QuestionEditorState } = $props();
	let root = $state<HTMLElement | null>(null);

	type Side = 'prompt' | 'answer';
	const FIELD = 'min-h-10 rounded-3xl border-2 py-2.5 ps-4 pe-10 text-sm leading-snug';
	const SLOT =
		'flex min-h-10 w-full items-center justify-center rounded-3xl border-2 border-dashed border-border px-4 text-xs text-foreground/40 italic transition-colors hover:border-primary/40 hover:text-foreground/60';

	const pairCount = $derived(form.matchingRows.filter((row) => row.prompt && row.answer).length);
	const distractorCount = $derived(
		form.matchingRows.filter((row) => row.prompt === null && row.answer !== null).length
	);
	const summary = $derived(
		[
			`${pairCount} ${pairCount === 1 ? 'pair' : 'pairs'}`,
			distractorCount &&
				`${distractorCount} ${distractorCount === 1 ? 'distractor' : 'distractors'}`
		]
			.filter(Boolean)
			.join(' · ')
	);

	async function focusField(side: Side, index: number) {
		await tick();
		root?.querySelector<HTMLTextAreaElement>(`[data-row-${side}="${index}"]`)?.focus();
	}

	// Clicking an empty slot gives that row the missing side.
	function fillSlot(index: number, side: Side) {
		form.matchingRows[index][side] = '';
		form.touch();
		focusField(side, index);
	}

	// Enter walks prompt → answer → next row (adding a pair at the end), so long sets type straight through.
	function onKey(event: KeyboardEvent, index: number, side: Side) {
		if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
		event.preventDefault();
		if (side === 'prompt' && form.matchingRows[index].answer !== null) {
			focusField('answer', index);
			return;
		}
		const next = form.matchingRows[index + 1];
		if (!next) {
			form.matchingRows = [...form.matchingRows, { prompt: '', answer: '' }];
			form.touch();
		}
		focusField(next?.prompt === null ? 'answer' : 'prompt', index + 1);
	}

	function onPromptPaste(event: ClipboardEvent, index: number) {
		const text = event.clipboardData?.getData('text/plain') ?? '';
		if (!form.pasteMatchingPairs(index, text)) return;
		event.preventDefault();
		event.stopPropagation();
	}

	function add(side: Side) {
		const open = form.matchingRows.findIndex((row) => row[side] === null);
		form.addMatchingSide(side);
		focusField(side, open === -1 ? form.matchingRows.length - 1 : open);
	}
</script>

{#snippet removeButton(index: number, side: Side)}
	<Button
		variant="ghost"
		tone="neutral"
		size="xs"
		shape="circle"
		class="absolute end-2 top-2 text-foreground/40 hover:text-error-ink"
		aria-label="Remove {side} {index + 1}"
		onclick={() => form.removeMatchingSide(index, side)}
	>
		<X size={14} />
	</Button>
{/snippet}

<div bind:this={root} class="space-y-4">
	<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
		<h3 class="label-caps">Matching pairs</h3>
		<span class="text-xs tabular-nums text-muted-foreground">{summary}</span>
	</div>

	<ol class="space-y-3">
		{#each form.matchingRows as row, i (i)}
			<li
				class="grid items-start gap-2 max-sm:surface-sm max-sm:p-2 sm:grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)] sm:gap-3"
			>
				<div class="relative">
					{#if row.prompt !== null}
						<Textarea
							rows={1}
							class="{FIELD} border-border bg-muted font-medium"
							placeholder="Prompt"
							aria-label="Prompt {i + 1}"
							data-row-prompt={i}
							bind:value={row.prompt}
							oninput={() => form.touch()}
							onkeydown={(event) => onKey(event, i, 'prompt')}
							onpaste={(event) => onPromptPaste(event, i)}
						/>
						{@render removeButton(i, 'prompt')}
					{:else}
						<button type="button" class={SLOT} onclick={() => fillSlot(i, 'prompt')}>
							Distractor (no prompt)
						</button>
					{/if}
				</div>

				<ArrowRight
					size={16}
					class="justify-self-center text-foreground/30 max-sm:rotate-90 sm:mt-3 {row.prompt !==
						null && row.answer !== null
						? ''
						: 'max-sm:hidden sm:invisible'}"
					aria-hidden="true"
				/>

				<div class="relative">
					{#if row.answer !== null}
						<Textarea
							rows={1}
							class="{FIELD} bg-background {row.prompt !== null
								? 'border-success/40 focus-visible:border-success'
								: 'border-border'}"
							placeholder={row.prompt === null ? 'Distractor' : 'Answer'}
							aria-label="{row.prompt === null ? 'Distractor' : 'Answer'} {i + 1}"
							data-row-answer={i}
							bind:value={row.answer}
							oninput={() => form.touch()}
							onkeydown={(event) => onKey(event, i, 'answer')}
						/>
						{@render removeButton(i, 'answer')}
					{:else}
						<button type="button" class={SLOT} onclick={() => fillSlot(i, 'answer')}>
							No answer
						</button>
					{/if}
				</div>
			</li>
		{/each}
	</ol>

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)]">
		<Button
			variant="outline"
			tone="neutral"
			size="sm"
			class="gap-2 justify-self-start"
			onclick={() => add('prompt')}
		>
			<Plus size={14} /> Add prompt
		</Button>
		<span class="hidden sm:block"></span>
		<Button
			variant="outline"
			tone="neutral"
			size="sm"
			class="gap-2 max-sm:justify-self-end sm:justify-self-start"
			onclick={() => add('answer')}
		>
			<Plus size={14} /> Add answer
		</Button>
	</div>
</div>
