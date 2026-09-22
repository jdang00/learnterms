<script lang="ts">
	import { X, type Check as IconType } from 'lucide-svelte';
	import { onMount, tick, type Snippet } from 'svelte';
	import { sidePanel, type SidePanelId } from './state.svelte';

	let {
		id,
		title,
		icon: Icon,
		focus = '',
		children
	}: {
		id: SidePanelId;
		title: string;
		icon: typeof IconType;
		focus?: string;
		children: Snippet;
	} = $props();
	let aside: HTMLElement;
	const open = $derived(sidePanel.current === id);

	onMount(() => sidePanel.restore());
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
	class="fixed inset-y-0 right-0 z-40 w-full max-w-sm p-2 transition-[translate,width,margin] duration-300 ease-out lg:static lg:z-auto lg:max-w-none lg:shrink-0 lg:overflow-hidden lg:p-0 {open
		? 'translate-x-0 lg:w-[22rem]'
		: 'translate-x-full lg:w-0 lg:translate-x-0 lg:-ms-8'}"
>
	<div
		class="flex h-full flex-col rounded-3xl border border-base-300 bg-base-100 shadow-xl lg:w-[22rem] lg:shadow-none"
	>
		<header class="flex items-center justify-between px-5 pt-4 pb-2">
			<h2 class="flex items-center gap-2 font-semibold">
				<Icon size={18} class="text-info" />{title}
			</h2>
			<button
				type="button"
				class="btn btn-sm btn-circle btn-ghost"
				aria-label="Close {title.toLowerCase()}"
				onclick={() => sidePanel.set(null)}><X size={18} /></button
			>
		</header>
		{@render children()}
	</div>
</aside>
