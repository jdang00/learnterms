<script lang="ts">
	import { FilePenLine, X } from 'lucide-svelte';
	import { tick } from 'svelte';

	let {
		isOpen,
		title = $bindable(),
		isSaving,
		error,
		onCancel,
		onConfirm
	}: {
		isOpen: boolean;
		title: string;
		isSaving: boolean;
		error: string;
		onCancel: () => void;
		onConfirm: () => void;
	} = $props();

	let nameInput: HTMLInputElement | null = $state(null);

	$effect(() => {
		if (!isOpen) return;
		void tick().then(() => {
			nameInput?.focus();
			nameInput?.select();
		});
	});

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		onConfirm();
	}
</script>

{#if isOpen}
	<dialog class="modal modal-open max-w-full p-4" aria-labelledby="rename-document-title">
		<form class="modal-box rounded-2xl" onsubmit={handleSubmit}>
			<button
				type="button"
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={onCancel}
				disabled={isSaving}
				aria-label="Close rename dialog"
			>
				<X size={16} />
			</button>

			<div class="mb-5 flex items-center gap-3 pr-8">
				<div class="rounded-xl bg-primary/10 p-3 text-primary">
					<FilePenLine size={20} />
				</div>
				<div>
					<h3 id="rename-document-title" class="text-lg font-bold">Rename file</h3>
					<p class="text-sm text-base-content/55">The original uploaded file stays unchanged.</p>
				</div>
			</div>

			<label class="form-control w-full">
				<span class="label pb-2 text-xs font-semibold uppercase tracking-wide text-base-content/55">
					File name
				</span>
				<input
					bind:this={nameInput}
					type="text"
					class="input input-bordered w-full rounded-xl focus:input-primary"
					bind:value={title}
					minlength="2"
					maxlength="100"
					required
					disabled={isSaving}
					aria-describedby={error ? 'rename-document-error' : undefined}
				/>
				<div class="label pt-1.5">
					<span class="label-text-alt text-base-content/45">2–100 characters</span>
					<span class="label-text-alt text-base-content/45">{title.trim().length}/100</span>
				</div>
			</label>

			{#if error}
				<div id="rename-document-error" class="alert alert-error mt-3 rounded-xl py-2.5 text-sm">
					<span>{error}</span>
				</div>
			{/if}

			<div class="modal-action mt-6">
				<button
					type="button"
					class="btn btn-outline rounded-full"
					onclick={onCancel}
					disabled={isSaving}>Cancel</button
				>
				<button
					type="submit"
					class="btn btn-primary min-w-28 rounded-full"
					disabled={isSaving || title.trim().length < 2 || title.trim().length > 100}
				>
					{#if isSaving}
						<span class="loading loading-spinner loading-sm"></span>
						Renaming
					{:else}
						Rename
					{/if}
				</button>
			</div>
		</form>
	</dialog>
{/if}
