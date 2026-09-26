<script lang="ts">
	import { ExternalLink, FileText, LoaderCircle, X } from 'lucide-svelte';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';

	interface Props {
		source?: {
			sourceTitle?: string;
			sourceDocumentId?: Id<'contentLib'>;
			sourcePageNumbers?: number[];
			sourceCitations?: Array<{ pageNumber: number; noteFile: string; quote?: string }>;
		};
		editing?: boolean;
		onRemovePage?: (page: number) => void;
	}
	let { source, editing = false, onRemovePage }: Props = $props();
	const client = useConvexClient();
	let opening = $state<number | null>(null);
	let active = $state<number | null>(null);
	let error = $state('');
	// One question cites one document, so the title is the same across its citations.
	// noteFile is usually the uploaded filename, so drop the extension for display.
	const title = $derived(
		(
			source?.sourceTitle ??
			(source?.sourceCitations ?? []).map((c) => c.noteFile?.trim()).find(Boolean) ??
			''
		).replace(/\.(pdf|docx?|pptx?|txt|md)$/i, '')
	);
	const pages = $derived.by(() => {
		const citations = source?.sourceCitations ?? [];
		const numbers = citations.length
			? citations.map((c) => c.pageNumber)
			: (source?.sourcePageNumbers ?? []);
		return [...new Set(numbers.filter((page) => Number.isInteger(page) && page > 0))]
			.sort((a, b) => a - b)
			.map((pageNumber) => ({
				pageNumber,
				quote: citations
					.filter((c) => c.pageNumber === pageNumber)
					.map((c) => c.quote)
					.filter(Boolean)
					.join('\n\n')
			}));
	});
	// Consecutive pages share one chip; editing keeps one chip per page so each can be removed.
	const groups = $derived.by(() => {
		const runs: Array<typeof pages> = [];
		for (const page of pages) {
			const run = runs.at(-1);
			const last = run?.at(-1);
			if (run && last && !onRemovePage && page.pageNumber === last.pageNumber + 1) run.push(page);
			else runs.push([page]);
		}
		return runs.map((run) => {
			const start = run[0].pageNumber;
			const end = run[run.length - 1].pageNumber;
			return {
				start,
				end,
				pages: run,
				label: start === end ? `p. ${start}` : `pp. ${start}–${end}`
			};
		});
	});
	const activeGroup = $derived(groups.find((group) => group.start === active));
	const previewId = $props.id();

	$effect(() => {
		void source;
		error = '';
		active = null;
	});

	async function openSource(pageNumber: number) {
		const documentId = source?.sourceDocumentId;
		if (!documentId || opening !== null) return;
		error = '';
		const sourceWindow = window.open('about:blank', '_blank');
		if (!sourceWindow) {
			error = 'Allow pop-ups to open the source PDF.';
			return;
		}
		sourceWindow.opener = null;
		opening = pageNumber;
		try {
			const url = await client.query(api.r2Documents.getDocumentUrl, { documentId });
			sourceWindow.location.replace(`${url.split('#')[0]}#page=${pageNumber}`);
		} catch (cause) {
			sourceWindow.close();
			error = cause instanceof Error ? cause.message : 'Unable to open the source PDF.';
		} finally {
			opening = null;
		}
	}
</script>

{#if source?.sourceDocumentId && pages.length}
	<div class="mt-3 border-t border-base-300 pt-3">
		<p class="mb-2 flex items-start gap-1.5 text-xs font-medium text-base-content/60">
			<FileText size={12} class="mt-0.5 shrink-0" />
			<span class="break-words">{title || 'Sources'}</span>
		</p>

		<div
			role="group"
			aria-label="Source pages"
			class="relative flex flex-wrap gap-2"
			onmouseleave={() => (active = null)}
		>
			{#if activeGroup}
				<div class="absolute inset-x-0 top-full z-30 pt-2">
					<div
						id={previewId}
						role="tooltip"
						class="rounded-xl border border-base-300 bg-base-100 p-3 text-left shadow-lg"
					>
						<p class="text-xs font-semibold text-base-content">
							{title || 'Source'} · <span class="font-mono">{activeGroup.label}</span>
						</p>
						{#if activeGroup.pages.some((page) => page.quote)}
							<div
								class="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs leading-relaxed text-base-content/75"
							>
								{#each activeGroup.pages.filter((page) => page.quote) as page (page.pageNumber)}
									<p class="whitespace-pre-line">
										{#if activeGroup.pages.length > 1}<span class="font-mono text-base-content/50"
												>p. {page.pageNumber}</span
											><br />{/if}{page.quote}
									</p>
								{/each}
							</div>
						{/if}
						<p class="mt-2 text-[11px] text-base-content/50">
							Click the page chip to open the PDF{activeGroup.start === activeGroup.end
								? ''
								: ` at p. ${activeGroup.start}`}.
						</p>
					</div>
				</div>
			{/if}
			{#each groups as group (group.start)}
				<div class="flex items-center gap-0.5">
					<button
						type="button"
						class="btn btn-ghost btn-xs gap-1.5 rounded-full border border-base-300 font-mono font-normal"
						disabled={opening !== null}
						aria-label={group.start === group.end
							? `Open ${title || 'source PDF'} at page ${group.start} in a new tab`
							: `Open ${title || 'source PDF'} at page ${group.start} (cites pages ${group.start}–${group.end}) in a new tab`}
						onclick={() => openSource(group.start)}
						onmouseenter={() => (active = group.start)}
						aria-describedby={active === group.start ? previewId : undefined}
						onkeydown={(event) => {
							if (event.key === 'Escape') active = null;
						}}
						onfocus={() => (active = group.start)}
						onblur={() => (active = null)}
					>
						{#if opening === group.start}<LoaderCircle
								size={12}
								class="animate-spin"
							/>{:else}<FileText size={12} />{/if}
						{group.label}<ExternalLink size={11} />
					</button>
					{#if onRemovePage}
						<button
							type="button"
							class="btn btn-ghost btn-xs btn-circle"
							aria-label={`Remove source page ${group.start}`}
							onclick={() => onRemovePage?.(group.start)}><X size={11} /></button
						>
					{/if}
				</div>
			{/each}
		</div>

		{#if editing}<p class="mt-2 text-xs text-base-content/50">
				Source links stay attached when you save. Check that they still support your edits.
			</p>{/if}
		{#if error}<p class="mt-2 text-xs text-error" role="alert">{error}</p>{/if}
	</div>
{/if}
