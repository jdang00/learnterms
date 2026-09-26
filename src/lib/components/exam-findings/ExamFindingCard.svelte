<script lang="ts">
	import { StickyNote, X } from 'lucide-svelte';
	import type { ExamCell, ExamFindingView } from '$lib/examFindings/view';
	import { EXAM_GROUP_STYLE } from './groups';

	let {
		view,
		compact = false,
		class: className = ''
	}: { view: ExamFindingView; compact?: boolean; class?: string } = $props();

	const style = $derived(EXAM_GROUP_STYLE[view.group]);
	const uid = $props.id();
	const note = $derived(view.note?.trim() ?? '');
	const notePreview = $derived(note.length > 240 ? `${note.slice(0, 240)}…` : note);
	let notesDialog = $state<HTMLDialogElement | null>(null);
	// Eye rows read as small tags; structure rows (Cornea, A/C) stay plain.
	const isTag = (label: string) => ['OD', 'OS', 'OU'].includes(label);
</script>

{#snippet value(cell: ExamCell)}
	<span class="text-base-content {cell.wide ? '' : 'font-mono tabular-nums'}">
		{#if cell.prefix}<span class="text-base-content/40">{cell.prefix}</span>{/if}{cell.value}
		{#if cell.suffix}<span class="text-[0.7rem] text-base-content/45">{cell.suffix}</span>{/if}
	</span>
{/snippet}

<article
	class="relative overflow-visible border border-base-300 bg-base-100 shadow-xs hover:z-20 focus-within:z-20 {compact
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
		<h3 class="min-w-0 truncate font-semibold {compact ? 'text-xs' : 'text-sm'}">{view.title}</h3>
		{#if note}
			<button
				type="button"
				class="btn btn-circle btn-xs tooltip tooltip-left pointer-events-auto relative z-10 ml-auto size-7 shrink-0 border-blue-200 bg-blue-50 text-blue-600 shadow-none before:max-w-64 before:whitespace-pre-line before:text-left hover:border-blue-300 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25"
				data-tip={notePreview}
				aria-label={`View note for ${view.title}`}
				aria-haspopup="dialog"
				onclick={() => notesDialog?.showModal()}
			>
				<StickyNote size={compact ? 13 : 15} />
			</button>
		{/if}
	</header>
	{#if view.sections.length}
		<div class={compact ? 'space-y-2 px-2.5 py-2 text-xs' : 'space-y-3 px-3.5 py-3 text-sm'}>
			{#each view.sections as section, index (index)}
				{#if section.kind === 'grid'}
					<div class="-mx-1 overflow-x-auto px-1">
						<table class="w-full border-collapse text-left">
							<thead>
								<tr class="text-[0.7rem] text-base-content/50">
									<th scope="col" class="w-px pb-1 pr-3 font-medium"
										><span class="sr-only">Row</span></th
									>
									{#each section.columns as column (column.key)}
										<th scope="col" class="pb-1 pr-3 font-medium whitespace-nowrap"
											>{column.label}</th
										>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each section.rows as row (row.label)}
									<tr class="border-t border-base-200/80 first:border-t-0">
										<th
											scope="row"
											class="{compact ? 'py-0.5' : 'py-1.5'} pr-3 align-top whitespace-nowrap"
										>
											{#if isTag(row.label)}
												<span
													class="inline-block rounded-md bg-base-200 px-1.5 py-0.5 font-mono text-[0.68rem] font-semibold text-base-content/70"
													>{row.label}</span
												>
											{:else}
												<span class="text-xs font-medium text-base-content/70">{row.label}</span>
											{/if}
										</th>
										{#each row.cells as cell, cellIndex (cellIndex)}
											<td class="{compact ? 'py-0.5' : 'py-1.5'} pr-3 align-top">
												{#if cell}{@render value(cell)}{:else}<span
														class="text-base-content/25"
														aria-label="Not recorded">–</span
													>{/if}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else if section.kind === 'fields'}
					<dl class="flex flex-wrap gap-x-6 gap-y-2">
						{#each section.items as item (item.label)}
							<div class={item.wide ? 'basis-full' : ''}>
								<dt class="text-[0.7rem] text-base-content/50">{item.label}</dt>
								<dd>{@render value(item)}</dd>
							</div>
						{/each}
					</dl>
				{:else}
					<div>
						<p class="text-[0.7rem] text-base-content/50">{section.label}</p>
						<p class="whitespace-pre-line">{section.value}</p>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</article>

{#if note}
	<dialog
		bind:this={notesDialog}
		class="modal modal-bottom pointer-events-auto sm:modal-middle"
		aria-labelledby="{uid}-note-title"
	>
		<div
			class="modal-box w-full max-w-xl rounded-t-[2rem] border border-base-300 p-0 shadow-2xl sm:rounded-[1.75rem]"
		>
			<header class="flex items-center gap-3 border-b border-base-200 px-5 py-4">
				<span
					class="grid size-9 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
				>
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
