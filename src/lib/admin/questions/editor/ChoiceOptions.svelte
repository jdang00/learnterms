<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Spinner } from '$lib/components/ui/spinner';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import Shuffle from '@lucide/svelte/icons/shuffle';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { QUESTION_TYPES } from '$lib/types';
	import type { QuestionEditorState } from './questionEditor.svelte';

	let { form, onGenerate }: { form: QuestionEditorState; onGenerate: () => void } = $props();
	const isTrueFalse = $derived(form.questionType === QUESTION_TYPES.TRUE_FALSE);
	const isMultipleChoice = $derived(form.questionType === QUESTION_TYPES.MULTIPLE_CHOICE);
</script>

<!-- Multiple Choice / True False -->
<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="label-caps">Options</div>
			<span class="text-[10px] text-foreground/40 font-medium hidden sm:inline"
				>Ctrl + Enter to toggle correct</span
			>
		</div>
		<div class="flex items-center gap-1">
			{#if isMultipleChoice}
				<Button
					variant="ghost"
					tone="neutral"
					size="xs"
					class="gap-1"
					onclick={onGenerate}
					title={form.canGenerateAI()
						? 'Generate distractor options with AI'
						: 'Add stem and correct answer first'}
				>
					{#if form.isGeneratingAI}
						<Spinner class="size-3" />
					{:else}
						<Sparkles size={12} />
					{/if}
					<span class="hidden sm:inline">Question Studio</span>
				</Button>
				<Button
					variant="ghost"
					tone="neutral"
					size="xs"
					class="gap-1"
					onclick={() => form.shuffleOptions()}
				>
					<Shuffle size={12} /> <span class="hidden sm:inline">Shuffle</span>
				</Button>
			{/if}
		</div>
	</div>

	<div class="space-y-3">
		{#each form.options as option, index (index)}
			{@const correct = form.correctAnswers.includes(index.toString())}
			<div class="relative group">
				<div
					class="flex items-center rounded-full border-2 transition-colors bg-background pl-3 pr-2 py-1 {correct
						? 'border-success bg-success/5'
						: 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'}"
				>
					<Checkbox
						class="size-4 {correct ? 'data-checked:border-success data-checked:bg-success' : ''}"
						checked={correct}
						onCheckedChange={() => form.toggleCorrectAnswer(index)}
						tabindex={-1}
					/>
					<span class="font-semibold text-sm ml-3 text-foreground/50 select-none w-6"
						>{String.fromCharCode(65 + index)}.</span
					>
					<input
						type="text"
						class="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 h-9"
						bind:value={option.text}
						disabled={isTrueFalse}
						placeholder="Option text..."
						onblur={() => form.touch()}
						onkeydown={(e) => {
							if (e.ctrlKey && e.key === 'Enter') {
								e.preventDefault();
								form.toggleCorrectAnswer(index);
							}
						}}
					/>
					{#if form.options.length > 2 && !isTrueFalse}
						<Button
							variant="ghost"
							tone="neutral"
							size="xs"
							shape="circle"
							class="ml-1 text-foreground/30 hover:text-error-ink"
							tabindex={-1}
							onclick={() => form.removeOption(index)}
						>
							<X size={14} />
						</Button>
					{:else if isTrueFalse}
						<div class="w-8"></div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	{#if isMultipleChoice}
		<Button
			variant="ghost"
			tone="neutral"
			size="sm"
			class="mt-2 w-full gap-2 border-2 border-dashed border-border hover:border-primary hover:text-primary-ink"
			onclick={() => form.addOption()}
		>
			<Plus size={14} /> Add Option
		</Button>
	{/if}
</div>
