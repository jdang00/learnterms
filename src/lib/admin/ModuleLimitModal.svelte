<script lang="ts">
	import { TriangleAlert, BookOpen, Layers, Brain } from 'lucide-svelte';

	let { isOpen, onClose }: { isOpen: boolean; onClose: () => void } = $props();
</script>

<dialog class="modal" class:modal-open={isOpen}>
	<div class="modal-box rounded-2xl">
		<h3 class="font-bold text-lg flex items-center gap-2 text-warning">
			<TriangleAlert />
			Module Limit Reached
		</h3>
		<p class="py-4">
			To ensure optimal learning retention, modules are limited to <strong>150 questions</strong>.
		</p>
		
		<div class="bg-base-200/50 p-4 rounded-xl mb-6">
			<div class="flex items-start gap-3 mb-2">
				<Brain size={20} class="text-primary mt-1" />
				<div>
					<h4 class="font-bold text-sm">Why this limit?</h4>
					<p class="text-xs text-base-content/70 mt-1">
						Cognitive load theory suggests that breaking content into smaller, focused chunks improves long-term retention and reduces study fatigue.
					</p>
				</div>
			</div>
		</div>

		<div class="space-y-4 mb-4">
			<div class="flex gap-3">
				<Layers class="shrink-0 text-info" size={20} />
				<div>
					<div class="font-bold text-sm">Split for Better Stats</div>
					<div class="text-xs text-base-content/70">Smaller modules give students more granular feedback on their weak areas.</div>
				</div>
			</div>
			<div class="flex gap-3">
				<BookOpen class="shrink-0 text-secondary" size={20} />
				<div>
					<div class="font-bold text-sm">High-Yield Studying</div>
					<div class="text-xs text-base-content/70">Students can master one topic completely before moving to the next.</div>
				</div>
			</div>
		</div>

		<div class="modal-action">
			<button class="btn rounded-full" onclick={onClose}>Understood</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={onClose}>close</button>
	</form>
</dialog>
