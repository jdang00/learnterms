<script lang="ts">
	import { X } from 'lucide-svelte';
	import QuestionEditorInline from './QuestionEditorInline.svelte';
	import type { Doc } from '../../convex/_generated/dataModel';

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

<dialog class="modal" class:modal-open={isEditModalOpen}>
	<div class="modal-box w-full max-w-4xl h-[90vh] rounded-2xl border border-base-300 shadow-2xl p-0 overflow-hidden flex flex-col bg-base-100">
		<button
			class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10 hidden"
			onclick={closeEditModal}
			aria-label="Close"
		>
			<X size={18} />
		</button>

		{#if isEditModalOpen && editingQuestion}
			{#key editingQuestion._id}
				<QuestionEditorInline
					{moduleId}
					mode="edit"
					{editingQuestion}
					onSave={closeEditModal}
					onCancel={closeEditModal}
				/>
			{/key}
		{:else if isEditModalOpen}
			<div class="flex items-center justify-center h-full text-base-content/50">
				No question selected
			</div>
		{/if}
	</div>
	<div class="modal-backdrop bg-black/50" onclick={closeEditModal}></div>
</dialog>
