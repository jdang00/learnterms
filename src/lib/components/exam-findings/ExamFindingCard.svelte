<script lang="ts">
	import StickyNote from '@lucide/svelte/icons/sticky-note';
	import X from '@lucide/svelte/icons/x';
	import {
		WIDE_GRID_COLUMNS,
		type ExamCell,
		type ExamFindingView,
		type ExamSectionView
	} from '$lib/examFindings/view';
	import { worth4DotSummary } from '$lib/examFindings/worth4dot';
	import { EXAM_GROUP_STYLE } from './groups';
	import Worth4DotDiagram from './Worth4DotDiagram.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';

	let {
		view,
		compact = false,
		reveal = true,
		class: className = ''
	}: {
		view: ExamFindingView;
		compact?: boolean;
		// False keeps interpretations hidden on boxes that quiz the pattern.
		reveal?: boolean;
		class?: string;
	} = $props();

	const style = $derived(EXAM_GROUP_STYLE[view.group]);
	const uid = $props.id();
	const note = $derived(view.note?.trim() ?? '');
	let noteClamped = $state(false);
	let notesOpen = $state(false);
	// Eye rows read as small tags; structure rows (Cornea, A/C) stay plain.
	const isTag = (label: string) => ['OD', 'OS', 'OU'].includes(label);
	// A section label that repeats the box title ("Cover test" in Cover test) adds nothing.
	const sectionLabel = (section: ExamSectionView) =>
		section.label && section.label.toLowerCase() !== view.title.toLowerCase()
			? section.label
			: undefined;

	function watchClamp(element: HTMLElement) {
		const measure = () => (noteClamped = element.scrollHeight > element.clientHeight + 1);
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		measure();
		return () => observer.disconnect();
	}
</script>

{#snippet value(cell: ExamCell)}
	<span class="text-foreground {cell.wide ? '' : 'font-mono tabular-nums'}">
		{#if cell.prefix}<span class="text-foreground/40">{cell.prefix}</span>{/if}{cell.value}
		{#if cell.suffix}<span class="text-[0.7rem] text-foreground/45">{cell.suffix}</span>{/if}
	</span>
{/snippet}

{#snippet rowLabel(label: string)}
	{#if isTag(label)}
		<span
			class="inline-block rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.68rem] font-semibold text-foreground/70"
			>{label}</span
		>
	{:else}
		<span class="text-xs font-medium text-foreground/70">{label}</span>
	{/if}
{/snippet}

<article
	class="border border-border bg-background shadow-xs {compact
		? 'rounded-xl'
		: 'rounded-2xl'} {className}"
>
	<header
		class="flex items-center border-b border-muted bg-muted/40 {compact
			? 'gap-1.5 rounded-t-xl px-2.5 py-1'
			: 'gap-2 rounded-t-2xl px-3.5 py-2'}"
	>
		<span
			class="grid shrink-0 place-items-center rounded-full {compact
				? 'size-4'
				: 'size-6'} {style.badge}"
		>
			<style.icon size={compact ? 10 : 13} />
		</span>
		<h3 class="min-w-0 line-clamp-2 font-semibold leading-snug {compact ? 'text-xs' : 'text-sm'}">
			{view.title}
		</h3>
	</header>
	<div
		class="@container {compact ? 'space-y-2 px-2.5 py-2 text-xs' : 'space-y-3 px-3.5 py-3 text-sm'}"
	>
		{#each view.sections as section, index (index)}
			{#if section.kind === 'grid'}
				{@const label = sectionLabel(section)}
				{@const stacks = section.columns.length > WIDE_GRID_COLUMNS}
				{#if stacks}
					<!-- Wide grids read as one line per row on narrow boxes: OD -2.25 -0.75 ×180 · Add +1.50 -->
					<div class="space-y-1.5 @lg:hidden">
						{#if label}<p class="text-[0.7rem] font-medium text-foreground/50">{label}</p>{/if}
						<ul class="space-y-1">
							{#each section.rows as row (row.label)}
								<li class="flex items-baseline gap-2">
									<span class="shrink-0">{@render rowLabel(row.label)}</span>
									<span class="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
										{#each row.cells as cell, cellIndex (cellIndex)}
											{#if cell?.value}
												{@const column = section.columns[cellIndex]}
												<span class="whitespace-nowrap">
													{#if column.bare}<span class="sr-only">{column.label}</span>{:else}<span
															class="text-[0.7rem] text-foreground/50">{column.label}</span
														>{/if}
													{@render value(cell)}
												</span>
											{/if}
										{/each}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				<div class="-mx-1 overflow-x-auto px-1 {stacks ? 'hidden @lg:block' : ''}">
					<table class="w-full border-collapse text-left">
						<thead>
							<tr class="text-[0.7rem] text-foreground/50">
								<th
									scope="col"
									class="sticky left-0 w-px bg-background pb-1 pr-3 font-medium whitespace-nowrap"
									>{#if label}{label}{:else}<span class="sr-only">Row</span>{/if}</th
								>
								{#each section.columns as column (column.key)}
									<th scope="col" class="pb-1 pr-3 font-medium whitespace-nowrap">{column.label}</th
									>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each section.rows as row (row.label)}
								<tr class="border-t border-muted/80 first:border-t-0">
									<th
										scope="row"
										class="sticky left-0 bg-background {compact
											? 'py-0.5'
											: 'py-1.5'} pr-3 align-top whitespace-nowrap"
									>
										{@render rowLabel(row.label)}
									</th>
									{#each row.cells as cell, cellIndex (cellIndex)}
										<td class="{compact ? 'py-0.5' : 'py-1.5'} pr-3 align-top">
											{#if cell}{@render value(cell)}{:else}<span
													class="text-foreground/25"
													aria-hidden="true">–</span
												><span class="sr-only">Not recorded</span>{/if}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else if section.kind === 'fields'}
				{@const label = sectionLabel(section)}
				<div>
					{#if label}<p class="mb-1 text-[0.7rem] font-medium text-foreground/50">{label}</p>{/if}
					<dl class="flex flex-wrap gap-x-6 gap-y-2">
						{#each section.items as item (item.label)}
							<div class={item.wide ? 'basis-full' : ''}>
								<dt class="text-[0.7rem] text-foreground/50">{item.label}</dt>
								<dd>{@render value(item)}</dd>
							</div>
						{/each}
					</dl>
				</div>
			{:else if section.kind === 'worth4dot'}
				<div class="grid grid-cols-2 gap-3">
					{#each section.rows as row (row.label)}
						{@const summary = worth4DotSummary(row, section.redEye)}
						<figure class="min-w-0">
							<figcaption class="mb-1 text-[0.7rem] text-foreground/50">{row.label}</figcaption>
							<Worth4DotDiagram reading={row} redEye={section.redEye} class="max-w-44 rounded-lg" />
							{#if reveal || !view.hideInterpretation}
								<p class="mt-1.5 font-medium leading-snug">{summary.title}</p>
								<p class="text-[0.7rem] leading-snug text-foreground/55">
									{[summary.dots, summary.detail].filter(Boolean).join(' · ')}
								</p>
							{/if}
						</figure>
					{/each}
				</div>
			{:else}
				<div>
					<p class="text-[0.7rem] text-foreground/50">{section.label}</p>
					<p class="whitespace-pre-line">{section.value}</p>
				</div>
			{/if}
		{/each}
		{#if note}
			<div class="flex gap-2 rounded-lg bg-info/8 {compact ? 'px-2 py-1' : 'px-2.5 py-1.5'}">
				<StickyNote size={compact ? 12 : 13} class="mt-0.5 shrink-0 text-info" aria-hidden="true" />
				<div class="min-w-0 flex-1">
					<p class="line-clamp-3 break-words whitespace-pre-line" {@attach watchClamp}>
						<span class="sr-only">Note: </span>{note}
					</p>
					{#if noteClamped}
						<Button
							variant="link"
							tone="info"
							class="text-[0.7rem] font-medium"
							aria-haspopup="dialog"
							onclick={() => (notesOpen = true)}>Read full note</Button
						>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</article>

{#if note}
	<Dialog.Root bind:open={notesOpen}>
		<Dialog.Content sheet class="gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
			<header class="flex items-center gap-3 border-b border-muted px-5 py-4">
				<span class="grid size-9 shrink-0 place-items-center rounded-full bg-info/12 text-info-ink">
					<StickyNote size={16} />
				</span>
				<div class="min-w-0 flex-1">
					<Dialog.Title id="{uid}-note-title" class="font-semibold tracking-tight"
						>Exam note</Dialog.Title
					>
					<p class="truncate text-xs text-foreground/55">{view.title}</p>
				</div>
				<Button
					variant="ghost"
					tone="neutral"
					size="sm"
					shape="circle"
					aria-label="Close note"
					onclick={() => (notesOpen = false)}><X size={16} /></Button
				>
			</header>
			<div
				class="max-h-[60vh] overflow-y-auto px-5 py-5 text-sm leading-relaxed whitespace-pre-wrap break-words"
			>
				{note}
			</div>
			<footer class="flex justify-end border-t border-muted px-5 py-3">
				<Button size="sm" class="px-5" onclick={() => (notesOpen = false)}>Close</Button>
			</footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
