<script lang="ts">
	import { useStudyToolContext } from '$lib/analytics/studyToolContext';
	import { captureStudyTool } from '$lib/analytics/studyTools';
	import { createToolVisibilityTracker } from '$lib/analytics/studyToolEvents';
	import { X, type Check as IconType } from 'lucide-svelte';
	import { onMount, tick, untrack, type Snippet } from 'svelte';
	import { sidePanel, type SidePanelId } from './state.svelte';
	import { sheetDrag } from '$lib/utils/sheetDrag';

	let {
		id,
		title,
		icon: Icon,
		focus = '',
		tall = false,
		children
	}: {
		id: SidePanelId;
		title: string;
		icon: typeof IconType;
		focus?: string;
		// Phones: open taller by default, for panels whose controls need the room (the calculator keypad).
		tall?: boolean;
		children: Snippet;
	} = $props();
	let aside: HTMLElement;
	const open = $derived(sidePanel.current === id);

	const getTelemetryContext = useStudyToolContext();
	const trackVisibility = untrack(() => createToolVisibilityTracker(id, captureStudyTool));
	$effect(() => {
		trackVisibility(open, getTelemetryContext(), sidePanel.source);
	});
	onMount(() => sidePanel.restore());

	// Below md the panel is a bottom sheet so the question stays visible above it.
	let expanded = $state(false);
	let dragOffset = $state(0);
	$effect(() => {
		if (!open) expanded = false;
	});
	const drag = {
		enabled: () => !matchMedia('(min-width: 768px)').matches,
		onmove: (dy: number) => {
			dragOffset = dy < 0 ? (expanded ? dy * 0.1 : dy * 0.4) : dy;
		},
		onend: (dy: number, velocity: number) => {
			dragOffset = 0;
			if (dy > 96 || velocity > 0.6) {
				if (expanded) expanded = false;
				else sidePanel.set(null);
			} else if (!expanded && (dy < -48 || velocity < -0.6)) expanded = true;
		}
	};
	$effect(() => {
		if (!open || !focus) return;
		void tick().then(() => {
			if (matchMedia('(pointer: fine)').matches) aside.querySelector<HTMLElement>(focus)?.focus();
		});
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && open && aside.contains(document.activeElement))
			sidePanel.set(null);
	}}
/>

<aside
	bind:this={aside}
	aria-label={title}
	inert={!open}
	class="fixed bottom-(--keyboard-inset) left-0 right-0 z-[60] max-h-[calc(100dvh-var(--keyboard-inset)-0.5rem)] ease-out md:top-0 md:bottom-0 md:left-auto md:max-h-none md:z-40 md:h-auto md:w-full md:max-w-sm md:p-2 lg:static lg:z-auto lg:max-w-none lg:shrink-0 lg:overflow-hidden lg:p-0 {expanded
		? 'h-[92dvh]'
		: tall
			? 'h-[72dvh]'
			: 'h-[58dvh]'} {open
		? 'translate-y-0 md:translate-x-0 lg:w-[22rem]'
		: 'translate-y-full md:translate-y-0 md:translate-x-full lg:w-0 lg:translate-x-0 lg:-ms-8'}"
	style:translate={dragOffset ? `0 ${dragOffset}px` : undefined}
	style:transition={dragOffset
		? 'none'
		: 'translate 300ms ease-out, width 300ms ease-out, margin 300ms ease-out, height 200ms ease-out'}
>
	<div
		class="flex h-full flex-col rounded-t-3xl border border-b-0 border-base-300 bg-base-100 shadow-[0_-8px_30px_rgb(0_0_0/0.12)] md:rounded-3xl md:border-b md:shadow-xl lg:w-[22rem] lg:shadow-none"
		style="padding-bottom: env(safe-area-inset-bottom, 0px);"
	>
		<header class="px-5 pt-2 pb-2 md:pt-4" use:sheetDrag={drag}>
			<div
				class="mx-auto mb-1 h-1.5 w-10 rounded-full bg-base-300 md:hidden"
				aria-hidden="true"
			></div>
			<div class="flex items-center justify-between">
				<h2 class="flex items-center gap-2 font-semibold">
					<Icon size={18} class="text-info" />{title}
				</h2>
				<button
					type="button"
					class="btn btn-circle btn-ghost size-11 -me-2 md:size-8"
					aria-label="Close {title.toLowerCase()}"
					onclick={() => sidePanel.set(null)}><X size={18} /></button
				>
			</div>
		</header>
		<div class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
			{@render children()}
		</div>
	</div>
</aside>
