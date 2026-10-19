<script lang="ts">
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import type { Doc } from '../../../convex/_generated/dataModel';
	import { fileKind } from './contentLibrary';
	import { Button } from '#lib/components/ui/button/index.js';
	import { LoadingState } from '#lib/components/ui/spinner/index.js';

	let {
		document,
		viewUrl,
		isOpening
	}: {
		document: Doc<'contentLib'>;
		viewUrl: string;
		isOpening: boolean;
	} = $props();

	const kind = $derived(fileKind(document));

	function openSource() {
		window.open(viewUrl, '_blank', 'noreferrer');
	}
</script>

<div class="h-full overflow-hidden surface-muted">
	{#if isOpening}
		<LoadingState label="Loading source…" class="h-full min-h-72" />
	{:else if viewUrl && document.metadata?.mimeType === 'application/pdf'}
		<iframe class="h-full min-h-[60vh] w-full" title={`${document.title} source`} src={viewUrl}
		></iframe>
	{:else if viewUrl && document.metadata?.mimeType?.startsWith('image/')}
		<div class="flex h-full min-h-72 items-center justify-center p-4">
			<img class="max-h-full max-w-full rounded-xl shadow-md" src={viewUrl} alt={document.title} />
		</div>
	{:else if viewUrl}
		<div class="flex h-full min-h-72 flex-col items-center justify-center p-8 text-center">
			<div class="mb-4 rounded-2xl p-5 {kind.tint} {kind.accent}">
				<kind.icon size={34} />
			</div>
			<p class="font-semibold">Best viewed full-screen</p>
			<p class="mt-1 max-w-xs text-sm text-foreground/60">
				{kind.label} files don't preview inline here.
			</p>
			<Button size="sm" class="mt-4 gap-2" onclick={openSource}>
				<ExternalLink size={14} />
				Open {kind.label.toLowerCase()}
			</Button>
		</div>
	{:else}
		<div class="flex h-full min-h-72 flex-col items-center justify-center p-8 text-center">
			<div class="mb-3 rounded-2xl bg-muted p-4 text-foreground/40">
				<TriangleAlert size={26} />
			</div>
			<p class="text-sm font-semibold">No source available</p>
			<p class="mt-1 max-w-xs text-xs text-foreground/50">
				This file is missing its storage key. Try re-uploading it.
			</p>
		</div>
	{/if}
</div>
