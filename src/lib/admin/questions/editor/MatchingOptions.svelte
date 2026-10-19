<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import type { QuestionEditorState } from './questionEditor.svelte';

	let { form }: { form: QuestionEditorState } = $props();
</script>

<div class="space-y-4">
	<div class="label-caps mb-2">Matching Pairs</div>
	<div class="space-y-3">
		{#each form.matchingRowIndexes as i (i)}
			<div class="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
				<!-- Left Column: Prompt -->
				<div class="flex-1 w-full relative">
					{#if i < form.matchingPrompts.length}
						<Input
							type="text"
							class="pr-10"
							placeholder="Prompt {i + 1}"
							bind:value={form.matchingPrompts[i]}
							oninput={() => form.touch()}
						/>
						{#if form.matchingPrompts.length > 1}
							<Button
								variant="ghost"
								tone="neutral"
								size="xs"
								shape="circle"
								class="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-error-ink"
								onclick={() => form.removeMatchingPrompt(i)}
							>
								<X size={14} />
							</Button>
						{/if}
					{:else}
						<div
							class="h-12 w-full surface-dashed flex items-center justify-center text-xs text-foreground/30 italic"
						>
							Distractor (No Prompt)
						</div>
					{/if}
				</div>

				<!-- Center: Arrow -->
				<div class="text-foreground/30 rotate-90 sm:rotate-0 w-5 flex justify-center">
					{#if i < form.matchingPrompts.length && i < form.matchingAnswers.length}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 7l5 5m0 0l-5 5m5-5H6"
							/>
						</svg>
					{/if}
				</div>

				<!-- Right Column: Answer -->
				<div class="flex-1 w-full relative">
					{#if i < form.matchingAnswers.length}
						<Input
							type="text"
							class="pr-10 border-success/30 focus:border-success focus:ring-success/20"
							placeholder="Answer {i + 1}"
							bind:value={form.matchingAnswers[i]}
							oninput={() => form.touch()}
						/>
						{#if form.matchingAnswers.length > 1}
							<Button
								variant="ghost"
								tone="neutral"
								size="xs"
								shape="circle"
								class="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-error-ink"
								onclick={() => form.removeMatchingAnswer(i)}
							>
								<X size={14} />
							</Button>
						{/if}
					{:else}
						<div
							class="h-12 w-full surface-dashed flex items-center justify-center text-xs text-foreground/30 italic"
						>
							No Answer
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
		<div class="flex justify-center sm:justify-start">
			<Button
				variant="outline"
				tone="neutral"
				size="sm"
				class="w-full gap-2 sm:w-auto"
				onclick={() => form.addMatchingPrompt()}
			>
				<Plus size={14} /> Add Prompt
			</Button>
		</div>
		<div class="flex justify-center sm:justify-end">
			<Button
				variant="outline"
				tone="neutral"
				size="sm"
				class="w-full gap-2 sm:w-auto"
				onclick={() => form.addMatchingAnswer()}
			>
				<Plus size={14} /> Add Answer
			</Button>
		</div>
	</div>
</div>
