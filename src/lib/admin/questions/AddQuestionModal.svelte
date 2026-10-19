<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import QuestionEditorInline from './QuestionEditorInline.svelte';

	let {
		isAddModalOpen,
		closeAddModal,
		moduleId,
		defaultStatus = 'draft'
	}: {
		isAddModalOpen: boolean;
		closeAddModal: () => void;
		moduleId: string;
		defaultStatus?: 'published' | 'draft';
	} = $props();
</script>

<Dialog.Root
	open={isAddModalOpen}
	onOpenChange={(open) => {
		if (!open) closeAddModal();
	}}
>
	<Dialog.Content
		showCloseButton={false}
		class="h-[90vh] w-full sm:max-w-4xl flex flex-col gap-0 overflow-hidden p-0 bg-background"
	>
		<Dialog.Title class="sr-only">Add question</Dialog.Title>
		<QuestionEditorInline
			{moduleId}
			mode="add"
			{defaultStatus}
			onSave={closeAddModal}
			onCancel={closeAddModal}
		/>
	</Dialog.Content>
</Dialog.Root>
