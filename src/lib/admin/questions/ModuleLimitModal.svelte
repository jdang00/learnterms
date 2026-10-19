<script lang="ts">
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Layers from '@lucide/svelte/icons/layers';
	import Brain from '@lucide/svelte/icons/brain';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';

	let { isOpen, onClose }: { isOpen: boolean; onClose: () => void } = $props();
</script>

<Dialog.Root
	open={isOpen}
	onOpenChange={(o) => {
		if (!o) onClose();
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2 text-lg font-bold text-warning-ink">
				<TriangleAlert class="text-warning" />
				Module Limit Reached
			</Dialog.Title>
		</Dialog.Header>
		<p>
			To ensure optimal learning retention, modules are limited to <strong>150 questions</strong>.
		</p>

		<div class="bg-muted/50 p-4 rounded-xl">
			<div class="flex items-start gap-3 mb-2">
				<Brain size={20} class="text-primary mt-1" />
				<div>
					<h4 class="font-bold text-sm">Why this limit?</h4>
					<p class="text-xs text-foreground/70 mt-1">
						Cognitive load theory suggests that breaking content into smaller, focused chunks
						improves long-term retention and reduces study fatigue.
					</p>
				</div>
			</div>
		</div>

		<div class="space-y-4">
			<div class="flex gap-3">
				<Layers class="shrink-0 text-info" size={20} />
				<div>
					<div class="font-bold text-sm">Split for Better Stats</div>
					<div class="text-xs text-foreground/70">
						Smaller modules give students more granular feedback on their weak areas.
					</div>
				</div>
			</div>
			<div class="flex gap-3">
				<BookOpen class="shrink-0 text-secondary" size={20} />
				<div>
					<div class="font-bold text-sm">High-Yield Studying</div>
					<div class="text-xs text-foreground/70">
						Students can master one topic completely before moving to the next.
					</div>
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="soft" tone="neutral" onclick={onClose}>Understood</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
