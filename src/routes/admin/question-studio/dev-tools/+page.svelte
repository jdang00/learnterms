<script lang="ts">
	import {
		ArrowLeft,
		BookOpen,
		Bot,
		Braces,
		Check,
		ChevronRight,
		Database,
		FileText,
		Layers,
		ListTree,
		Map,
		MessageSquare,
		Play,
		Search,
		Send,
		Sparkles,
		Trash2,
		TriangleAlert,
		Wrench
	} from 'lucide-svelte';
	import { fade, slide } from 'svelte/transition';
	import { useClerkContext } from 'svelte-clerk';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import ShimmerText from '$lib/components/ShimmerText.svelte';
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

	type Pane = 'tools' | 'rag';
	type ToolId =
		| 'searchSourceChunks'
		| 'getSourcePages'
		| 'getTopicCoverageMap'
		| 'getAllowedSourceText';

	type Citation = {
		citationId: string;
		pageNumber: number;
		noteFile: string;
		chunkTitle: string;
		chunkIndex: number;
	};

	type CoverageTopic = {
		topicId: string;
		title: string;
		pageNumbers: number[];
		estimatedQuestionCapacity: number;
		existingQuestionCount: number;
		questionTypes: { learn: number; clinical: number; criticalThinking: number };
		exampleStems: string[];
	};

	type DevToolResult = {
		tool: ToolId;
		input: { query?: string; limit?: number; pageNumbers?: number[] };
		output: {
			documentTitle: string;
			query?: string;
			resultCount?: number;
			citations?: Citation[];
			pageNumbers?: number[];
			text?: string;
			existingQuestionCount?: number;
			topics?: CoverageTopic[];
		};
		diagnostics: {
			documentId: string;
			documentTitle: string;
			moduleId?: string;
			pageRange: { startPage: number; endPage: number; selectedPageCount: number };
			topicMapId?: string;
			topicCount: number;
			existingQuestionCount: number;
			elapsedMs: number;
		};
	};

	type ToolRun = {
		id: string;
		tool: ToolId;
		at: number;
		result: DevToolResult;
	};

	type RagChunk = { text: string; metadata?: Record<string, unknown> };
	type RagRetrievedGroup = {
		entryId: string;
		order: number;
		startOrder: number;
		score: number;
		content: RagChunk[];
	};

	type Message = {
		role: 'user' | 'assistant';
		text: string;
		context?: {
			results: RagRetrievedGroup[];
			entries: Array<{ entryId: string; title?: string; key?: string }>;
			text: string;
		};
		usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
		diagnostics?: {
			model: string;
			embeddingModel: string;
			namespace: string;
			search: { limit: number; searchType: string };
			retrievedGroupCount: number;
			entryCount: number;
			contextTextLength: number;
		};
	};

	const toolDefinitions: Array<{
		id: ToolId;
		label: string;
		short: string;
		description: string;
		icon: typeof Search;
	}> = [
		{
			id: 'searchSourceChunks',
			label: 'searchSourceChunks',
			short: 'Search',
			description:
				'Hybrid retrieval across the document namespace — the agent’s evidence gatherer.',
			icon: Search
		},
		{
			id: 'getSourcePages',
			label: 'getSourcePages',
			short: 'Pages',
			description: 'Raw extracted markdown for specific allowed pages — nearby context lookups.',
			icon: FileText
		},
		{
			id: 'getTopicCoverageMap',
			label: 'getTopicCoverageMap',
			short: 'Coverage',
			description: 'Saved topic map scored against existing module questions — gap finder.',
			icon: Map
		},
		{
			id: 'getAllowedSourceText',
			label: 'getAllowedSourceText',
			short: 'Source',
			description: 'The bounded source text the mapping agent is allowed to read.',
			icon: Database
		}
	];

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

	function prettyJson(value: unknown) {
		return JSON.stringify(value, null, 2);
	}

	function formatChars(count: number) {
		return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
	}

	function formatBytes(bytes: number) {
		return bytes >= 1024 * 1024
			? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
			: `${Math.round(bytes / 1024)} KB`;
	}

	function formatTime(at: number) {
		return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
	}

	function shortId(id: string) {
		return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
	}

	function shortModel(model: string) {
		const parts = model.split('/');
		return parts[parts.length - 1];
	}

	function parseOptionalNumber(value: string) {
		const trimmed = value.trim();
		if (!trimmed) return undefined;
		const parsed = Number(trimmed);
		return Number.isFinite(parsed) ? parsed : undefined;
	}

	function parsePageNumbers(value: string) {
		return value
			.split(',')
			.map((part) => Number(part.trim()))
			.filter((pageNumber) => Number.isFinite(pageNumber) && pageNumber > 0)
			.map((pageNumber) => Math.floor(pageNumber));
	}

	function splitSourcePages(text: string) {
		return text.split('\n\n---\n\n').map((section) => {
			const match = section.match(/^Page (\d+)\n\n([\s\S]*)$/);
			return match
				? { pageNumber: Number(match[1]), text: match[2] }
				: { pageNumber: null, text: section };
		});
	}

	function runSummary(run: ToolRun) {
		const output = run.result.output;
		if (run.tool === 'searchSourceChunks') {
			return `“${run.result.input.query ?? ''}” · ${output.citations?.length ?? 0} citations`;
		}
		if (run.tool === 'getSourcePages') {
			return `pp ${(output.pageNumbers ?? []).join(', ')}`;
		}
		if (run.tool === 'getTopicCoverageMap') {
			return `${output.topics?.length ?? 0} topics · ${output.existingQuestionCount ?? 0} existing questions`;
		}
		return `${output.pageNumbers?.length ?? 0} pages · ${formatChars(output.text?.length ?? 0)} chars`;
	}

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

{#snippet statTile(label: string, value: string, sub: string)}
	<div class="min-w-0 rounded-xl border border-base-300 bg-base-100 px-3 py-2.5">
		<p class="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">{label}</p>
		<p class="mt-0.5 truncate text-sm font-semibold">{value}</p>
		<p class="truncate font-mono text-[10px] text-base-content/40">{sub}</p>
	</div>
{/snippet}

{#snippet diagnosticsRow(diagnostics: DevToolResult['diagnostics'])}
	<div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
		{@render statTile(
			'Page scope',
			`pp ${diagnostics.pageRange.startPage}–${diagnostics.pageRange.endPage}`,
			`${diagnostics.pageRange.selectedPageCount} pages selected`
		)}
		{@render statTile(
			'Topic map',
			diagnostics.topicMapId ? `${diagnostics.topicCount} topics` : 'none saved',
			diagnostics.topicMapId ? shortId(diagnostics.topicMapId) : 'map the document first'
		)}
		{@render statTile(
			'Module questions',
			String(diagnostics.existingQuestionCount),
			diagnostics.moduleId ? shortId(diagnostics.moduleId) : 'no module attached'
		)}
		{@render statTile('Latency', `${diagnostics.elapsedMs} ms`, 'tool execution')}
	</div>
{/snippet}

{#snippet sourceTextPanel(text: string)}
	{@const clipped = text.endsWith('[Source clipped]')}
	<div class="space-y-2">
		<div class="flex items-center gap-2 text-[11px] text-base-content/45">
			<span class="font-semibold uppercase tracking-wide">Extracted text</span>
			<span class="font-mono">{formatChars(text.length)} chars</span>
			{#if clipped}
				<span class="badge badge-warning badge-xs gap-1 font-semibold">clipped at budget</span>
			{/if}
		</div>
		<div class="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
			{#each splitSourcePages(text) as section, index (index)}
				<div class="rounded-xl border border-base-300 bg-base-100 p-3.5">
					{#if section.pageNumber !== null}
						<span
							class="mb-2 inline-flex items-center gap-1.5 rounded-full bg-base-200 px-2 py-0.5 font-mono text-[10px] font-semibold text-base-content/60"
						>
							<FileText size={11} />
							Page {section.pageNumber}
						</span>
					{/if}
					<p class="whitespace-pre-wrap text-[13px] leading-relaxed text-base-content/80">
						{section.text}
					</p>
				</div>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet rawPayload(result: DevToolResult)}
	<details class="group">
		<summary
			class="flex w-fit cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold text-base-content/40 transition hover:bg-base-200 hover:text-base-content/70"
		>
			<Braces size={12} />
			Raw payload
			<ChevronRight size={12} class="transition-transform group-open:rotate-90" />
		</summary>
		<pre
			class="mt-2 max-h-80 overflow-auto rounded-xl bg-base-300/50 p-3 font-mono text-[11px] leading-relaxed">{prettyJson(
				result
			)}</pre>
	</details>
{/snippet}

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

					<div class="qs-canvas relative min-h-0 flex-1 overflow-y-auto rounded-b-2xl bg-base-200">
						<div class="qs-grid pointer-events-none absolute inset-0"></div>

						{#if !selectedRun}
							<div
								class="relative flex h-full min-h-[24rem] flex-col items-center justify-center gap-3 p-8 text-center"
							>
								<span
									class="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"
								>
									<Wrench size={19} />
								</span>
								<div>
									<h2 class="text-sm font-semibold">Run a tool call</h2>
									<p class="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-base-content/50">
										This is the exact tool surface the Question Studio agents work with. Every run
										shows the payload the model would receive — parsed, not dumped.
									</p>
								</div>
							</div>
						{:else}
							{@const run = selectedRun}
							{@const output = run.result.output}
							<div class="relative space-y-4 p-4 sm:p-5" in:fade={{ duration: 160 }}>
								<div class="flex flex-wrap items-center gap-2">
									<span
										class="flex items-center gap-2 rounded-full bg-base-100 px-3 py-1 font-mono text-xs font-semibold shadow-xs"
									>
										{#if run.tool === 'searchSourceChunks'}<Search size={13} class="text-primary" />
										{:else if run.tool === 'getSourcePages'}<FileText
												size={13}
												class="text-primary"
											/>
										{:else if run.tool === 'getTopicCoverageMap'}<Map
												size={13}
												class="text-primary"
											/>
										{:else}<Database size={13} class="text-primary" />{/if}
										{run.tool}
									</span>
									<span class="text-[11px] text-base-content/45">{formatTime(run.at)}</span>
									<span class="ml-auto truncate text-[11px] text-base-content/45">
										{run.result.diagnostics.documentTitle}
									</span>
								</div>

								{@render diagnosticsRow(run.result.diagnostics)}

								{#if run.tool === 'searchSourceChunks'}
									<div class="rounded-2xl border border-base-300 bg-base-100 p-4">
										<div class="flex flex-wrap items-center gap-2">
											<p class="min-w-0 flex-1 text-sm">
												<span class="text-base-content/45">Searched for</span>
												<span class="font-semibold">“{run.result.input.query}”</span>
											</p>
											<span
												class="rounded-full bg-base-200 px-2 py-0.5 font-mono text-[10px] text-base-content/55"
											>
												limit {run.result.input.limit}
											</span>
											<span
												class="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary"
											>
												{output.resultCount} chunk groups · {output.citations?.length ?? 0} citations
											</span>
										</div>

										{#if output.citations?.length}
											<div class="mt-3 grid gap-1.5 sm:grid-cols-2">
												{#each output.citations as citation (citation.citationId)}
													<button
														class="group flex items-center gap-2.5 rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-left transition hover:border-primary/40 hover:bg-primary/5"
														onclick={() => openPages([citation.pageNumber])}
														title="Open page {citation.pageNumber} with getSourcePages"
													>
														<span
															class="rounded-md bg-base-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-base-content/55"
														>
															{citation.citationId}
														</span>
														<span class="min-w-0 flex-1 truncate text-xs text-base-content/75">
															{citation.chunkTitle}
														</span>
														<span
															class="shrink-0 font-mono text-[10px] font-semibold text-base-content/45 transition group-hover:text-primary"
														>
															p.{citation.pageNumber}
														</span>
														<ChevronRight
															size={12}
															class="shrink-0 text-base-content/25 transition group-hover:text-primary"
														/>
													</button>
												{/each}
											</div>
										{:else}
											<p class="mt-3 text-xs text-base-content/45">
												No citations survived the page-range filter.
											</p>
										{/if}

										{#if output.text}
											<div class="mt-4 space-y-1.5">
												<div class="flex items-center gap-2 text-[11px] text-base-content/45">
													<span class="font-semibold uppercase tracking-wide"
														>Retrieved evidence</span
													>
													<span class="font-mono">{formatChars(output.text.length)} chars</span>
												</div>
												<div
													class="max-h-72 overflow-y-auto rounded-xl bg-base-200/70 p-3.5 text-[13px] leading-relaxed whitespace-pre-wrap text-base-content/75"
												>
													{output.text}
												</div>
											</div>
										{/if}
									</div>
								{:else if run.tool === 'getTopicCoverageMap'}
									<div class="rounded-2xl border border-base-300 bg-base-100 p-4">
										<div class="flex flex-wrap items-center gap-2">
											<span class="flex items-center gap-1.5 text-sm font-semibold">
												<ListTree size={15} class="text-primary" />
												{output.topics?.length ?? 0} mapped topics
											</span>
											<span
												class="rounded-full bg-base-200 px-2 py-0.5 font-mono text-[10px] text-base-content/55"
											>
												{output.existingQuestionCount ?? 0} existing questions in module
											</span>
										</div>

										{#if output.topics?.length}
											<div class="mt-3 space-y-2">
												{#each output.topics as topic (topic.topicId)}
													{@const capacity = Math.max(1, topic.estimatedQuestionCapacity)}
													{@const fill = Math.min(
														100,
														(topic.existingQuestionCount / capacity) * 100
													)}
													{@const saturated =
														topic.existingQuestionCount >= topic.estimatedQuestionCapacity}
													<div class="rounded-xl border border-base-300 bg-base-100 p-3">
														<div class="flex items-start gap-3">
															<div class="min-w-0 flex-1">
																<p class="text-[13px] font-medium leading-snug">{topic.title}</p>
																<div class="mt-1 flex flex-wrap items-center gap-1.5">
																	<span class="font-mono text-[10px] text-base-content/40">
																		{topic.topicId}
																	</span>
																	<button
																		class="rounded-full bg-base-200 px-2 py-0.5 font-mono text-[10px] text-base-content/55 transition hover:bg-primary/10 hover:text-primary"
																		onclick={() => openPages(topic.pageNumbers.slice(0, 5))}
																		title="Open these pages with getSourcePages"
																	>
																		pp {topic.pageNumbers.join(', ')}
																	</button>
																	<span class="font-mono text-[10px] text-base-content/40">
																		Learn {topic.questionTypes.learn} · Clinical {topic
																			.questionTypes.clinical} · Critical thinking {topic
																			.questionTypes.criticalThinking}
																	</span>
																</div>
															</div>
															<button
																class="btn btn-ghost btn-xs shrink-0 gap-1 rounded-full text-base-content/50 hover:text-primary"
																onclick={() => searchTopic(topic.title)}
																title="Search source chunks for this topic"
															>
																<Search size={12} />
																<span class="hidden sm:inline">Search</span>
															</button>
														</div>

														<div class="mt-2.5 flex items-center gap-2.5">
															<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-base-200">
																<div
																	class="h-full rounded-full {saturated
																		? 'bg-warning'
																		: 'bg-primary'} transition-all"
																	style="width: {fill}%"
																></div>
															</div>
															<span
																class="shrink-0 font-mono text-[10px] font-semibold {saturated
																	? 'text-warning'
																	: 'text-base-content/50'}"
															>
																{topic.existingQuestionCount}/{topic.estimatedQuestionCapacity} written
															</span>
														</div>

														{#if topic.exampleStems.length}
															<button
																class="mt-2 flex items-center gap-1 text-[11px] font-semibold text-base-content/40 transition hover:text-base-content/70"
																onclick={() =>
																	(openStems = {
																		...openStems,
																		[topic.topicId]: !openStems[topic.topicId]
																	})}
															>
																<ChevronRight
																	size={12}
																	class="transition-transform {openStems[topic.topicId]
																		? 'rotate-90'
																		: ''}"
																/>
																{topic.exampleStems.length} example stem{topic.exampleStems
																	.length === 1
																	? ''
																	: 's'}
															</button>
															{#if openStems[topic.topicId]}
																<div
																	class="mt-1.5 space-y-1 border-l-2 border-base-200 pl-3"
																	transition:slide={{ duration: 150 }}
																>
																	{#each topic.exampleStems as stem, stemIndex (stemIndex)}
																		<p
																			class="line-clamp-2 text-[11px] italic leading-relaxed text-base-content/50"
																		>
																			“{stem}”
																		</p>
																	{/each}
																</div>
															{/if}
														{/if}
													</div>
												{/each}
											</div>
										{:else}
											<p class="mt-3 text-xs text-base-content/45">
												No saved topic map for this page range — map the document in the studio
												first.
											</p>
										{/if}
									</div>
								{:else if output.text}
									<div class="rounded-2xl border border-base-300 bg-base-100 p-4">
										<div class="mb-3 flex flex-wrap items-center gap-1.5">
											{#each output.pageNumbers ?? [] as pageNumber (pageNumber)}
												<span
													class="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary"
												>
													p.{pageNumber}
												</span>
											{/each}
										</div>
										{@render sourceTextPanel(output.text)}
									</div>
								{/if}

								{@render rawPayload(run.result)}
							</div>
						{/if}
					</div>
				</section>

				<aside
					class="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xs xl:col-span-4"
				>
					<div
						class="flex shrink-0 items-center justify-between gap-3 border-b border-base-300 px-4 py-3"
					>
						<div class="flex items-center gap-2">
							<Layers size={14} class="text-base-content/45" />
							<p class="text-sm font-semibold">Run log</p>
							{#if toolRuns.length}
								<span
									class="rounded-full bg-base-200 px-2 py-0.5 font-mono text-[10px] text-base-content/50"
								>
									{toolRuns.length}
								</span>
							{/if}
						</div>
						{#if toolRuns.length}
							<button
								class="btn btn-ghost btn-xs gap-1 rounded-full text-base-content/45"
								onclick={() => {
									toolRuns = [];
									selectedRunId = '';
								}}
							>
								<Trash2 size={12} />
								Clear
							</button>
						{/if}
					</div>

					<div class="min-h-0 flex-1 overflow-y-auto p-2">
						{#if isRunningTool}
							<div class="flex items-center gap-2.5 rounded-lg px-3 py-2.5">
								<span class="relative mt-0.5 flex h-2 w-2 shrink-0">
									<span
										class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60"
									></span>
									<span class="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
								</span>
								<ShimmerText
									text="Running {selectedToolDefinition.label}…"
									tone="primary"
									class="font-mono text-xs font-medium"
								/>
							</div>
						{/if}

						{#if toolRuns.length === 0 && !isRunningTool}
							<div
								class="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 p-6 text-center"
							>
								<span
									class="flex h-10 w-10 items-center justify-center rounded-full bg-base-200 text-base-content/35"
								>
									<Layers size={17} />
								</span>
								<p class="max-w-[15rem] text-xs leading-relaxed text-base-content/45">
									Every tool call lands here so you can replay and compare payloads while shaping
									agent behavior.
								</p>
							</div>
						{:else}
							{#each toolRuns as run (run.id)}
								{@const isSelected = selectedRun?.id === run.id}
								<button
									class="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition {isSelected
										? 'bg-primary/8'
										: 'hover:bg-base-200/60'}"
									onclick={() => (selectedRunId = run.id)}
								>
									<span
										class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full {isSelected
											? 'bg-primary'
											: 'bg-base-content/25'}"
									></span>
									<span class="min-w-0 flex-1">
										<span class="flex items-center gap-2">
											<span
												class="truncate font-mono text-xs font-semibold {isSelected
													? 'text-primary'
													: 'text-base-content/75'}"
											>
												{run.tool}
											</span>
											<span class="ml-auto shrink-0 font-mono text-[10px] text-base-content/35">
												{run.result.diagnostics.elapsedMs} ms
											</span>
										</span>
										<span class="mt-0.5 block truncate text-[11px] text-base-content/45">
											{runSummary(run)}
										</span>
										<span class="mt-0.5 block font-mono text-[10px] text-base-content/30">
											{formatTime(run.at)}
										</span>
									</span>
								</button>
							{/each}
						{/if}
					</div>
				</aside>
			{:else}
				<section
					class="flex min-h-[32rem] flex-col rounded-2xl border border-base-300 bg-base-100 shadow-xs xl:col-span-8 xl:min-h-0"
				>
					<div class="qs-canvas relative min-h-0 flex-1 overflow-y-auto rounded-t-2xl bg-base-200">
						<div class="qs-grid pointer-events-none absolute inset-0"></div>
						<div class="relative space-y-4 p-4 sm:p-5">
							{#if messages.length === 0}
								<div
									class="flex h-full min-h-[22rem] flex-col items-center justify-center gap-3 p-8 text-center"
								>
									<span
										class="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"
									>
										<MessageSquare size={19} />
									</span>
									<div>
										<h2 class="text-sm font-semibold">Probe the retrieval pipeline</h2>
										<p class="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-base-content/50">
											Ask against the selected document. Each answer exposes its retrieval telemetry
											in the inspector — scores, chunk groups, and token spend.
										</p>
									</div>
								</div>
							{:else}
								{#each messages as message, index (index)}
									{#if message.role === 'user'}
										<div class="flex justify-end">
											<div
												class="max-w-[78%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-content"
											>
												<p class="whitespace-pre-wrap">{message.text}</p>
											</div>
										</div>
									{:else}
										{@const isInspected = inspectedMessage === message}
										<div class="flex gap-3">
											<span
												class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
											>
												<Bot size={15} />
											</span>
											<div class="min-w-0 max-w-[82%]">
												<div
													class="rounded-2xl rounded-tl-md border border-base-300 bg-base-100 px-4 py-3 shadow-xs"
												>
													<p class="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
												</div>
												<div class="mt-1.5 flex flex-wrap items-center gap-1.5 px-1">
													{#if message.diagnostics}
														<span
															class="rounded-full bg-base-100 px-2 py-0.5 font-mono text-[10px] text-base-content/50 shadow-xs"
														>
															{shortModel(message.diagnostics.model)}
														</span>
														<span
															class="rounded-full bg-base-100 px-2 py-0.5 font-mono text-[10px] text-base-content/50 shadow-xs"
														>
															{message.diagnostics.retrievedGroupCount} groups
														</span>
														<span
															class="rounded-full bg-base-100 px-2 py-0.5 font-mono text-[10px] text-base-content/50 shadow-xs"
														>
															{formatChars(message.diagnostics.contextTextLength)} ctx
														</span>
													{/if}
													{#if message.usage?.totalTokens}
														<span
															class="rounded-full bg-base-100 px-2 py-0.5 font-mono text-[10px] text-base-content/50 shadow-xs"
														>
															{message.usage.totalTokens.toLocaleString()} tok
														</span>
													{/if}
													<button
														class="rounded-full px-2 py-0.5 text-[10px] font-semibold transition {isInspected
															? 'bg-primary/10 text-primary'
															: 'text-base-content/40 hover:bg-base-100 hover:text-base-content/70'}"
														onclick={() => (inspectedMessageIndex = index)}
													>
														{isInspected ? 'Inspecting' : 'Inspect retrieval'}
													</button>
												</div>
											</div>
										</div>
									{/if}
								{/each}
								{#if isAsking}
									<div class="flex items-center gap-3">
										<span
											class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
										>
											<Sparkles size={15} />
										</span>
										<ShimmerText
											text="Retrieving and answering…"
											tone="primary"
											class="text-sm font-medium"
										/>
									</div>
								{/if}
							{/if}

							{#if ragError}
								<div class="alert alert-error rounded-xl py-2 text-sm" in:fade={{ duration: 150 }}>
									<TriangleAlert size={15} />
									<span>{ragError}</span>
								</div>
							{/if}
						</div>
					</div>

					<form
						class="shrink-0 border-t border-base-300 p-3"
						onsubmit={(event) => {
							event.preventDefault();
							ask();
						}}
					>
						<div
							class="flex items-end gap-2 rounded-2xl border border-base-300 bg-base-100 p-2 focus-within:border-primary/40"
						>
							<textarea
								class="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none placeholder:text-base-content/35"
								placeholder="Ask about {selectedDocument?.title ?? 'the selected document'}…"
								rows="1"
								bind:value={prompt}
								onkeydown={(event) => {
									if (event.key === 'Enter' && !event.shiftKey) {
										event.preventDefault();
										ask();
									}
								}}
							></textarea>
							<button class="btn btn-primary btn-sm gap-1.5 rounded-full px-4" disabled={!canAsk}>
								{#if isAsking}
									<span class="loading loading-spinner loading-xs"></span>
								{:else}
									<Send size={14} />
								{/if}
								Ask
							</button>
						</div>
					</form>
				</section>

				<aside
					class="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xs xl:col-span-4"
				>
					<div class="flex shrink-0 items-center gap-2 border-b border-base-300 px-4 py-3">
						<BookOpen size={14} class="text-base-content/45" />
						<p class="text-sm font-semibold">Retrieval inspector</p>
					</div>

					{#if !inspectedMessage}
						<div class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
							<span
								class="flex h-10 w-10 items-center justify-center rounded-full bg-base-200 text-base-content/35"
							>
								<BookOpen size={17} />
							</span>
							<p class="max-w-[15rem] text-xs leading-relaxed text-base-content/45">
								Ask a question and the retrieval pipeline’s full telemetry will unpack here.
							</p>
						</div>
					{:else}
						{@const inspected = inspectedMessage}
						<div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
							{#if inspected.diagnostics}
								<div class="grid grid-cols-2 gap-2">
									{@render statTile(
										'Chat model',
										shortModel(inspected.diagnostics.model),
										inspected.diagnostics.model
									)}
									{@render statTile(
										'Embeddings',
										shortModel(inspected.diagnostics.embeddingModel),
										inspected.diagnostics.embeddingModel
									)}
									{@render statTile(
										'Search',
										`${inspected.diagnostics.search.searchType} · ${inspected.diagnostics.search.limit}`,
										'chunk ±1 context'
									)}
									{@render statTile(
										'Context',
										`${inspected.diagnostics.retrievedGroupCount} groups`,
										`${formatChars(inspected.diagnostics.contextTextLength)} chars sent`
									)}
								</div>
							{/if}

							{#if inspected.usage}
								<div class="flex flex-wrap items-center gap-1.5">
									{#if inspected.usage.inputTokens}
										<span
											class="rounded-full bg-base-200 px-2 py-0.5 font-mono text-[10px] text-base-content/55"
										>
											in {inspected.usage.inputTokens.toLocaleString()}
										</span>
									{/if}
									{#if inspected.usage.outputTokens}
										<span
											class="rounded-full bg-base-200 px-2 py-0.5 font-mono text-[10px] text-base-content/55"
										>
											out {inspected.usage.outputTokens.toLocaleString()}
										</span>
									{/if}
									{#if inspected.usage.totalTokens}
										<span
											class="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary"
										>
											{inspected.usage.totalTokens.toLocaleString()} total tok
										</span>
									{/if}
								</div>
							{/if}

							{#if inspected.context?.results?.length}
								<div class="space-y-2">
									<p class="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">
										Retrieved chunk groups · ranked by score
									</p>
									{#each inspected.context.results as group, groupIndex (groupIndex)}
										{@const pageNumber = group.content[0]?.metadata?.pageNumber}
										{@const preview = group.content.map((chunk) => chunk.text).join(' ')}
										<details class="group rounded-xl border border-base-300 bg-base-100">
											<summary class="cursor-pointer list-none p-3">
												<span class="flex items-center gap-2">
													<span class="font-mono text-[10px] font-bold text-base-content/40">
														#{groupIndex + 1}
													</span>
													{#if typeof pageNumber === 'number'}
														<span
															class="rounded-full bg-base-200 px-2 py-0.5 font-mono text-[10px] text-base-content/55"
														>
															p.{pageNumber}
														</span>
													{/if}
													<span class="ml-auto font-mono text-[10px] font-semibold text-primary">
														{group.score.toFixed(3)}
													</span>
													<ChevronRight
														size={12}
														class="text-base-content/30 transition-transform group-open:rotate-90"
													/>
												</span>
												<span class="mt-1.5 block h-1 overflow-hidden rounded-full bg-base-200">
													<span
														class="block h-full rounded-full bg-primary/70"
														style="width: {Math.min(
															100,
															Math.max(4, Math.round(group.score * 100))
														)}%"
													></span>
												</span>
												<span
													class="mt-2 line-clamp-2 block text-[11px] leading-relaxed text-base-content/55 group-open:hidden"
												>
													{preview}
												</span>
											</summary>
											<div class="border-t border-base-200 p-3">
												<p
													class="max-h-56 overflow-y-auto whitespace-pre-wrap text-[12px] leading-relaxed text-base-content/70"
												>
													{preview}
												</p>
											</div>
										</details>
									{/each}
								</div>
							{/if}

							<details class="group">
								<summary
									class="flex w-fit cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold text-base-content/40 transition hover:bg-base-200 hover:text-base-content/70"
								>
									<Braces size={12} />
									Raw response
									<ChevronRight size={12} class="transition-transform group-open:rotate-90" />
								</summary>
								<pre
									class="mt-2 max-h-80 overflow-auto rounded-xl bg-base-300/50 p-3 font-mono text-[11px] leading-relaxed">{prettyJson(
										{
											diagnostics: inspected.diagnostics,
											usage: inspected.usage,
											context: inspected.context
										}
									)}</pre>
							</details>
						</div>
					{/if}
				</aside>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Grid texture matching the studio's agent workspace surface */
	.qs-grid {
		background:
			linear-gradient(
					to right,
					color-mix(in oklab, var(--color-base-content) 10%, transparent) 1px,
					transparent 1px
				)
				0 0 / 38px 38px,
			linear-gradient(
					to bottom,
					color-mix(in oklab, var(--color-base-content) 10%, transparent) 1px,
					transparent 1px
				)
				0 0 / 38px 38px;
		opacity: 0.6;
		mask-image: linear-gradient(to bottom, black 0%, black 55%, transparent 100%);
		-webkit-mask-image: linear-gradient(to bottom, black 0%, black 55%, transparent 100%);
	}
</style>
