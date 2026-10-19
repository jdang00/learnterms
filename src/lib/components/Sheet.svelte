<script lang="ts">
	import type { Snippet } from 'svelte';
	import { untrack } from 'svelte';
	import { Dialog } from 'bits-ui';
	import { X } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { sheetDrag } from '$lib/utils/sheetDrag';
	import { cn } from '$lib/utils.js';

	// A bottom sheet on phones (drag the handle down to dismiss, up to expand when allowed)
	// and a centered dialog from sm up unless `desktop` says otherwise.
	let {
		open = $bindable(false),
		expanded = $bindable(false),
		title,
		description,
		expandable = false,
		desktop = 'center',
		width = 'sm:max-w-md',
		onclose,
		actions,
		footer,
		children
	}: {
		open?: boolean;
		expanded?: boolean;
		title: string;
		description?: string;
		expandable?: boolean;
		desktop?: 'center' | 'bottom';
		width?: string;
		onclose?: () => void;
		actions?: Snippet;
		footer?: Snippet;
		children: Snippet;
	} = $props();

	let offset = $state(0);
	let dragging = $state(false);
	let wasOpen = false;

	// Fire onclose for every close, whether the user dismissed it or the parent set open = false.
	$effect(() => {
		const isOpen = open;
		untrack(() => {
			if (wasOpen && !isOpen) {
				offset = 0;
				expanded = false;
				onclose?.();
			}
			wasOpen = isOpen;
		});
	});

	const isPhone = () => desktop === 'bottom' || !matchMedia('(min-width: 640px)').matches;

	const drag = {
		enabled: isPhone,
		onmove: (dy: number) => {
			dragging = true;
			// Resist upward drags so the sheet feels anchored, and allow them only toward expanding.
			offset = dy < 0 ? (expandable && !expanded ? dy * 0.4 : dy * 0.1) : dy;
		},
		onend: (dy: number, velocity: number) => {
			dragging = false;
			offset = 0;
			if (dy > 96 || velocity > 0.6) {
				if (expanded) expanded = false;
				else open = false;
			} else if (expandable && !expanded && (dy < -48 || velocity < -0.6)) {
				expanded = true;
			}
		}
	};

	const centered = $derived(desktop === 'center');
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay
			class="fixed inset-0 z-50 bg-black/40 duration-200 supports-backdrop-filter:backdrop-blur-[2px] data-closed:animate-out data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0"
		/>
		<Dialog.Content
			class={cn(
				'fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full flex-col overflow-hidden rounded-t-3xl border border-b-0 border-border bg-popover text-popover-foreground shadow-2xl shadow-black/15 outline-none',
				'duration-200 data-closed:animate-out data-closed:slide-out-to-bottom data-open:animate-in data-open:slide-in-from-bottom',
				centered &&
					'sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-3xl sm:border-b sm:data-closed:fade-out-0 sm:data-closed:slide-out-to-bottom-4 sm:data-closed:zoom-out-95 sm:data-open:fade-in-0 sm:data-open:slide-in-from-bottom-4 sm:data-open:zoom-in-95',
				width,
				expanded ? 'h-[92dvh] max-h-[92dvh]' : expandable ? 'max-h-[60dvh]' : 'max-h-[85dvh]'
			)}
			style="{offset ? `translate: 0 ${offset}px;` : ''} transition: {dragging
				? 'none'
				: 'translate 200ms ease-out, height 200ms ease-out'};"
		>
			<header class="shrink-0 px-5 pt-2" use:sheetDrag={drag}>
				<div
					class={cn(
						'mx-auto mb-1 h-1.5 w-10 rounded-full bg-muted-strong',
						centered && 'sm:hidden'
					)}
					aria-hidden="true"
				></div>
				<div class="flex min-h-11 items-center justify-between gap-2">
					<div class="min-w-0">
						<Dialog.Title class="truncate text-lg font-semibold">{title}</Dialog.Title>
						{#if description}
							<Dialog.Description class="text-sm text-muted-foreground">
								{description}
							</Dialog.Description>
						{/if}
					</div>
					<div class="flex shrink-0 items-center gap-1">
						{@render actions?.()}
						<Dialog.Close>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="ghost"
									tone="neutral"
									shape="circle"
									class="-me-2 size-11"
									aria-label="Close {title}"
								>
									<X size={18} />
								</Button>
							{/snippet}
						</Dialog.Close>
					</div>
				</div>
			</header>
			<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
				{@render children()}
			</div>
			{#if footer}
				<footer
					class="shrink-0 border-t border-border px-5 pt-3"
					style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
				>
					{@render footer()}
				</footer>
			{:else}
				<div class="shrink-0" style="height: env(safe-area-inset-bottom, 0px);"></div>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
