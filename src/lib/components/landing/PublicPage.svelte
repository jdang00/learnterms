<script lang="ts">
	import type { Snippet } from 'svelte';
	import PublicBackdrop from './PublicBackdrop.svelte';

	let {
		title,
		lede,
		width = 'wide',
		intro,
		actions,
		children
	}: {
		title: string;
		lede?: string;
		width?: 'narrow' | 'wide';
		intro?: Snippet;
		actions?: Snippet;
		children?: Snippet;
	} = $props();
</script>

<div class="relative isolate overflow-hidden pb-24">
	<PublicBackdrop />

	<div
		id="main-content"
		class="mx-auto px-5 sm:px-8 {width === 'narrow' ? 'max-w-3xl' : 'max-w-6xl lg:px-12'}"
	>
		<header class="pt-14 pb-10 sm:pt-20 sm:pb-12">
			<h1 class="text-balance text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
			{#if lede}
				<p class="mt-4 max-w-2xl text-lg leading-relaxed text-base-content/75">{lede}</p>
			{/if}
			{@render intro?.()}
			{#if actions}
				<div class="mt-8 flex flex-wrap items-center gap-3">{@render actions()}</div>
			{/if}
		</header>

		{@render children?.()}
	</div>
</div>
