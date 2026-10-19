<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Stethoscope from '@lucide/svelte/icons/stethoscope';
	import Save from '@lucide/svelte/icons/save';
	import type { EditorMode, QuestionEditorState } from './questionEditor.svelte';

	let {
		form,
		mode,
		canEditExamFindings,
		uploading,
		onCancel,
		onSubmit
	}: {
		form: QuestionEditorState;
		mode: EditorMode;
		canEditExamFindings: boolean;
		uploading: boolean;
		onCancel: () => void;
		onSubmit: () => void;
	} = $props();
</script>

<div
	class="flex flex-wrap items-center justify-between gap-y-2 px-4 py-3 border-b border-border bg-background shrink-0"
>
	<h3 class="text-base font-semibold">{mode === 'edit' ? 'Edit Question' : 'New Question'}</h3>
	{#if canEditExamFindings}
		<Tabs.Root
			value={form.editorView}
			onValueChange={(value) => (form.editorView = value as typeof form.editorView)}
			class="mx-3"
		>
			<Tabs.List aria-label="Editor view" class="h-8">
				<Tabs.Trigger value="question" class="px-3">
					<MessageSquare size={13} /> Question
				</Tabs.Trigger>
				<Tabs.Trigger value="findings" class="px-3">
					<Stethoscope size={13} />
					<span class="hidden sm:inline">Exam findings</span>
					{#if form.examFindings.length}
						<Badge variant="solid" tone="primary" size="xs" class="tabular-nums"
							>{form.examFindings.length}</Badge
						>
					{:else}
						<Badge variant="soft" tone="info" size="xs">Beta</Badge>
					{/if}
				</Tabs.Trigger>
			</Tabs.List>
		</Tabs.Root>
	{/if}
	<div class="ml-auto flex items-center gap-2">
		<Button
			variant="ghost"
			tone="neutral"
			size="sm"
			onclick={onCancel}
			disabled={form.isSubmitting || uploading}>Cancel</Button
		>
		<Button
			size="sm"
			class="gap-2"
			onclick={onSubmit}
			loading={form.isSubmitting}
			disabled={form.isSubmitting || uploading || !form.canSubmit}
		>
			{#if !form.isSubmitting}<Save size={14} />{/if}
			{mode === 'edit' ? 'Save' : 'Create'}
		</Button>
	</div>
</div>
