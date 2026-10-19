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
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { Doc } from '../../../convex/_generated/dataModel';
	import { fileKind, formatDate } from './contentLibrary';
	import { formatBytes } from '$lib/utils/format';
	import { documentPipeline } from './documentPipeline';
	import { Button } from '$lib/components/ui/button';
	import { Tip } from '$lib/components/ui/tooltip';

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

	const client = useConvexClient();
	let resuming = $state(false);
	let resumeError = $state('');
	async function resume() {
		resuming = true;
		resumeError = '';
		try {
			await client.action(api.ragKnowledge.indexing.indexR2Document, { documentId: document._id });
		} catch (e) {
			resumeError = e instanceof Error ? e.message : 'Could not resume processing';
		} finally {
			resuming = false;
		}
	}
	type Step = {
		key: string;
		label: string;
		icon: typeof FileText;
		state: 'done' | 'active' | 'idle' | 'error';
		past: string;
		present: string;
		future: string;
		error: string;
	};

	function pipelineTooltip(step: Step) {
		if (step.state === 'done') return `We've already ${step.past}.`;
		if (step.state === 'active') return `We're currently ${step.present}.`;
		if (step.state === 'error') return `We couldn't ${step.error}.`;
		return `We'll ${step.future}.`;
	}

	const kind = $derived(fileKind(document));
	const progress = $derived(documentPipeline(document.metadata));
	const pipeline = $derived.by<Step[]>(() => {
		const steps: Step[] = [
			{
				key: 'stored',
				label: 'Stored',
				icon: HardDrive,
				state: 'done',
				past: 'stored this file securely',
				present: 'storing this file securely',
				future: 'store this file securely after upload',
				error: 'store this file'
			},
			{
				key: 'extract',
				label: 'Extracted',
				icon: FileSearch,
				state: 'idle',
				past: 'extracted the text and layout from this document',
				present: 'extracting the text and layout from this document',
				future: 'extract the text and layout from this document',
				error: 'extract text from this document'
			},
			{
				key: 'index',
				label: 'Indexed',
				icon: Database,
				state: 'idle',
				past: 'indexed this document so AI can search it',
				present: 'indexing this document so AI can search it',
				future: 'index this document so AI can search it',
				error: 'index this document for AI search'
			},
			{
				key: 'mapped',
				label: 'Mapped',
				icon: Sparkles,
				state: 'idle',
				past: 'mapped this document into reusable topics',
				present: 'mapping this document into reusable topics',
				future: 'map this document into reusable topics',
				error: 'map this document into topics'
			}
		];
		steps.forEach((step, index) => {
			step.state = progress.states[index];
		});
		return steps;
	});
</script>

<div class="space-y-3">
	<div class="rounded-2xl border border-border bg-background p-4">
		<div class="mb-4 flex items-center gap-2">
			<Sparkles size={13} class="text-foreground/40" />
			<span class="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
				Processing pipeline
			</span>
		</div>
		<div class="flex items-center">
			{#each pipeline as step, index (step.label)}
				<Tip
					label={pipelineTooltip(step)}
					side={index === 0 ? 'right' : index === pipeline.length - 1 ? 'left' : 'top'}
				>
					<div class="flex flex-col items-center gap-1.5">
						<div
							class="flex h-9 w-9 items-center justify-center rounded-full border-2 {step.state ===
							'done'
								? 'border-success bg-success/10 text-success'
								: step.state === 'active'
									? 'border-info bg-info/10 text-info animate-pulse'
									: step.state === 'error'
										? 'border-error bg-error/10 text-error'
										: 'border-border bg-muted text-foreground/40'}"
						>
							{#if step.state === 'done'}
								<Check size={16} />
							{:else}
								<step.icon size={15} />
							{/if}
						</div>
						<span
							class="text-[10px] font-medium {step.state === 'idle'
								? 'text-foreground/40'
								: 'text-foreground/70'}">{step.label}</span
						>
					</div>
				</Tip>
				{#if index < pipeline.length - 1}
					<div
						class="mx-1 mb-5 h-0.5 flex-1 rounded {pipeline[index + 1].state === 'done' ||
						pipeline[index + 1].state === 'error'
							? pipeline[index + 1].state === 'error'
								? 'bg-error/40'
								: 'bg-success/40'
							: 'bg-muted-strong'}"
					></div>
				{/if}
			{/each}
		</div>
		{#if progress.visible && !progress.complete && !progress.failed}
			<p role="status" class="mt-4 rounded-xl bg-info/10 p-3 text-sm text-foreground/70">
				<span class="font-medium">{progress.label}</span>
				<span class="text-foreground/50"> · Stage {progress.current + 1} of 4</span>
			</p>
		{/if}
		{#if document.metadata?.indexError}
			<div class="mt-4 flex gap-2 rounded-xl bg-error/10 p-3 text-xs text-error-ink">
				<TriangleAlert size={14} class="mt-0.5 shrink-0" />
				<div>
					<span class="break-words leading-relaxed">{document.metadata.indexError}</span>
					<Button
						variant="soft"
						tone="neutral"
						size="xs"
						class="mt-2"
						disabled={resuming}
						onclick={resume}>{resuming ? 'Resuming…' : 'Resume processing'}</Button
					>{#if resumeError}<p>{resumeError}</p>{/if}
				</div>
			</div>
		{/if}
	</div>

	<section class="overflow-hidden rounded-2xl border border-border bg-background">
		<div class="flex items-center gap-2 border-b border-muted px-4 py-2.5">
			<FileText size={13} class="text-foreground/40" />
			<span class="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
				General
			</span>
		</div>
		<div class="divide-y divide-muted">
			{@render kv('Title', document.title)}
			{@render kv('Original file', document.metadata?.originalFileName ?? '-')}
			{@render kv('Format', document.metadata?.mimeType ?? kind.label, true)}
			{@render kv('Size', formatBytes(document.metadata?.sizeBytes))}
			{@render kv(
				'Pages',
				document.metadata?.pageCount ? String(document.metadata.pageCount) : '-'
			)}
		</div>
	</section>

	<section class="overflow-hidden rounded-2xl border border-border bg-background">
		<div class="flex items-center gap-2 border-b border-muted px-4 py-2.5">
			<Clock3 size={13} class="text-foreground/40" />
			<span class="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
				Activity
			</span>
		</div>
		<div class="divide-y divide-muted">
			{@render kv('Uploaded', formatDate(document._creationTime))}
			{@render kv('Updated', formatDate(document.updatedAt))}
			{@render kv('Indexed', formatDate(document.metadata?.indexedAt))}
			{@render kv('Mapped', formatDate(document.metadata?.mappedAt))}
		</div>
	</section>

	<section class="overflow-hidden rounded-2xl border border-border bg-background">
		<div class="flex items-center gap-2 border-b border-muted px-4 py-2.5">
			<Database size={13} class="text-foreground/40" />
			<span class="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
				RAG index
			</span>
		</div>
		<div class="divide-y divide-muted">
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

	<section class="overflow-hidden rounded-2xl border border-border bg-background">
		<div class="flex items-center gap-2 border-b border-muted px-4 py-2.5">
			<HardDrive size={13} class="text-foreground/40" />
			<span class="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
				Storage
			</span>
		</div>
		<div class="divide-y divide-muted">
			{@render kv('Provider', document.metadata?.storageProvider ?? '-', true)}
			{@render copyRow('R2 key', document.metadata?.r2Key ?? '-', 'r2')}
			{@render copyRow('Document ID', String(document._id), 'docid')}
			{@render copyRow('Cohort ID', String(document.cohortId), 'cohort')}
		</div>
	</section>

	<details class="group overflow-hidden rounded-2xl border border-border bg-background">
		<summary
			class="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50 hover:bg-muted/50"
		>
			<Hash size={13} class="text-foreground/40" />
			Raw metadata
			<ChevronDown
				size={14}
				class="ml-auto text-foreground/40 transition-transform group-open:rotate-180"
			/>
		</summary>
		<div class="relative border-t border-muted">
			<Button
				variant="ghost"
				tone="neutral"
				size="xs"
				shape="rect"
				class="absolute top-2 right-2 z-10 gap-1.5"
				onclick={() => onCopy('raw', rawMetadata)}
			>
				{#if copiedKey === 'raw'}
					<Check size={12} class="text-success" /> Copied
				{:else}
					<Copy size={12} /> Copy
				{/if}
			</Button>
			<pre
				class="overflow-x-auto bg-muted/50 p-4 text-[11px] leading-relaxed text-foreground/80"><code
					>{rawMetadata}</code
				></pre>
		</div>
	</details>
</div>

{#snippet kv(label: string, value: string, mono = false)}
	<div class="flex items-start justify-between gap-4 px-4 py-2.5">
		<span class="shrink-0 pt-0.5 text-xs text-foreground/50">{label}</span>
		<span
			class="min-w-0 break-words text-right text-xs {mono
				? 'font-mono text-foreground/80'
				: 'font-medium text-foreground/90'}">{value}</span
		>
	</div>
{/snippet}

{#snippet copyRow(label: string, value: string, key: string)}
	<div class="group/row flex items-start justify-between gap-3 px-4 py-2.5">
		<span class="shrink-0 pt-0.5 text-xs text-foreground/50">{label}</span>
		<button
			class="flex min-w-0 items-center gap-1.5 text-right hover:opacity-100"
			onclick={() => value !== '-' && onCopy(key, value)}
			title={value !== '-' ? 'Copy' : ''}
		>
			<span class="truncate font-mono text-xs text-foreground/80">{value}</span>
			{#if value !== '-'}
				{#if copiedKey === key}
					<Check size={12} class="shrink-0 text-success" />
				{:else}
					<Copy size={12} class="shrink-0 text-foreground/30 group-hover/row:text-foreground/60" />
				{/if}
			{/if}
		</button>
	</div>
{/snippet}
