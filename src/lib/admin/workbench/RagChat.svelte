<script lang="ts">
	import {
		BookOpen,
		Bot,
		Braces,
		ChevronRight,
		MessageSquare,
		Send,
		Sparkles,
		TriangleAlert
	} from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import ShimmerText from '$lib/components/ShimmerText.svelte';
	import { type Message, prettyJson, formatChars, shortModel } from './model';
	let {
		messages,
		inspectedMessage,
		inspectedMessageIndex = $bindable(),
		isAsking,
		ragError,
		prompt = $bindable(),
		selectedDocument,
		canAsk,
		ask
	}: {
		messages: Message[];
		inspectedMessage: Message | null;
		inspectedMessageIndex: number | null;
		isAsking: boolean;
		ragError: string;
		prompt: string;
		selectedDocument?: { title: string };
		canAsk: boolean;
		ask: () => Promise<void>;
	} = $props();
</script>

{#snippet statTile(label: string, value: string, sub: string)}
	<div class="min-w-0 rounded-xl border border-base-300 bg-base-100 px-3 py-2.5">
		<p class="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">{label}</p>
		<p class="mt-0.5 truncate text-sm font-semibold">{value}</p>
		<p class="truncate font-mono text-[10px] text-base-content/40">{sub}</p>
	</div>
{/snippet}

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
							Ask against the selected document. Each answer exposes its retrieval telemetry in the
							inspector — scores, chunk groups, and token spend.
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
										style="width: {Math.min(100, Math.max(4, Math.round(group.score * 100)))}%"
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
