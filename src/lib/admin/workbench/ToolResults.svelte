<script lang="ts">
	import {
		Braces,
		ChevronRight,
		Database,
		FileText,
		ListTree,
		Map,
		Search,
		Wrench
	} from 'lucide-svelte';
	import { fade, slide } from 'svelte/transition';
	import {
		type DevToolResult,
		type ToolRun,
		prettyJson,
		formatChars,
		formatTime,
		shortId,
		splitSourcePages
	} from './model';
	let {
		selectedRun,
		openPages,
		searchTopic,
		openStems = $bindable()
	}: {
		selectedRun: ToolRun | null;
		openPages: (pages: number[]) => void;
		searchTopic: (title: string) => void;
		openStems: Record<string, boolean>;
	} = $props();
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
					This is the exact tool surface the Question Studio agents work with. Every run shows the
					payload the model would receive — parsed, not dumped.
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
					{:else if run.tool === 'getSourcePages'}<FileText size={13} class="text-primary" />
					{:else if run.tool === 'getTopicCoverageMap'}<Map size={13} class="text-primary" />
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
								<span class="font-semibold uppercase tracking-wide">Retrieved evidence</span>
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
								{@const fill = Math.min(100, (topic.existingQuestionCount / capacity) * 100)}
								{@const saturated = topic.existingQuestionCount >= topic.estimatedQuestionCapacity}
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
													Learn {topic.questionTypes.learn} · Clinical {topic.questionTypes
														.clinical} · Critical thinking {topic.questionTypes.criticalThinking}
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
												class="transition-transform {openStems[topic.topicId] ? 'rotate-90' : ''}"
											/>
											{topic.exampleStems.length} example stem{topic.exampleStems.length === 1
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
							No saved topic map for this page range — map the document in the studio first.
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
