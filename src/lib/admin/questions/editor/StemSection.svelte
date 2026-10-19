<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import type { Editor, EditorContent } from 'svelte-tiptap';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { DISPLAY_QUESTION_TYPES } from '#lib/types.js';
	import type { ToolbarItem } from './toolbar';
	import type { QuestionEditorState } from './questionEditor.svelte';

	let {
		form,
		editor,
		Content,
		menuItems
	}: {
		form: QuestionEditorState;
		editor: Editor | undefined;
		Content: typeof EditorContent | undefined;
		menuItems: ToolbarItem[];
	} = $props();
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between">
		<label class="label-caps flex items-center gap-2">
			<MessageSquare size={14} /> Question
		</label>
		<span class="text-[10px] text-foreground/40 font-medium hidden sm:inline">Ctrl + S to save</span
		>
	</div>
	<div
		class="surface overflow-hidden shadow-xs group focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all"
	>
		{#if editor && Content}
			<div
				class="bg-muted/50 border-b border-border p-1 flex gap-1 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
			>
				{#each menuItems as item (item.name)}
					<Button
						variant={item.active() ? 'soft' : 'ghost'}
						tone={item.active() ? 'primary' : 'neutral'}
						size="xs"
						shape="square"
						onclick={item.command}
						tooltip={item.name}
						aria-label={item.name}
					>
						<item.icon size={12} />
					</Button>
				{/each}
			</div>
			<Content {editor} />
		{:else}
			<Skeleton class="m-3 h-12 rounded-lg" />
		{/if}
	</div>
	{#if form.visibleSuggestion}
		{@const suggestion = form.visibleSuggestion}
		<div class="flex flex-wrap items-center gap-2 px-1 text-xs text-foreground/70">
			<Sparkles size={12} class="text-primary" />
			<span>
				Looks like <span class="font-semibold">{DISPLAY_QUESTION_TYPES[suggestion.type]}</span>
				<span class="text-foreground/50">· {suggestion.reason}</span>
			</span>
			<Button
				variant="soft"
				tone="primary"
				size="xs"
				onclick={() => form.acceptSuggestion(suggestion)}>Switch</Button
			>
			<Button
				variant="ghost"
				tone="neutral"
				size="xs"
				onclick={() => form.dismissSuggestion(suggestion.type)}>Dismiss</Button
			>
		</div>
	{:else if form.showAutoTyped && form.autoTyped}
		<div class="flex flex-wrap items-center gap-2 px-1 text-xs text-foreground/70">
			<Sparkles size={12} class="text-primary" />
			<span>
				Switched to <span class="font-semibold">{DISPLAY_QUESTION_TYPES[form.autoTyped.type]}</span>
				<span class="text-foreground/50">· {form.autoTyped.reason}</span>
			</span>
			<Button variant="ghost" tone="neutral" size="xs" onclick={() => form.undoAutoType()}
				>Keep Multiple Choice</Button
			>
		</div>
	{/if}
	{#if form.stemHint}
		<p class="px-1 text-xs text-warning-ink">{form.stemHint}</p>
	{/if}
</div>
