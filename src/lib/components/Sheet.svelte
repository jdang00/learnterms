<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from 'lucide-svelte';
	import { sheetDrag } from '$lib/utils/sheetDrag';

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

	const uid = $props.id();
	let dialog: HTMLDialogElement;
	let offset = $state(0);
	let dragging = $state(false);

	$effect(() => {
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});

	function handleClose() {
		offset = 0;
		expanded = false;
		if (open) open = false;
		onclose?.();
	}

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
</script>

<dialog
	bind:this={dialog}
	class="modal modal-bottom {desktop === 'center' ? 'sm:modal-middle' : ''}"
	aria-labelledby="{uid}-title"
	aria-describedby={description ? `${uid}-description` : undefined}
	onclose={handleClose}
>
	<div
		class="modal-box flex flex-col overflow-hidden p-0 rounded-t-3xl {desktop === 'center'
			? 'sm:rounded-2xl'
			: ''} {width} {expanded
			? 'h-[92dvh] max-h-[92dvh]'
			: expandable
				? 'max-h-[60dvh]'
				: 'max-h-[85dvh]'}"
		style:translate={offset ? `0 ${offset}px` : undefined}
		style:transition={dragging ? 'none' : 'translate 200ms ease-out, height 200ms ease-out'}
	>
		<header class="shrink-0 px-5 pt-2" use:sheetDrag={drag}>
			<div
				class="mx-auto mb-1 h-1.5 w-10 rounded-full bg-base-300 {desktop === 'center'
					? 'sm:hidden'
					: ''}"
				aria-hidden="true"
			></div>
			<div class="flex min-h-11 items-center justify-between gap-2">
				<div class="min-w-0">
					<h2 id="{uid}-title" class="truncate text-lg font-semibold">{title}</h2>
					{#if description}
						<p id="{uid}-description" class="text-sm text-base-content/60">{description}</p>
					{/if}
				</div>
				<div class="flex shrink-0 items-center gap-1">
					{@render actions?.()}
					<form method="dialog">
						<button class="btn btn-ghost btn-circle size-11 -me-2" aria-label="Close {title}">
							<X size={18} />
						</button>
					</form>
				</div>
			</div>
		</header>
		<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
			{@render children()}
		</div>
		{#if footer}
			<footer
				class="shrink-0 border-t border-base-300 px-5 pt-3"
				style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
			>
				{@render footer()}
			</footer>
		{:else}
			<div class="shrink-0" style="height: env(safe-area-inset-bottom, 0px);"></div>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button tabindex="-1" aria-label="Close {title}">close</button>
	</form>
</dialog>
