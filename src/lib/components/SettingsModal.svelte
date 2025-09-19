<script lang="ts">
	import { RotateCcw } from 'lucide-svelte';
	let { qs = $bindable(), isOpen = $bindable(false) } = $props();
</script>

<dialog class="modal max-w-full p-4" class:modal-open={isOpen}>
	<div class="modal-box">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={() => (isOpen = false)}>✕</button
			>
		</form>
		<h3 class="text-lg font-bold">Settings</h3>

		<div class="mt-4 space-y-4">
			<div class="flex justify-between items-center">
				<span>Auto next</span>
				<input
					type="checkbox"
					class="toggle toggle-primary"
					checked={qs.autoNextEnabled}
					onchange={(e) => qs.setAutoNextEnabled((e.currentTarget as HTMLInputElement).checked)}
					aria-label="Auto next"
				/>
			</div>
			<p class="text-xs text-base-content/70">
				Automatically advance to the next question after a correct answer.
			</p>

			<div class="flex justify-between items-center">
				<span>Shuffle options</span>
				<input
					type="checkbox"
					class="toggle toggle-primary"
					checked={qs.optionsShuffleEnabled}
					onchange={(e) =>
						qs.setOptionsShuffleEnabled((e.currentTarget as HTMLInputElement).checked)}
					aria-label="Shuffle options"
				/>
			</div>
			<p class="text-xs text-base-content/70">
				Randomize the order of answer choices across all questions.
			</p>

			<div class="flex justify-between items-center">
				<span>Reset progress</span>
				<button
					class="btn btn-error btn-soft btn-sm"
					onclick={() => {
						isOpen = false;
						qs.isResetModalOpen = true;
					}}
				>
					<RotateCcw size={16} />
					<span class="ml-1 hidden sm:inline">Reset</span>
				</button>
			</div>
			<p class="text-xs text-base-content/70">
				Clears selections, eliminations, flags, and saved progress for this chapter.
			</p>

			<div class="mt-6 border-t border-base-300 pt-4">
				<h4 class="font-semibold mb-2">Shortcuts</h4>
				<div class="font-mono flex flex-col gap-2">
					<div class="flex items-center gap-4 justify-between">
						<kbd class="kbd kbd-sm">tab</kbd>
						<span>Solution</span>
					</div>
					<div class="flex items-center gap-4 justify-between">
						<kbd class="kbd kbd-sm">shift + s</kbd>
						<span>Shuffle</span>
					</div>
					<div class="flex items-center gap-4 justify-between">
						<kbd class="kbd kbd-sm">f</kbd>
						<span>Flag</span>
					</div>
					<div class="flex items-center gap-4 justify-between">
						<kbd class="kbd kbd-sm">enter</kbd>
						<span>Check</span>
					</div>
				<div class="flex items-center gap-4 justify-between">
					<div class="flex gap-1">
						<kbd class="kbd kbd-sm">0-9</kbd>

					</div>
					<span>Select options</span>
				</div>
					<div class="flex items-center gap-4 justify-between">
						<kbd class="kbd kbd-sm">arrows</kbd>
						<span>Navigation</span>
					</div>
					<div class="flex items-center gap-4 justify-between">
						<kbd class="kbd kbd-sm">esc</kbd>
						<span>Clear</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</dialog>
