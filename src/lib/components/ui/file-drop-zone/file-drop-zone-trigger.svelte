<script lang="ts">
	import { cn } from '#lib/utils.js';
	import { useFileDropZoneTrigger } from './file-drop-zone.svelte.js';
	import { displaySize } from './index.js';
	import type { FileDropZoneTriggerProps } from './types.js';
	import UploadIcon from '@lucide/svelte/icons/upload';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: FileDropZoneTriggerProps = $props();

	const triggerState = useFileDropZoneTrigger();

	// Counts nested enter/leave pairs so the highlight doesn't flicker over child elements.
	let depth = $state(0);
	const dragging = $derived(depth > 0);
</script>

<label
	bind:this={ref}
	data-dragging={dragging || undefined}
	class={cn('group/file-drop-zone-trigger block', className)}
	{...triggerState.props}
	ondragenter={() => (depth += 1)}
	ondragleave={() => (depth = Math.max(0, depth - 1))}
	ondropcapture={() => (depth = 0)}
	{...rest}
>
	{#if children}
		{@render children()}
	{:else}
		<div
			class="graph-stage flex h-48 flex-col place-items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-muted/40 p-6 transition-all duration-200 group-hover/file-drop-zone-trigger:cursor-pointer group-hover/file-drop-zone-trigger:border-primary/40 group-aria-disabled/file-drop-zone-trigger:opacity-50 group-aria-disabled/file-drop-zone-trigger:hover:cursor-not-allowed group-data-dragging/file-drop-zone-trigger:scale-[1.01] group-data-dragging/file-drop-zone-trigger:border-primary group-data-dragging/file-drop-zone-trigger:bg-primary/8"
		>
			<div
				class="flex size-14 place-items-center justify-center rounded-2xl bg-background text-primary-ink ring-1 ring-border transition-transform duration-200 group-data-dragging/file-drop-zone-trigger:-translate-y-1 group-data-dragging/file-drop-zone-trigger:bg-primary group-data-dragging/file-drop-zone-trigger:text-primary-foreground"
			>
				<UploadIcon class="size-6" />
			</div>
			<div class="flex flex-col gap-0.5 text-center">
				<span class="font-semibold">Drop files here, or click to browse</span>
				{#if triggerState.rootState.opts.maxFileSize.current}
					<span class="text-sm text-muted-foreground">
						Up to {displaySize(triggerState.rootState.opts.maxFileSize.current)} each
					</span>
				{/if}
			</div>
		</div>
	{/if}
</label>
