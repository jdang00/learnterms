<script lang="ts">
	import {
		Check,
		ChevronDown,
		Clock3,
		Copy,
		Database,
		FileSearch,
		FileText,
		HardDrive,
		Hash,
		Sparkles,
		TriangleAlert
	} from 'lucide-svelte';
	import type { Doc } from '../../convex/_generated/dataModel';
	import { fileKind, formatDate, formatSize } from './contentLibrary';

	let {
		document,
		rawMetadata,
		copiedKey,
		onCopy
	}: {
		document: Doc<'contentLib'>;
		rawMetadata: string;
		copiedKey: string | null;
		onCopy: (key: string, value: string) => void;
	} = $props();

	type Step = { key: string; label: string; icon: typeof FileText; state: string };

	const kind = $derived(fileKind(document));
	const pipeline = $derived.by<Step[]>(() => {
		const status = document.metadata?.ingestionStatus ?? 'not_started';
		const hasExtract = Boolean(document.metadata?.extractionModel || document.metadata?.pageCount);
		const steps: Step[] = [
			{ key: 'stored', label: 'Stored', icon: HardDrive, state: 'done' },
			{ key: 'extract', label: 'Extracted', icon: FileSearch, state: 'idle' },
			{ key: 'index', label: 'Indexed', icon: Database, state: 'idle' }
		];
		if (status === 'indexed') {
			steps[1].state = 'done';
			steps[2].state = 'done';
		} else if (status === 'indexing') {
			steps[1].state = hasExtract ? 'done' : 'active';
			steps[2].state = 'active';
		} else if (status === 'failed') {
			steps[1].state = hasExtract ? 'done' : 'error';
			steps[2].state = 'error';
		} else {
			steps[1].state = hasExtract ? 'done' : 'idle';
		}
		return steps;
	});
</script>

<div class="space-y-3">
	<div class="rounded-2xl border border-base-300 bg-base-100 p-4">
		<div class="mb-4 flex items-center gap-2">
			<Sparkles size={13} class="text-base-content/40" />
			<span class="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">
				Processing pipeline
			</span>
		</div>
		<div class="flex items-center">
			{#each pipeline as step, index}
				<div class="flex flex-col items-center gap-1.5">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-full border-2 {step.state ===
						'done'
							? 'border-success bg-success/10 text-success'
							: step.state === 'active'
								? 'border-info bg-info/10 text-info animate-pulse'
								: step.state === 'error'
									? 'border-error bg-error/10 text-error'
									: 'border-base-300 bg-base-200 text-base-content/40'}"
					>
						{#if step.state === 'done'}
							<Check size={16} />
						{:else}
							<step.icon size={15} />
						{/if}
					</div>
					<span
						class="text-[10px] font-medium {step.state === 'idle'
							? 'text-base-content/40'
							: 'text-base-content/70'}">{step.label}</span
					>
				</div>
				{#if index < pipeline.length - 1}
					<div
						class="mx-1 mb-5 h-0.5 flex-1 rounded {pipeline[index + 1].state === 'done' ||
						pipeline[index + 1].state === 'error'
							? pipeline[index + 1].state === 'error'
								? 'bg-error/40'
								: 'bg-success/40'
							: 'bg-base-300'}"
					></div>
				{/if}
			{/each}
		</div>
		{#if document.metadata?.ingestionStatus === 'failed' && document.metadata?.indexError}
			<div class="mt-4 flex gap-2 rounded-xl bg-error/10 p-3 text-xs text-error">
				<TriangleAlert size={14} class="mt-0.5 shrink-0" />
				<span class="break-words font-mono leading-relaxed">{document.metadata.indexError}</span>
			</div>
		{/if}
	</div>

	<section class="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
		<div class="flex items-center gap-2 border-b border-base-200 px-4 py-2.5">
			<FileText size={13} class="text-base-content/40" />
			<span class="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">
				General
			</span>
		</div>
		<div class="divide-y divide-base-200">
			{@render kv('Title', document.title)}
			{@render kv('Original file', document.metadata?.originalFileName ?? '-')}
			{@render kv('Format', document.metadata?.mimeType ?? kind.label, true)}
			{@render kv('Size', formatSize(document.metadata?.sizeBytes))}
			{@render kv(
				'Pages',
				document.metadata?.pageCount ? String(document.metadata.pageCount) : '-'
			)}
		</div>
	</section>

	<section class="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
		<div class="flex items-center gap-2 border-b border-base-200 px-4 py-2.5">
			<Clock3 size={13} class="text-base-content/40" />
			<span class="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">
				Activity
			</span>
		</div>
		<div class="divide-y divide-base-200">
			{@render kv('Uploaded', formatDate(document._creationTime))}
			{@render kv('Updated', formatDate(document.updatedAt))}
			{@render kv('Indexed', formatDate(document.metadata?.indexedAt))}
		</div>
	</section>

	<section class="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
		<div class="flex items-center gap-2 border-b border-base-200 px-4 py-2.5">
			<Database size={13} class="text-base-content/40" />
			<span class="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">
				RAG index
			</span>
		</div>
		<div class="divide-y divide-base-200">
			{@render kv('Provider', document.metadata?.extractionProvider ?? '-', true)}
			{@render kv('Model', document.metadata?.extractionModel ?? '-', true)}
			{@render copyRow('Namespace', document.metadata?.ragNamespace ?? '-', 'ns')}
			{@render copyRow('Entry ID', document.metadata?.ragEntryId ?? '-', 'entry')}
			{@render kv(
				'Artifacts',
				document.metadata?.extractionArtifactKeys?.length
					? `${document.metadata.extractionArtifactKeys.length} file${document.metadata.extractionArtifactKeys.length === 1 ? '' : 's'}`
					: '-'
			)}
		</div>
	</section>

	<section class="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
		<div class="flex items-center gap-2 border-b border-base-200 px-4 py-2.5">
			<HardDrive size={13} class="text-base-content/40" />
			<span class="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">
				Storage
			</span>
		</div>
		<div class="divide-y divide-base-200">
			{@render kv('Provider', document.metadata?.storageProvider ?? '-', true)}
			{@render copyRow('R2 key', document.metadata?.r2Key ?? '-', 'r2')}
			{@render copyRow('Document ID', String(document._id), 'docid')}
			{@render copyRow('Cohort ID', String(document.cohortId), 'cohort')}
		</div>
	</section>

	<details class="group overflow-hidden rounded-2xl border border-base-300 bg-base-100">
		<summary
			class="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-base-content/50 hover:bg-base-200/50"
		>
			<Hash size={13} class="text-base-content/40" />
			Raw metadata
			<ChevronDown
				size={14}
				class="ml-auto text-base-content/40 transition-transform group-open:rotate-180"
			/>
		</summary>
		<div class="relative border-t border-base-200">
			<button
				class="btn btn-ghost btn-xs absolute right-2 top-2 z-10 gap-1.5 rounded-lg"
				onclick={() => onCopy('raw', rawMetadata)}
			>
				{#if copiedKey === 'raw'}
					<Check size={12} class="text-success" /> Copied
				{:else}
					<Copy size={12} /> Copy
				{/if}
			</button>
			<pre
				class="overflow-x-auto bg-base-200/50 p-4 text-[11px] leading-relaxed text-base-content/80"><code
					>{rawMetadata}</code
				></pre>
		</div>
	</details>
</div>

{#snippet kv(label: string, value: string, mono = false)}
	<div class="flex items-start justify-between gap-4 px-4 py-2.5">
		<span class="shrink-0 pt-0.5 text-xs text-base-content/50">{label}</span>
		<span
			class="min-w-0 break-words text-right text-xs {mono
				? 'font-mono text-base-content/80'
				: 'font-medium text-base-content/90'}">{value}</span
		>
	</div>
{/snippet}

{#snippet copyRow(label: string, value: string, key: string)}
	<div class="group/row flex items-start justify-between gap-3 px-4 py-2.5">
		<span class="shrink-0 pt-0.5 text-xs text-base-content/50">{label}</span>
		<button
			class="flex min-w-0 items-center gap-1.5 text-right hover:opacity-100"
			onclick={() => value !== '-' && onCopy(key, value)}
			title={value !== '-' ? 'Copy' : ''}
		>
			<span class="truncate font-mono text-xs text-base-content/80">{value}</span>
			{#if value !== '-'}
				{#if copiedKey === key}
					<Check size={12} class="shrink-0 text-success" />
				{:else}
					<Copy
						size={12}
						class="shrink-0 text-base-content/30 group-hover/row:text-base-content/60"
					/>
				{/if}
			{/if}
		</button>
	</div>
{/snippet}
