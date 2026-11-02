<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import FileText from '@lucide/svelte/icons/file-text';
	import Flag from '@lucide/svelte/icons/flag';
	import X from '@lucide/svelte/icons/x';
	import * as Accordion from '#lib/components/ui/accordion/index.js';
	import * as Attachment from '#lib/components/ui/attachment/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Marker from '#lib/components/ui/marker/index.js';
	import { Toggle } from '#lib/components/ui/toggle/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { Tip } from '#lib/components/ui/tooltip/index.js';
	import { questions, sourceTitle } from './fixtures';
	import RichText from './RichText.svelte';

	type Attempt = { picked?: string; checked: boolean; confidence: string; flagged: boolean };

	let index = $state(0);
	let attempts = $state<Attempt[]>(
		questions.map(() => ({ checked: false, confidence: '', flagged: false }))
	);

	const question = $derived(questions[index]);
	const attempt = $derived(attempts[index]);
	const correct = $derived(attempt.checked && attempt.picked === question.answer);
	const letter = (i: number) => String.fromCharCode(65 + i);

	function pick(id: string) {
		if (attempt.checked && correct) return;
		attempts[index] = { ...attempt, picked: id, checked: false };
	}

	function dotClass(i: number) {
		const a = attempts[i];
		const base = i === index ? 'ring-2 ring-primary ring-offset-2 ring-offset-background ' : '';
		if (!a.checked) return base + (a.picked ? 'bg-primary/15 text-primary-ink' : 'bg-muted');
		return base + (a.picked === questions[i].answer ? 'bg-success/60' : 'bg-error/50');
	}

	function optionClass(id: string) {
		const isPicked = attempt.picked === id;
		if (attempt.checked && id === question.answer && (correct || isPicked))
			return 'border-success bg-success/10';
		if (attempt.checked && isPicked) return 'border-error bg-error/10';
		if (isPicked) return 'border-primary bg-primary/8';
		return 'border-border bg-background hover:border-foreground/25';
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<div class="flex items-center gap-2 px-4 pt-3">
		{#each questions as q, i (q.id)}
			<Tip label="Question {i + 1}{attempts[i].flagged ? ' · flagged' : ''}">
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						onclick={() => (index = i)}
						class="relative grid size-8 place-items-center rounded-full text-xs font-semibold tabular-nums transition-colors {dotClass(
							i
						)}"
						>{i + 1}{#if attempts[i].flagged}<span
								class="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-warning"
							></span>{/if}</button
					>
				{/snippet}
			</Tip>
		{/each}
		<span class="flex-1"></span>
		<Toggle
			size="sm"
			variant="outline"
			bind:pressed={attempts[index].flagged}
			aria-label="Flag question"
			class="aria-pressed:border-warning aria-pressed:bg-warning/15 aria-pressed:text-warning-ink"
			><Flag /></Toggle
		>
	</div>

	<div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
		<p class="text-[15px] leading-relaxed font-medium">
			<RichText parts={question.stem} />
		</p>

		<div class="space-y-2" role="group" aria-label="Options">
			{#each question.options as option, i (option.id)}
				<button
					type="button"
					aria-pressed={attempt.picked === option.id}
					onclick={() => pick(option.id)}
					class="flex w-full items-start gap-3 rounded-3xl border-2 px-3.5 py-2.5 text-left text-sm leading-snug transition-colors {optionClass(
						option.id
					)}"
				>
					<span
						class="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold"
						>{letter(i)}</span
					>
					<span class="flex-1 self-center">{option.text}</span>
				</button>
			{/each}
		</div>

		{#if attempt.checked}
			<Marker.Root role="status">
				<Marker.Icon
					>{#if correct}<Check class="text-success-ink" />{:else}<X
							class="text-error-ink"
						/>{/if}</Marker.Icon
				>
				<Marker.Content
					>{correct
						? 'Correct. How sure were you?'
						: 'Not quite. Try again or read why.'}</Marker.Content
				>
			</Marker.Root>
			{#if correct}
				<ToggleGroup.Root
					type="single"
					variant="outline"
					size="sm"
					class="w-full"
					bind:value={attempts[index].confidence}
				>
					<ToggleGroup.Item value="guess" class="flex-1">Guessed</ToggleGroup.Item>
					<ToggleGroup.Item value="unsure" class="flex-1">Unsure</ToggleGroup.Item>
					<ToggleGroup.Item value="sure" class="flex-1">Knew it</ToggleGroup.Item>
				</ToggleGroup.Root>
			{/if}
			<Accordion.Root type="single" value={correct ? question.answer : attempt.picked}>
				{#each question.options as option, i (option.id)}
					<Accordion.Item value={option.id}>
						<Accordion.Trigger class="py-2.5 text-sm">
							<span class="flex items-center gap-2.5">
								<span
									class="grid size-5 place-items-center rounded-full text-[11px] font-semibold {option.id ===
									question.answer
										? 'bg-success text-success-foreground'
										: 'bg-muted text-muted-foreground'}">{letter(i)}</span
								>
								Why {option.id === question.answer ? 'it’s right' : 'not'}: {option.text}
							</span>
						</Accordion.Trigger>
						<Accordion.Content class="ps-7.5 text-sm text-foreground/75"
							>{option.why}</Accordion.Content
						>
					</Accordion.Item>
				{/each}
			</Accordion.Root>
			<Attachment.Root size="xs">
				<Attachment.Media><FileText /></Attachment.Media>
				<Attachment.Content>
					<Attachment.Title>{sourceTitle(question.sourceId)}</Attachment.Title>
					<Attachment.Description>p. {question.page}</Attachment.Description>
				</Attachment.Content>
			</Attachment.Root>
		{/if}
	</div>

	<div class="flex items-center gap-2 border-t border-border px-4 py-3">
		<Button
			size="sm"
			shape="circle"
			variant="ghost"
			tone="neutral"
			aria-label="Previous question"
			disabled={index === 0}
			onclick={() => index--}><ChevronLeft /></Button
		>
		<Button
			size="sm"
			class="flex-1"
			disabled={!attempt.picked || (attempt.checked && correct)}
			onclick={() => (attempts[index] = { ...attempt, checked: true })}>Check</Button
		>
		<Button
			size="sm"
			shape="circle"
			variant="ghost"
			tone="neutral"
			aria-label="Next question"
			disabled={index === questions.length - 1}
			onclick={() => index++}><ChevronRight /></Button
		>
	</div>
</div>
