<script lang="ts">
	let { isDeleteModalOpen, onCancel, onConfirm, itemName, itemType } = $props<{
		isDeleteModalOpen: boolean;
		onCancel: () => void;
		onConfirm: () => void;
		itemName?: string;
		itemType: 'class' | 'module';
	}>();

	import { X } from 'lucide-svelte';
</script>

<dialog class="modal max-w-full p-4" class:modal-open={isDeleteModalOpen}>
	<div class="modal-box">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={onCancel}
			>
				<X size={16} />
			</button>
		</form>
		<h3 class="text-lg font-bold">Delete {itemType.charAt(0).toUpperCase() + itemType.slice(1)}</h3>
		<p class="py-4">
			Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.
		</p>
		<div class="flex justify-end space-x-2">
			<button class="btn btn-outline" onclick={onCancel}>Cancel</button>
			<button class="btn btn-error" onclick={onConfirm}>Delete</button>
		</div>
	</div>
</dialog> 