<script lang="ts">
	import type { Snippet } from 'svelte';
	import Sheet from './Sheet.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';

	let {
		open = $bindable(false),
		title,
		confirmLabel,
		highlightsNote,
		onconfirm,
		children
	}: {
		open?: boolean;
		title: string;
		confirmLabel: string;
		highlightsNote: string;
		onconfirm: (removeHighlights: boolean) => Promise<void>;
		children: Snippet;
	} = $props();

	let removeHighlights = $state(false);
	let resetting = $state(false);
	let error = $state('');

	async function confirm() {
		if (resetting) return;
		resetting = true;
		error = '';
		try {
			await onconfirm(removeHighlights);
			open = false;
		} catch {
			error = 'Could not reset your questions. Please try again.';
		} finally {
			resetting = false;
		}
	}
</script>

<Sheet
	bind:open
	{title}
	onclose={() => {
		removeHighlights = false;
		error = '';
	}}
>
	<p class="text-foreground/80">{@render children()}</p>
	<label class="my-5 flex items-center justify-between gap-4">
		<span
			><span class="block font-medium">Remove highlights</span><span
				class="text-sm text-foreground/60">{highlightsNote}</span
			></span
		>
		<Switch
			aria-label="Remove highlights"
			class="data-checked:bg-warning"
			bind:checked={removeHighlights}
			disabled={resetting}
		/>
	</label>
	{#if error}<p class="text-error-ink mb-3" role="alert">{error}</p>{/if}
	{#snippet footer()}
		<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
			<Button variant="outline" tone="neutral" class="min-h-11" onclick={() => (open = false)}>
				Cancel
			</Button>
			<Button tone="error" class="min-h-11" disabled={resetting} onclick={confirm}
				>{resetting ? 'Resetting…' : confirmLabel}</Button
			>
		</div>
	{/snippet}
</Sheet>
