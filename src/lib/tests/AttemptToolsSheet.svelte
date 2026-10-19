<script lang="ts">
	import Sheet from '$lib/components/Sheet.svelte';
	import { Button } from '$lib/components/ui/button';
	import { TOOL_TILE_CLASS } from '$lib/components/quiz-dock/dockStyles';
	import { sidePanel } from '$lib/components/side-panel/state.svelte';
	import Calculator from '@lucide/svelte/icons/calculator';
	import StickyNote from '@lucide/svelte/icons/sticky-note';
	import Save from '@lucide/svelte/icons/save';

	let {
		open = $bindable(false),
		showNotes,
		onSave
	}: { open?: boolean; showNotes: boolean; onSave: () => void } = $props();
</script>

<Sheet bind:open title="Tools" desktop="bottom" width="sm:max-w-lg sm:mx-auto">
	<ul class="grid grid-cols-2 gap-2 pt-1">
		{#if showNotes}
			<li>
				<button
					type="button"
					class="{TOOL_TILE_CLASS} {sidePanel.current === 'notes'
						? 'bg-info/12 text-info-ink'
						: ''}"
					aria-pressed={sidePanel.current === 'notes'}
					onclick={() => {
						open = false;
						sidePanel.toggle('notes', 'mobile');
					}}><StickyNote size={22} class="text-info" /> Notes</button
				>
			</li>
		{/if}
		<li>
			<button
				type="button"
				class="{TOOL_TILE_CLASS} {sidePanel.current === 'calculator'
					? 'bg-info/12 text-info-ink'
					: ''}"
				aria-pressed={sidePanel.current === 'calculator'}
				onclick={() => {
					open = false;
					sidePanel.toggle('calculator', 'mobile');
				}}><Calculator size={22} class="text-info" /> Calculator</button
			>
		</li>
	</ul>
	<Button
		variant="ghost"
		tone="neutral"
		size="lg"
		class="mt-4 w-full text-foreground/70"
		onclick={onSave}
	>
		<Save size={16} /> Save progress now
	</Button>
</Sheet>
