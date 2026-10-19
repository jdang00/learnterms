<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Target from '@lucide/svelte/icons/target';
	import type { Editor, EditorContent } from 'svelte-tiptap';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import QuestionSources from '#lib/components/QuestionSources.svelte';
	import QuestionSourceEditor from '../QuestionSourceEditor.svelte';
	import type { Id } from '../../../../convex/_generated/dataModel';
	import type { ToolbarItem } from './toolbar';
	import type { QuestionEditorState, QuestionItem } from './questionEditor.svelte';

	let {
		form,
		editor,
		Content,
		menuItems,
		moduleId,
		editingQuestion,
		editorResetKey
	}: {
		form: QuestionEditorState;
		editor: Editor | undefined;
		Content: typeof EditorContent | undefined;
		menuItems: ToolbarItem[];
		moduleId: string;
		editingQuestion: QuestionItem | null;
		editorResetKey: string;
	} = $props();
</script>

<div>
	{#if form.isFreeResponse}
		<div class="label-caps mb-1 flex items-center gap-2">
			<Target size={14} /> Ground Truth
		</div>
		<p class="text-[10px] text-foreground/40 mb-2">
			The expected answer or source text responses are graded against.
		</p>
	{:else}
		<div class="label-caps mb-1 flex items-center gap-2">
			<MessageSquare size={14} /> Rationale
		</div>
		<p class="text-[10px] text-foreground/40 mb-2">
			Required for every saved question.
			<a
				class="underline underline-offset-4"
				href="https://docs.learnterms.com/docs/contributors/why-rationales-are-required"
				target="_blank"
				rel="noreferrer"
			>
				Why?
			</a>
		</p>
	{/if}
	<div
		class="border border-border rounded-2xl overflow-hidden bg-background group {form.isFreeResponse
			? 'shadow-xs flex flex-col-reverse focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all [&_.tiptap]:min-h-56 [&_.tiptap]:px-4 [&_.tiptap]:py-3'
			: ''}"
	>
		{#if editor && Content}
			<Content {editor} />
			<div
				class="bg-muted/50 border-border p-1 flex flex-wrap gap-1 transition-opacity {form.isFreeResponse
					? 'border-b opacity-60 group-hover:opacity-100 group-focus-within:opacity-100'
					: 'border-t opacity-50 group-hover:opacity-100'}"
			>
				{#each menuItems as item (item.name)}
					<Button
						variant={item.active() ? 'soft' : 'ghost'}
						tone={item.active() && form.isFreeResponse ? 'primary' : 'neutral'}
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
		{:else}
			<Skeleton class="m-3 h-12 rounded-lg" />
		{/if}
	</div>
	{#if editingQuestion?.aiGenerated && !form.questionSource}
		<QuestionSources source={editingQuestion?.metadata?.generation} editing />
	{/if}
	{#key editorResetKey}
		<QuestionSourceEditor
			moduleId={moduleId as Id<'module'>}
			bind:source={form.questionSource}
			onChange={() => form.touch()}
			disabled={form.isSubmitting}
		/>
	{/key}
</div>
