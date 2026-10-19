<script lang="ts">
	import './markdown-preview.css';
	import X from '@lucide/svelte/icons/x';
	import { sanitizeHtml } from '#lib/utils/sanitizeHtml.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';

	let {
		html,
		label,
		onClose
	}: {
		html: string;
		label: string;
		onClose: () => void;
	} = $props();
</script>

<Dialog.Root
	open={Boolean(html)}
	onOpenChange={(open) => {
		if (!open) onClose();
	}}
>
	<Dialog.Content
		showCloseButton={false}
		aria-describedby={undefined}
		class="inset-0 top-0 left-0 z-[70] flex h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-background p-0 ring-0 shadow-none data-open:zoom-in-100 data-closed:zoom-out-100 sm:max-w-none"
	>
		<div class="flex items-center gap-3 border-b border-border px-5 py-3">
			<div>
				<Dialog.Title class="text-sm font-semibold">{label}</Dialog.Title>
				<p class="text-xs text-foreground/50">Fullscreen table preview</p>
			</div>
			<div class="flex-1"></div>
			<Button
				variant="ghost"
				tone="neutral"
				size="sm"
				shape="circle"
				onclick={onClose}
				aria-label="Close table preview"
			>
				<X size={16} />
			</Button>
		</div>
		<div class="fullscreen-table markdown-preview flex-1 overflow-auto p-6 pb-24">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html sanitizeHtml(html)}
		</div>
	</Dialog.Content>
</Dialog.Root>

<style>
	/* Shared markdown styles come from markdown-preview.css; fullscreen lets cells wrap and hides the expand button. */
	.fullscreen-table {
		scroll-padding-bottom: 6rem;
	}

	.fullscreen-table :global(.table-fullscreen) {
		display: none;
	}

	.fullscreen-table :global(table) {
		width: 100%;
		table-layout: auto;
		border-collapse: collapse;
		font-size: 0.95rem;
	}

	.fullscreen-table :global(th),
	.fullscreen-table :global(td) {
		white-space: normal;
		overflow-wrap: break-word;
		word-break: break-word;
	}
</style>
