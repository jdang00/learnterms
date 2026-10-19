<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import QuestionEditorInline from './QuestionEditorInline.svelte';
	import type { Doc } from '../../../convex/_generated/dataModel';

	let {
		isEditModalOpen,
		closeEditModal,
		editingQuestion,
		moduleId
	}: {
		isEditModalOpen: boolean;
		closeEditModal: () => void;
		editingQuestion: Doc<'question'> | null;
		moduleId: string;
	} = $props();
</script>

<Dialog.Root
	open={isEditModalOpen}
	onOpenChange={(open) => {
		if (!open) closeEditModal();
	}}
>
	<Dialog.Content
		showCloseButton={false}
		class="h-[90vh] w-full sm:max-w-4xl flex flex-col gap-0 overflow-hidden p-0 bg-background"
	>
		<Dialog.Title class="sr-only">Edit question</Dialog.Title>
		{#if editingQuestion}
			{#key editingQuestion._id}
				<QuestionEditorInline
					{moduleId}
					mode="edit"
					{editingQuestion}
					onSave={closeEditModal}
					onCancel={closeEditModal}
				/>
			{/key}
		{:else}
			<div class="flex items-center justify-center h-full text-foreground/50">
				No question selected
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
