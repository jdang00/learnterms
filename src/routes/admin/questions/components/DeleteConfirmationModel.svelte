<script lang="ts">
	let { lm = $bindable() } = $props();
</script>

<div>
	<dialog class="modal max-w-full p-4" class:modal-open={lm.isDeleteModalOpen}>
		<div class="modal-box">
			<form method="dialog">
				<button
					class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
					onclick={() => {
						lm.isDeleteModalOpen = false;
						lm.pendingDeleteId = '';
					}}>✕</button
				>
			</form>
			<h3 class="text-lg font-bold">Delete Question</h3>
			{#if lm.pendingDeleteId}
				<p class="py-4">Are you sure you want to delete this question?</p>
				<div class="my-4 p-4 bg-base-200 rounded-box">
					{lm.questions.find((q) => q.id === lm.pendingDeleteId)?.question_data.question}
				</div>
			{/if}

			{#if lm.deleteError}
				<div class="alert alert-error mb-4">
					<span>Error: {lm.deleteError}</span>
				</div>
			{/if}

			<div class="modal-action">
				<button
					class="btn btn-outline"
					onclick={() => {
						lm.isDeleteModalOpen = false;
						lm.pendingDeleteId = '';
					}}
					disabled={lm.isDeleting}
				>
					Cancel
				</button>
				<button class="btn btn-error" onclick={() => lm.handleDelete()} disabled={lm.isDeleting}>
					{#if lm.isDeleting}
						<span class="loading loading-spinner"></span>
						Deleting...
					{:else}
						Delete
					{/if}
				</button>
			</div>
		</div>
	</dialog>
</div>
