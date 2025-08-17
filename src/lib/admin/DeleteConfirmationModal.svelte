<script lang="ts">
	let { isDeleteModalOpen, onCancel, onConfirm, itemName, itemType, questionCount, moduleCount } =
		$props<{
			isDeleteModalOpen: boolean;
			onCancel: () => void;
			onConfirm: () => void;
			itemName?: string;
			itemType: 'class' | 'module' | 'question' | 'document' | 'chunk';
			questionCount?: number;
			moduleCount?: number;
		}>();

	import { X } from 'lucide-svelte';
</script>

<dialog class="modal max-w-full p-4" class:modal-open={isDeleteModalOpen}>
	<div class="modal-box">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onclick={onCancel}>
				<X size={16} />
			</button>
		</form>
		<h3 class="text-lg font-bold">
			Delete {itemType === 'question'
				? 'Question'
				: itemType === 'document'
					? 'Document'
					: itemType.charAt(0).toUpperCase() + itemType.slice(1)}
		</h3>
		<p class="py-4">
			Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.
			{#if itemType === 'module' && questionCount && questionCount > 0}
				<br /><br />
				<span class="text-warning font-medium">
					⚠️ This module contains {questionCount} question{questionCount === 1 ? '' : 's'} that will
					also be deleted.
				</span>
			{:else if itemType === 'class' && ((moduleCount && moduleCount > 0) || (questionCount && questionCount > 0))}
				<br /><br />
				<span class="text-warning font-medium">
					⚠️ This class contains {moduleCount || 0} module{(moduleCount || 0) === 1 ? '' : 's'} and {questionCount ||
						0} question{(questionCount || 0) === 1 ? '' : 's'} that will also be deleted.
				</span>
			{:else if itemType === 'document'}
				<br /><br />
				<span class="text-warning font-medium">
					⚠️ This document and all its associated content will be permanently removed.
				</span>
			{/if}
		</p>
		<div class="flex justify-end space-x-2">
			<button class="btn btn-outline" onclick={onCancel}>Cancel</button>
			<button class="btn btn-error" onclick={onConfirm}>Delete</button>
		</div>
	</div>
</dialog>
