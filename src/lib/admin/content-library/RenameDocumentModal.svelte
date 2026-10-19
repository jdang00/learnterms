<script lang="ts">
	import { FilePenLine } from 'lucide-svelte';
	import { tick } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import * as Alert from '$lib/components/ui/alert';

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

<Dialog.Root
	open={isOpen}
	onOpenChange={(open) => {
		if (!open && !isSaving) onCancel();
	}}
>
	<Dialog.Content showCloseButton={false} aria-labelledby="rename-document-title">
		<form class="grid gap-6" onsubmit={handleSubmit}>
			<Dialog.CornerClose onclick={onCancel} disabled={isSaving} label="Close rename dialog" />

			<div class="flex items-center gap-3 pe-12">
				<div class="rounded-2xl bg-primary/10 p-3 text-primary-ink">
					<FilePenLine size={20} />
				</div>
				<div>
					<Dialog.Title id="rename-document-title" class="text-lg font-bold"
						>Rename file</Dialog.Title
					>
					<Dialog.Description class="text-sm text-foreground/55"
						>The original uploaded file stays unchanged.</Dialog.Description
					>
				</div>
			</div>

			<Field.Field>
				<Field.Label for="rename-document-name" class="pb-1 text-sm font-medium">
					File name
				</Field.Label>
				<Input
					id="rename-document-name"
					bind:ref={nameInput}
					type="text"
					bind:value={title}
					minlength={2}
					maxlength={100}
					required
					disabled={isSaving}
					aria-describedby={error ? 'rename-document-error' : undefined}
				/>
				<div class="flex justify-between pt-1.5 text-xs text-foreground/45">
					<span>2–100 characters</span>
					<span>{title.trim().length}/100</span>
				</div>
			</Field.Field>

			{#if error}
				<Alert.Root tone="error" id="rename-document-error" class="py-2.5">
					<Alert.Description>{error}</Alert.Description>
				</Alert.Root>
			{/if}

			<Dialog.Footer class="mt-6">
				<Button variant="outline" tone="neutral" onclick={onCancel} disabled={isSaving}
					>Cancel</Button
				>
				<Button
					type="submit"
					class="min-w-28"
					loading={isSaving}
					disabled={isSaving || title.trim().length < 2 || title.trim().length > 100}
				>
					{isSaving ? 'Renaming' : 'Rename'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
