<script lang="ts">
	import { RotateCcw, SlidersHorizontal } from 'lucide-svelte';
	import { getDockPreferences } from './quiz-dock/dockPreferences.svelte';
	import Sheet from './Sheet.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Kbd } from '$lib/components/ui/kbd';
	import { Switch } from '$lib/components/ui/switch';
	let { qs = $bindable(), isOpen = $bindable(false) } = $props();
	const dockPreferences = getDockPreferences();
</script>

<Sheet bind:open={isOpen} title="Settings">
	<div class="space-y-4">
		<div class="flex justify-between items-center">
			<span>Auto next</span>
			<Switch
				checked={qs.autoNextEnabled}
				onCheckedChange={(checked) => qs.setAutoNextEnabled(checked)}
				aria-label="Auto next"
			/>
		</div>
		<p class="text-xs text-foreground/70">
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
		<p class="text-xs text-foreground/70">
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
			<p class="text-xs text-foreground/70">
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
		<p class="text-xs text-foreground/70">
			Clears selections, eliminations, flags, and saved progress for this chapter.
		</p>

		<div class="mt-6 border-t border-border pt-4 pointer-coarse:hidden">
			<h4 class="font-semibold mb-2">Shortcuts</h4>
			<div class="font-mono flex flex-col gap-2">
				<div class="flex items-center gap-4 justify-between">
					<Kbd>h</Kbd><span>Highlight mode</span>
				</div>
				<div class="flex items-center gap-4 justify-between">
					<Kbd>ctrl / ⌘ + z</Kbd><span>Undo highlight</span>
				</div>
				<div class="flex items-center gap-4 justify-between">
					<Kbd>tab</Kbd>
					<span>Rationale</span>
				</div>
				<div class="flex items-center gap-4 justify-between">
					<Kbd>shift + s</Kbd>
					<span>Shuffle</span>
				</div>
				<div class="flex items-center gap-4 justify-between">
					<Kbd>f</Kbd>
					<span>Flag</span>
				</div>
				<div class="flex items-center gap-4 justify-between">
					<Kbd>enter</Kbd>
					<span>Check</span>
				</div>
				<div class="flex items-center gap-4 justify-between">
					<div class="flex gap-1">
						<Kbd>0-9</Kbd>
					</div>
					<span>Select options</span>
				</div>
				<div class="flex items-center gap-4 justify-between">
					<Kbd>arrows</Kbd>
					<span>Navigation</span>
				</div>
				<div class="flex items-center gap-4 justify-between">
					<Kbd>esc</Kbd>
					<span>Clear</span>
				</div>
			</div>
		</div>
	</div>
</Sheet>
