<script lang="ts">
	import Sheet from '#lib/components/Sheet.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import Info from '@lucide/svelte/icons/info';
	import Send from '@lucide/svelte/icons/send';
	import type { AttemptRunnerState } from './attempt.svelte';

	let {
		open = $bindable(false),
		runner,
		onConfirm
	}: { open?: boolean; runner: AttemptRunnerState; onConfirm: () => void } = $props();
</script>

<Sheet bind:open title="Submit your test?">
	<div class="space-y-3">
		<p class="text-foreground/70">
			Once submitted, you won't be able to change your answers. You'll be able to review each
			question with the correct answers and rationales.
		</p>
		<div class="grid grid-cols-2 gap-2 text-sm">
			<div class="surface-sm p-3">
				<div class="text-xs text-foreground/50">Answered</div>
				<div class="font-semibold">
					{runner.answeredCount} / {runner.itemCount}
				</div>
			</div>
			<div class="surface-sm p-3">
				<div class="text-xs text-foreground/50">Unanswered</div>
				<div class="font-semibold {runner.unansweredCount > 0 ? 'text-warning-ink' : ''}">
					{runner.unansweredCount}
				</div>
			</div>
		</div>
		{#if runner.unansweredCount > 0}
			<Alert.Root tone="warning">
				<Info size={14} />
				<Alert.Title>You have unanswered questions. They will be marked as incorrect.</Alert.Title>
			</Alert.Root>
		{/if}
	</div>
	{#snippet footer()}
		<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
			<Button variant="outline" tone="neutral" size="lg" onclick={() => (open = false)}>
				Keep working
			</Button>
			<Button
				size="lg"
				class="gap-1"
				onclick={() => {
					open = false;
					onConfirm();
				}}
				disabled={runner.isSubmitting}
			>
				<Send size={14} />
				{runner.isSubmitting ? 'Submitting…' : 'Submit test'}
			</Button>
		</div>
	{/snippet}
</Sheet>
