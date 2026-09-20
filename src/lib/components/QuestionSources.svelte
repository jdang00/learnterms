<script lang="ts">
	import { ExternalLink, FileText, LoaderCircle } from 'lucide-svelte';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';

	interface Props {
		source?: {
			sourceDocumentId?: Id<'contentLib'>;
			sourcePageNumbers?: number[];
			sourceCitations?: Array<{ pageNumber: number; noteFile: string; quote?: string }>;
		};
		editing?: boolean;
	}
	let { source, editing = false }: Props = $props();
	const client = useConvexClient();
	let opening = $state<number | null>(null);
	let active = $state<number | null>(null);
	let error = $state('');
	// One question cites one document, so the title is the same across its citations.
	// noteFile is usually the uploaded filename, so drop the extension for display.
	const title = $derived(
		((source?.sourceCitations ?? []).map((c) => c.noteFile?.trim()).find(Boolean) ?? '').replace(
			/\.(pdf|docx?|pptx?|txt|md)$/i,
			''
		)
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
	const activePage = $derived(pages.find((page) => page.pageNumber === active));
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
			{#if activePage}
				<div class="absolute inset-x-0 top-full z-30 pt-2">
					<div
						id={previewId}
						role="tooltip"
						class="rounded-xl border border-base-300 bg-base-100 p-3 text-left shadow-lg"
					>
						<p class="text-xs font-semibold text-base-content">
							{title || 'Source'} · p. {activePage.pageNumber}
						</p>
						{#if activePage.quote}
							<p
								class="mt-2 max-h-48 overflow-y-auto whitespace-pre-line text-xs leading-relaxed text-base-content/75"
							>
								{activePage.quote}
							</p>
						{/if}
						<p class="mt-2 text-[11px] text-base-content/50">
							Click the page chip to open the PDF.
						</p>
					</div>
				</div>
			{/if}
			{#each pages as page (page.pageNumber)}
				<button
					type="button"
					class="btn btn-ghost btn-xs gap-1.5 rounded-full border border-base-300 font-normal"
					disabled={opening !== null}
					aria-label={`Open ${title || 'source PDF'} at page ${page.pageNumber} in a new tab`}
					onclick={() => openSource(page.pageNumber)}
					onmouseenter={() => (active = page.pageNumber)}
					aria-describedby={active === page.pageNumber ? previewId : undefined}
					onkeydown={(event) => {
						if (event.key === 'Escape') active = null;
					}}
					onfocus={() => (active = page.pageNumber)}
					onblur={() => (active = null)}
				>
					{#if opening === page.pageNumber}<LoaderCircle
							size={12}
							class="animate-spin"
						/>{:else}<FileText size={12} />{/if}
					p. {page.pageNumber}<ExternalLink size={11} />
				</button>
			{/each}
		</div>

		{#if editing}<p class="mt-2 text-xs text-base-content/50">
				Source links stay attached when you save. Check that they still support your edits.
			</p>{/if}
		{#if error}<p class="mt-2 text-xs text-error" role="alert">{error}</p>{/if}
	</div>
{/if}
