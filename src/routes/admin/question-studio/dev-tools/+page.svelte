<script lang="ts">
	import {
		type Pane,
		type ToolId,
		type DevToolResult,
		type ToolRun,
		type Message,
		toolDefinitions,
		formatBytes,
		parseOptionalNumber,
		parsePageNumbers
	} from '$lib/admin/workbench/model';
	import ToolResults from '$lib/admin/workbench/ToolResults.svelte';
	import ToolHistory from '$lib/admin/workbench/ToolHistory.svelte';
	import RagChat from '$lib/admin/workbench/RagChat.svelte';

	import {
		ArrowLeft,
		Check,
		Database,
		MessageSquare,
		Play,
		TriangleAlert,
		Wrench
	} from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { useClerkContext } from 'svelte-clerk';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../../../convex/_generated/api';
	import type { Id } from '../../../../convex/_generated/dataModel';
	import { resolve } from '$app/paths';

	const clerk = useClerkContext();
	const client = useConvexClient();
	const clerkUser = $derived(clerk.user);

	const userData = useQuery(api.users.getUserById, () =>
		clerkUser ? { id: clerkUser.id } : 'skip'
	);

	const docs = useQuery(api.contentLib.getIndexedR2DocumentsForRagTester, () =>
		userData.data ? {} : 'skip'
	);

	let activePane = $state<Pane>('tools');
	let selectedDocumentId = $state('');
	let selectedTool = $state<ToolId>('searchSourceChunks');
	let moduleIdInput = $state('');
	let startPageInput = $state('');
	let endPageInput = $state('');
	let toolQuery = $state('');
	let toolLimit = $state(4);
	let pageNumbersInput = $state('');
	let isRunningTool = $state(false);
	let toolError = $state('');
	let toolRuns = $state<ToolRun[]>([]);
	let selectedRunId = $state('');
	let openStems = $state<Record<string, boolean>>({});

	let prompt = $state('');
	let isAsking = $state(false);
	let ragError = $state('');
	let messages = $state<Message[]>([]);
	let inspectedMessageIndex = $state<number | null>(null);

	const indexedDocs = $derived(docs.data ?? []);
	const selectedDocument = $derived(indexedDocs.find((doc) => doc._id === selectedDocumentId));
	const selectedToolDefinition = $derived(
		toolDefinitions.find((tool) => tool.id === selectedTool) ?? toolDefinitions[0]
	);
	const canRunTool = $derived(Boolean(userData.data && selectedDocumentId && !isRunningTool));
	const canAsk = $derived(
		Boolean(userData.data?.cohortId && selectedDocumentId && prompt.trim() && !isAsking)
	);
	const selectedRun = $derived(
		toolRuns.find((run) => run.id === selectedRunId) ?? toolRuns[0] ?? null
	);
	const inspectedMessage = $derived.by(() => {
		if (inspectedMessageIndex !== null && messages[inspectedMessageIndex]?.role === 'assistant') {
			return messages[inspectedMessageIndex];
		}
		return [...messages].reverse().find((message) => message.role === 'assistant') ?? null;
	});

	const docMeta = $derived.by(() => {
		const metadata = selectedDocument?.metadata as Record<string, unknown> | undefined;
		if (!metadata) return null;
		return {
			status: String(metadata.ingestionStatus ?? 'indexed'),
			pageCount: typeof metadata.pageCount === 'number' ? metadata.pageCount : null,
			sizeBytes: typeof metadata.sizeBytes === 'number' ? metadata.sizeBytes : null,
			extractionModel: metadata.extractionModel ? String(metadata.extractionModel) : null,
			indexedAt: typeof metadata.indexedAt === 'number' ? metadata.indexedAt : null
		};
	});

	$effect(() => {
		if (!selectedDocumentId && indexedDocs.length > 0) {
			selectedDocumentId = indexedDocs[0]._id;
		}
	});

	async function runTool(overrides?: { tool?: ToolId; query?: string; pageNumbers?: number[] }) {
		if (overrides?.tool) selectedTool = overrides.tool;
		if (overrides?.query !== undefined) toolQuery = overrides.query;
		if (overrides?.pageNumbers) pageNumbersInput = overrides.pageNumbers.join(', ');
		if (!canRunTool) return;
		toolError = '';
		isRunningTool = true;

		try {
			const args: {
				documentId: Id<'contentLib'>;
				moduleId?: Id<'module'>;
				tool: ToolId;
				query?: string;
				limit?: number;
				pageNumbers?: number[];
				startPage?: number;
				endPage?: number;
			} = {
				documentId: selectedDocumentId as Id<'contentLib'>,
				tool: selectedTool
			};

			const moduleId = moduleIdInput.trim();
			if (moduleId) args.moduleId = moduleId as Id<'module'>;
			const startPage = parseOptionalNumber(startPageInput);
			const endPage = parseOptionalNumber(endPageInput);
			if (startPage) args.startPage = startPage;
			if (endPage) args.endPage = endPage;
			if (selectedTool === 'searchSourceChunks') {
				args.query = toolQuery.trim() || selectedDocument?.title || '';
				args.limit = toolLimit;
			}
			if (selectedTool === 'getSourcePages') {
				const pages = parsePageNumbers(pageNumbersInput);
				if (pages.length) args.pageNumbers = pages;
			}

			const result = (await client.action(api.questionStudio.runDevTool, args)) as DevToolResult;
			const id = `${Date.now()}-${selectedTool}`;
			toolRuns = [{ id, tool: selectedTool, at: Date.now(), result }, ...toolRuns].slice(0, 12);
			selectedRunId = id;
		} catch (e) {
			toolError = e instanceof Error ? e.message : 'Question Studio tool failed';
		} finally {
			isRunningTool = false;
		}
	}

	function openPages(pageNumbers: number[]) {
		void runTool({ tool: 'getSourcePages', pageNumbers });
	}

	function searchTopic(title: string) {
		void runTool({ tool: 'searchSourceChunks', query: title });
	}

	async function ask() {
		if (!canAsk || !userData.data?.cohortId) return;

		const question = prompt.trim();
		prompt = '';
		ragError = '';
		isAsking = true;
		messages = [...messages, { role: 'user', text: question }];

		try {
			const result = await client.action(api.ragKnowledge.askCohort, {
				cohortId: userData.data.cohortId as Id<'cohort'>,
				prompt: question,
				sourceDocumentId: selectedDocumentId ? (selectedDocumentId as Id<'contentLib'>) : undefined,
				limit: 8
			});

			messages = [
				...messages,
				{
					role: 'assistant',
					text: result.answer,
					context: result.context as Message['context'],
					usage: result.usage as Message['usage'],
					diagnostics: result.diagnostics as Message['diagnostics']
				}
			];
			inspectedMessageIndex = messages.length - 1;
		} catch (e) {
			ragError = e instanceof Error ? e.message : 'RAG chat failed';
			messages = messages.filter((message) => message.text !== question || message.role !== 'user');
		} finally {
			isAsking = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-base-100 xl:h-screen xl:overflow-hidden">
	<div class="mx-auto flex w-full max-w-[1800px] flex-1 flex-col p-4 sm:p-6 xl:min-h-0">
		<header class="mb-4 flex shrink-0 flex-wrap items-center gap-3 sm:gap-4">
			<a class="btn btn-ghost btn-sm gap-2 rounded-full" href={resolve('/admin/question-studio')}>
				<ArrowLeft size={16} />
				<span class="hidden sm:inline">Studio</span>
			</a>
			<div class="h-6 w-px bg-base-300"></div>
			<div class="flex min-w-0 items-center gap-3">
				<div class="hidden rounded-xl bg-primary/10 p-2 text-primary sm:flex">
					<Wrench size={18} />
				</div>
				<div class="min-w-0">
					<h1 class="text-xl font-semibold leading-tight">Agent Workbench</h1>
					<p class="truncate text-xs text-base-content/50">
						Exercise the agent’s tool surface and inspect exactly what it sees.
					</p>
				</div>
			</div>
			<div class="ml-auto flex items-center rounded-full border border-base-300 bg-base-200/60 p-1">
				<button
					class="btn btn-xs gap-1.5 rounded-full border-0 {activePane === 'tools'
						? 'btn-primary'
						: 'btn-ghost text-base-content/60'}"
					onclick={() => (activePane = 'tools')}
				>
					<Wrench size={13} />
					Tools
				</button>
				<button
					class="btn btn-xs gap-1.5 rounded-full border-0 {activePane === 'rag'
						? 'btn-primary'
						: 'btn-ghost text-base-content/60'}"
					onclick={() => (activePane = 'rag')}
				>
					<MessageSquare size={13} />
					RAG chat
				</button>
			</div>
		</header>

		<div
			class="mb-4 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-xs"
		>
			<div class="flex min-w-0 flex-1 basis-64 items-center gap-2.5">
				<span
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl {selectedDocument
						? 'bg-success/10 text-success'
						: 'bg-primary/10 text-primary'}"
				>
					{#if selectedDocument}<Check size={15} />{:else}<Database size={15} />{/if}
				</span>
				<select
					class="select select-bordered select-sm min-w-0 flex-1 rounded-full"
					bind:value={selectedDocumentId}
				>
					<option value="">Select an indexed document…</option>
					{#each indexedDocs as doc (doc._id)}
						<option value={doc._id}>{doc.title}</option>
					{/each}
				</select>
			</div>

			{#if docMeta}
				<div class="flex flex-wrap items-center gap-1.5 text-[11px]" in:fade={{ duration: 150 }}>
					<span
						class="rounded-full px-2 py-0.5 font-semibold capitalize {docMeta.status === 'mapped'
							? 'bg-success/10 text-success'
							: 'bg-info/10 text-info'}"
					>
						{docMeta.status}
					</span>
					{#if docMeta.pageCount}
						<span class="rounded-full bg-base-200 px-2 py-0.5 font-mono text-base-content/60">
							{docMeta.pageCount} pp
						</span>
					{/if}
					{#if docMeta.sizeBytes}
						<span class="rounded-full bg-base-200 px-2 py-0.5 font-mono text-base-content/60">
							{formatBytes(docMeta.sizeBytes)}
						</span>
					{/if}
					{#if docMeta.extractionModel}
						<span
							class="hidden rounded-full bg-base-200 px-2 py-0.5 font-mono text-base-content/60 md:inline"
						>
							{docMeta.extractionModel}
						</span>
					{/if}
				</div>
			{/if}

			{#if activePane === 'tools'}
				<div class="flex items-center gap-2">
					<div class="hidden h-6 w-px bg-base-300 sm:block"></div>
					<label class="flex items-center gap-1.5 text-[11px] text-base-content/50">
						pp
						<input
							class="input input-bordered input-xs w-12 rounded-full text-center font-mono"
							placeholder="1"
							bind:value={startPageInput}
						/>
						–
						<input
							class="input input-bordered input-xs w-12 rounded-full text-center font-mono"
							placeholder="end"
							bind:value={endPageInput}
						/>
					</label>
					<input
						class="input input-bordered input-xs w-36 rounded-full font-mono text-[11px]"
						placeholder="module id (optional)"
						bind:value={moduleIdInput}
					/>
				</div>
			{/if}
		</div>

		<div class="flex flex-1 flex-col gap-4 xl:grid xl:min-h-0 xl:grid-cols-12">
			{#if activePane === 'tools'}
				<section
					class="flex min-h-[32rem] flex-col rounded-2xl border border-base-300 bg-base-100 shadow-xs xl:col-span-8 xl:min-h-0"
				>
					<div
						class="flex shrink-0 items-center gap-1 overflow-x-auto rounded-t-2xl border-b border-base-300 px-3 py-2.5"
					>
						{#each toolDefinitions as tool (tool.id)}
							{@const ToolIcon = tool.icon}
							<button
								class="flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition {selectedTool ===
								tool.id
									? 'bg-primary/10 text-primary'
									: 'text-base-content/45 hover:bg-base-200 hover:text-base-content/75'}"
								onclick={() => (selectedTool = tool.id)}
							>
								<ToolIcon size={14} />
								<span class="font-mono">{tool.label}</span>
							</button>
						{/each}
					</div>

					<div class="shrink-0 border-b border-base-300 px-4 py-3">
						<div class="flex flex-wrap items-end gap-3">
							<p class="min-w-0 flex-1 basis-52 text-xs leading-relaxed text-base-content/55">
								{selectedToolDefinition.description}
							</p>

							{#if selectedTool === 'searchSourceChunks'}
								<label class="form-control min-w-0 flex-1 basis-56">
									<span class="label-text mb-1 text-[11px] text-base-content/50">Query</span>
									<input
										class="input input-bordered input-sm rounded-full"
										placeholder={selectedDocument?.title ?? 'What should the agent look for?'}
										bind:value={toolQuery}
										onkeydown={(event) => event.key === 'Enter' && runTool()}
									/>
								</label>
								<label class="form-control w-20">
									<span class="label-text mb-1 text-[11px] text-base-content/50">Limit</span>
									<input
										class="input input-bordered input-sm rounded-full text-center font-mono"
										type="number"
										min="1"
										max="8"
										bind:value={toolLimit}
									/>
								</label>
							{:else if selectedTool === 'getSourcePages'}
								<label class="form-control min-w-0 flex-1 basis-56">
									<span class="label-text mb-1 text-[11px] text-base-content/50">
										Page numbers (max 5)
									</span>
									<input
										class="input input-bordered input-sm rounded-full font-mono"
										placeholder="e.g. 3, 4, 5"
										bind:value={pageNumbersInput}
										onkeydown={(event) => event.key === 'Enter' && runTool()}
									/>
								</label>
							{/if}

							<button
								class="btn btn-primary btn-sm gap-2 rounded-full px-5"
								disabled={!canRunTool}
								onclick={() => runTool()}
							>
								{#if isRunningTool}
									<span class="loading loading-spinner loading-xs"></span>
								{:else}
									<Play size={14} />
								{/if}
								Run
							</button>
						</div>

						{#if toolError}
							<div
								class="alert alert-error mt-3 rounded-xl py-2 text-sm"
								in:fade={{ duration: 150 }}
							>
								<TriangleAlert size={15} />
								<span>{toolError}</span>
							</div>
						{/if}
					</div>

					<ToolResults {selectedRun} {openPages} {searchTopic} bind:openStems />
				</section>

				<ToolHistory
					bind:toolRuns
					bind:selectedRunId
					{isRunningTool}
					{selectedToolDefinition}
					{selectedRun}
				/>
			{:else}
				<RagChat
					{messages}
					{inspectedMessage}
					bind:inspectedMessageIndex
					{isAsking}
					{ragError}
					bind:prompt
					{selectedDocument}
					{canAsk}
					{ask}
				/>
			{/if}
		</div>
	</div>
</div>
