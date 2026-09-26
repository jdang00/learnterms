<script lang="ts">
	import type { ExamCell, ExamFindingView } from '$lib/examFindings/view';
	import { EXAM_GROUP_STYLE } from './groups';

	let {
		view,
		compact = false,
		class: className = ''
	}: { view: ExamFindingView; compact?: boolean; class?: string } = $props();

	const style = $derived(EXAM_GROUP_STYLE[view.group]);
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
	class="overflow-hidden border border-base-300 bg-base-100 shadow-xs {compact
		? 'rounded-xl'
		: 'rounded-2xl'} {className}"
>
	<header
		class="flex items-center border-b border-base-200 bg-base-200/40 {compact
			? 'gap-1.5 px-2.5 py-1'
			: 'gap-2 px-3.5 py-2'}"
	>
		<span
			class="grid shrink-0 place-items-center rounded-full {compact
				? 'size-4'
				: 'size-6'} {style.badge}"
		>
			<style.icon size={compact ? 10 : 13} />
		</span>
		<h3 class="min-w-0 truncate font-semibold {compact ? 'text-xs' : 'text-sm'}">{view.title}</h3>
	</header>
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
		{#if view.note}
			<div class={view.sections.length ? 'border-t border-base-200 pt-2' : ''}>
				<p class="text-[0.7rem] text-base-content/50">Notes</p>
				<p class="whitespace-pre-line text-base-content/85">{view.note}</p>
			</div>
		{/if}
	</div>
</article>
