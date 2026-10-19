<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Eye from '@lucide/svelte/icons/eye';
	import ToolCase from '@lucide/svelte/icons/tool-case';
	import type { DockSurface } from '../layouts';
	import { BONE, MOCK, PHONE } from './constants';

	// Skeleton of the module page part each zone lives in, so the preview reads in context.
	let { kind, preview }: { kind: 'sidebar' | 'question'; preview: DockSurface } = $props();
</script>

{#snippet optionBone(width: number)}
	<span class="flex h-7 items-center gap-2 rounded-full border border-foreground/10 px-2.5">
		<span class="size-3 shrink-0 rounded-full border border-foreground/15"></span>
		<span class="h-1.5 {BONE}" style="width: {width}%"></span>
	</span>
{/snippet}

{#if kind === 'sidebar'}
	{#if preview === 'desktop'}
		<div
			class="flex flex-col gap-2.5 {MOCK} p-3 pb-12 sm:col-start-1 sm:row-start-2"
			aria-label="Sidebar"
		>
			<span class="h-2 w-10 {BONE}"></span>
			<span class="flex items-center gap-1.5">
				<span class="size-4 shrink-0 {BONE}"></span>
				<span class="h-2.5 w-3/4 {BONE}"></span>
			</span>
			<span class="flex flex-col gap-1.5 rounded-xl border border-foreground/10 p-2">
				<span class="h-1.5 w-1/2 {BONE}"></span>
				<span class="h-1 w-full {BONE}"
					><span class="block h-1 w-1/6 rounded-full bg-foreground/15"></span></span
				>
			</span>
			<span class="h-1.5 w-2/3 {BONE}"></span>
		</div>
	{:else}
		<div
			class="mx-auto flex w-full max-w-[21rem] flex-col gap-2 {PHONE} px-4 pb-12 pt-4 sm:col-start-1 sm:row-start-2"
			aria-label="Phone"
		>
			<span
				class="-mx-1 flex items-center gap-1.5 border-b border-foreground/10 pb-2"
				aria-label="Top bar"
			>
				<ChevronLeft size={14} class="shrink-0 text-foreground/35" />
				<span class="flex flex-1 flex-col gap-1">
					<span class="h-2 w-3/4 {BONE}"></span>
					<span class="h-1.5 w-1/3 {BONE}"></span>
				</span>
				<span class="size-5 shrink-0 rounded-full border-2 border-foreground/15"></span>
				<Eye size={14} class="shrink-0 text-foreground/35" />
				<span
					class="grid size-7 shrink-0 place-items-center rounded-full text-primary-ink ring-1 ring-primary/40"
					title="The Tools button in the top bar opens the sheet below"
				>
					<ToolCase size={14} />
				</span>
			</span>
			<span class="h-2.5 w-full {BONE}"></span>
			{@render optionBone(40)}
		</div>
	{/if}
{:else if preview === 'desktop'}
	<div
		class="flex flex-col gap-2 {MOCK} p-3 pb-12 sm:col-start-2 sm:row-start-2"
		aria-label="Question"
	>
		<span class="mb-1 flex gap-1 overflow-hidden rounded-full border border-foreground/10 p-1">
			{#each { length: 12 }, i (i)}
				<span
					class="size-3.5 shrink-0 rounded-full {i === 3
						? 'bg-foreground/15'
						: 'bg-foreground/[0.06]'}"
				></span>
			{/each}
		</span>
		<span class="h-2.5 w-11/12 {BONE}"></span>
		<span class="mb-1 h-2.5 w-2/3 {BONE}"></span>
		{#each { length: 2 }, i (i)}
			{@render optionBone([45, 30][i])}
		{/each}
	</div>
{:else}
	<div
		class="mx-auto flex w-full max-w-[21rem] flex-col gap-2 {PHONE} px-4 pb-12 pt-4 sm:col-start-2 sm:row-start-2"
		aria-label="Phone"
	>
		<span class="h-2.5 w-full {BONE}"></span>
		<span class="mb-1 h-2.5 w-2/3 {BONE}"></span>
		{@render optionBone(50)}
	</div>
{/if}
