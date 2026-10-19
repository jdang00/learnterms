<script lang="ts">
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import { getDockPreferences } from './quiz-dock/dockPreferences.svelte';
	import Sheet from './Sheet.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Kbd } from '#lib/components/ui/kbd/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import * as Collapsible from '#lib/components/ui/collapsible/index.js';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	let { qs = $bindable(), isOpen = $bindable(false) } = $props();
	const dockPreferences = getDockPreferences();
	const SHORTCUTS = [
		['enter', 'Check'],
		['esc', 'Clear'],
		['0-9', 'Select option'],
		['←  →', 'Navigate'],
		['tab', 'Rationale'],
		['f', 'Flag'],
		['h', 'Highlight'],
		['⌘/ctrl z', 'Undo highlight'],
		['⇧ s', 'Shuffle']
	] as const;
</script>

<Sheet bind:open={isOpen} title="Settings">
	<div class="space-y-4 pt-2">
		<div class="flex justify-between items-center">
			<span>Auto next</span>
			<Switch
				checked={qs.autoNextEnabled}
				onCheckedChange={(checked) => qs.setAutoNextEnabled(checked)}
				aria-label="Auto next"
			/>
		</div>
		<p class="-mt-2 text-xs text-foreground/70">
			Automatically advance to the next question after a correct answer.
		</p>

		<div class="flex justify-between items-center">
			<span>Shuffle options</span>
			<Switch
				checked={qs.optionsShuffleEnabled}
				onCheckedChange={(checked) => qs.setOptionsShuffleEnabled(checked)}
				aria-label="Shuffle options"
			/>
		</div>
		<p class="-mt-2 text-xs text-foreground/70">
			Randomize the order of answer choices across all questions.
		</p>

		{#if dockPreferences}
			<div class="flex justify-between items-center">
				<span>Quiz dock</span>
				<Button
					variant="soft"
					tone="primary"
					size="sm"
					onclick={() => {
						isOpen = false;
						dockPreferences.open();
					}}
				>
					<SlidersHorizontal size={16} />
					<span class="ml-1">Customize</span>
				</Button>
			</div>
			<p class="-mt-2 text-xs text-foreground/70">
				Choose which tools live in your dock and in the More menu.
			</p>
		{/if}

		<div class="flex justify-between items-center">
			<span>Reset progress</span>
			<Button
				variant="soft"
				tone="error"
				size="sm"
				onclick={() => {
					isOpen = false;
					qs.isResetModalOpen = true;
				}}
			>
				<RotateCcw size={16} />
				<span class="ml-1">Reset</span>
			</Button>
		</div>
		<p class="-mt-2 text-xs text-foreground/70">
			Clears selections, eliminations, flags, and saved progress for this chapter.
		</p>

		<Collapsible.Root class="border-t border-border pt-3 pointer-coarse:hidden">
			<Collapsible.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="group flex w-full items-center justify-between rounded-lg py-1 text-left"
					>
						<span>Keyboard shortcuts</span>
						<ChevronDown
							size={16}
							class="text-foreground/60 transition-transform duration-200 group-data-[state=open]:rotate-180"
						/>
					</button>
				{/snippet}
			</Collapsible.Trigger>
			<Collapsible.Content>
				<dl class="grid grid-cols-2 gap-x-6 gap-y-2 pt-3 text-sm">
					{#each SHORTCUTS as [keys, action] (action)}
						<div class="flex items-center justify-between gap-2">
							<dt class="text-foreground/75">{action}</dt>
							<dd><Kbd>{keys}</Kbd></dd>
						</div>
					{/each}
				</dl>
			</Collapsible.Content>
		</Collapsible.Root>
	</div>
</Sheet>
