<script lang="ts">
	let {
		isDeleteModalOpen,
		onCancel,
		onConfirm,
		itemName,
		itemType,
		questionCount,
		moduleCount
	}: {
		isDeleteModalOpen: boolean;
		onCancel: () => void;
		onConfirm: () => void;
		itemName?: string;
		itemType: 'class' | 'module' | 'question' | 'document' | 'chunk';
		questionCount?: number;
		moduleCount?: number;
	} = $props();

	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
</script>

<AlertDialog.Root
	open={isDeleteModalOpen}
	onOpenChange={(open) => {
		if (!open) onCancel();
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title class="font-bold">
				Delete {itemType === 'question'
					? 'Question'
					: itemType === 'document'
						? 'Document'
						: itemType.charAt(0).toUpperCase() + itemType.slice(1)}
			</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.
				{#if itemType === 'module' && questionCount && questionCount > 0}
					<br /><br />
					<span class="text-warning-ink font-medium">
						⚠️ This module contains {questionCount} question{questionCount === 1 ? '' : 's'} that will
						also be deleted.
					</span>
				{:else if itemType === 'class' && ((moduleCount && moduleCount > 0) || (questionCount && questionCount > 0))}
					<br /><br />
					<span class="text-warning-ink font-medium">
						⚠️ This class contains {moduleCount || 0} module{(moduleCount || 0) === 1 ? '' : 's'} and
						{questionCount || 0} question{(questionCount || 0) === 1 ? '' : 's'} that will also be deleted.
					</span>
				{:else if itemType === 'document'}
					<br /><br />
					<span class="text-warning-ink font-medium">
						⚠️ This document and all its associated content will be permanently removed.
					</span>
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action tone="error" onclick={onConfirm}>Delete</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
