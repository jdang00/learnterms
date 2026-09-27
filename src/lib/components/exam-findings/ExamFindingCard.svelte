<script lang="ts">
	import { StickyNote, X } from 'lucide-svelte';
	import {
		WIDE_GRID_COLUMNS,
		type ExamCell,
		type ExamFindingView,
		type ExamSectionView
	} from '$lib/examFindings/view';
	import { worth4DotSummary } from '$lib/examFindings/worth4dot';
	import { EXAM_GROUP_STYLE } from './groups';
	import Worth4DotDiagram from './Worth4DotDiagram.svelte';

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
	let notesDialog = $state<HTMLDialogElement | null>(null);
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
	<span class="text-base-content {cell.wide ? '' : 'font-mono tabular-nums'}">
		{#if cell.prefix}<span class="text-base-content/40">{cell.prefix}</span>{/if}{cell.value}
		{#if cell.suffix}<span class="text-[0.7rem] text-base-content/45">{cell.suffix}</span>{/if}
	</span>
{/snippet}

{#snippet rowLabel(label: string)}
	{#if isTag(label)}
		<span
			class="inline-block rounded-md bg-base-200 px-1.5 py-0.5 font-mono text-[0.68rem] font-semibold text-base-content/70"
			>{label}</span
		>
	{:else}
		<span class="text-xs font-medium text-base-content/70">{label}</span>
	{/if}
{/snippet}

<article
	class="border border-base-300 bg-base-100 shadow-xs {compact
		? 'rounded-xl'
		: 'rounded-2xl'} {className}"
>
	<header
		class="flex items-center border-b border-base-200 bg-base-200/40 {compact
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
						{#if label}<p class="text-[0.7rem] font-medium text-base-content/50">{label}</p>{/if}
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
															class="text-[0.7rem] text-base-content/50">{column.label}</span
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
							<tr class="text-[0.7rem] text-base-content/50">
								<th
									scope="col"
									class="sticky left-0 w-px bg-base-100 pb-1 pr-3 font-medium whitespace-nowrap"
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
								<tr class="border-t border-base-200/80 first:border-t-0">
									<th
										scope="row"
										class="sticky left-0 bg-base-100 {compact
											? 'py-0.5'
											: 'py-1.5'} pr-3 align-top whitespace-nowrap"
									>
										{@render rowLabel(row.label)}
									</th>
									{#each row.cells as cell, cellIndex (cellIndex)}
										<td class="{compact ? 'py-0.5' : 'py-1.5'} pr-3 align-top">
											{#if cell}{@render value(cell)}{:else}<span
													class="text-base-content/25"
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
					{#if label}<p class="mb-1 text-[0.7rem] font-medium text-base-content/50">{label}</p>{/if}
					<dl class="flex flex-wrap gap-x-6 gap-y-2">
						{#each section.items as item (item.label)}
							<div class={item.wide ? 'basis-full' : ''}>
								<dt class="text-[0.7rem] text-base-content/50">{item.label}</dt>
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
							<figcaption class="mb-1 text-[0.7rem] text-base-content/50">{row.label}</figcaption>
							<Worth4DotDiagram reading={row} redEye={section.redEye} class="max-w-44 rounded-lg" />
							{#if reveal || !view.hideInterpretation}
								<p class="mt-1.5 font-medium leading-snug">{summary.title}</p>
								<p class="text-[0.7rem] leading-snug text-base-content/55">
									{[summary.dots, summary.detail].filter(Boolean).join(' · ')}
								</p>
							{/if}
						</figure>
					{/each}
				</div>
			{:else}
				<div>
					<p class="text-[0.7rem] text-base-content/50">{section.label}</p>
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
						<button
							type="button"
							class="link link-info text-[0.7rem] font-medium no-underline hover:underline"
							aria-haspopup="dialog"
							onclick={() => notesDialog?.showModal()}>Read full note</button
						>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</article>

{#if note}
	<dialog
		bind:this={notesDialog}
		class="modal modal-bottom sm:modal-middle"
		aria-labelledby="{uid}-note-title"
	>
		<div
			class="modal-box w-full max-w-xl rounded-t-[2rem] border border-base-300 p-0 shadow-2xl sm:rounded-[1.75rem]"
		>
			<header class="flex items-center gap-3 border-b border-base-200 px-5 py-4">
				<span class="grid size-9 shrink-0 place-items-center rounded-full bg-info/12 text-info">
					<StickyNote size={16} />
				</span>
				<div class="min-w-0 flex-1">
					<h3 id="{uid}-note-title" class="font-semibold tracking-tight">Exam note</h3>
					<p class="truncate text-xs text-base-content/55">{view.title}</p>
				</div>
				<button
					type="button"
					class="btn btn-ghost btn-sm btn-circle"
					aria-label="Close note"
					onclick={() => notesDialog?.close()}><X size={16} /></button
				>
			</header>
			<div
				class="max-h-[60vh] overflow-y-auto px-5 py-5 text-sm leading-relaxed whitespace-pre-wrap break-words"
			>
				{note}
			</div>
			<footer class="flex justify-end border-t border-base-200 px-5 py-3">
				<button
					type="button"
					class="btn btn-primary btn-sm rounded-full px-5"
					onclick={() => notesDialog?.close()}>Close</button
				>
			</footer>
		</div>
		<form method="dialog" class="modal-backdrop bg-black/35 backdrop-blur-[3px]">
			<button aria-label="Close note">close</button>
		</form>
	</dialog>
{/if}
