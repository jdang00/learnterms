<script lang="ts">
	import { X } from 'lucide-svelte';
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
		defaultStatus?: 'published' | 'draft' 
	} = $props();

</script>

<dialog class="modal" class:modal-open={isAddModalOpen}>
	<div class="modal-box w-full max-w-4xl h-[90vh] rounded-2xl border border-base-300 shadow-2xl p-0 overflow-hidden flex flex-col bg-base-100">
		<button
			class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10 hidden"
			onclick={closeAddModal}
			aria-label="Close"
		>
			<X size={18} />
		</button>

		{#if isAddModalOpen}
			<QuestionEditorInline
				{moduleId}
				mode="add"
				{defaultStatus}
				onSave={(id) => {
					// Optional: you might want to do something with the new ID
					closeAddModal();
				}}
				onCancel={closeAddModal}
			/>
		{/if}
	</div>
	<div class="modal-backdrop bg-black/50" onclick={closeAddModal}></div>
</dialog>
