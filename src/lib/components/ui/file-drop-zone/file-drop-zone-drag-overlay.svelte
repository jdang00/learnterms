<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { useFileDropZoneDragOverlay } from './file-drop-zone.svelte.js';
	import type { FileDropZoneDragOverlayProps } from './types.js';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import { Portal } from 'bits-ui';
	import { box, mergeProps } from 'svelte-toolbelt';

	let {
		ref = $bindable(null),
		class: className,
		disabled = false,
		portalProps,
		children,
		...rest
	}: FileDropZoneDragOverlayProps = $props();

	const dragOverlayState = useFileDropZoneDragOverlay({
		disabled: box.with(() => disabled)
	});

	const mergedProps = $derived(mergeProps(dragOverlayState.props, rest));
</script>

<svelte:window
	ondragenter={dragOverlayState.windowProps.ondragenter}
	ondragleave={dragOverlayState.windowProps.ondragleave}
	ondragover={dragOverlayState.windowProps.ondragover}
	ondragend={dragOverlayState.windowProps.ondragend}
	ondrop={dragOverlayState.windowProps.ondrop}
/>

{#if dragOverlayState.dragging}
	<Portal {...portalProps}>
		<div
			bind:this={ref}
			class={cn(
				'animate-in fade-in-0 fixed inset-0 z-50 flex place-items-center justify-center bg-background/70 p-6 duration-150 supports-backdrop-filter:backdrop-blur-sm',
				className
			)}
			{...mergedProps}
		>
			{#if children}
				{@render children()}
			{:else}
				<div
					class="pointer-events-none absolute inset-4 rounded-[2rem] border-2 border-dashed border-primary/60"
				></div>
				<div class="flex flex-col place-items-center justify-center gap-4 text-center">
					<div
						class="flex size-16 animate-bounce place-items-center justify-center rounded-3xl bg-primary text-primary-foreground motion-reduce:animate-none"
					>
						<UploadIcon class="size-7" />
					</div>
					<span class="text-xl font-semibold">Drop files to upload</span>
				</div>
			{/if}
		</div>
	</Portal>
{/if}
