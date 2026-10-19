<script lang="ts">
	import { Progress } from '#lib/components/ui/progress/index.js';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Bot from '@lucide/svelte/icons/bot';
	import Braces from '@lucide/svelte/icons/braces';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Send from '@lucide/svelte/icons/send';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { fade } from 'svelte/transition';
	import ShimmerText from '#lib/components/ShimmerText.svelte';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
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
	<div class="min-w-0 surface-sm px-3 py-2.5">
		<p class="label-caps">{label}</p>
		<p class="mt-0.5 truncate text-sm font-semibold">{value}</p>
		<p class="truncate font-mono text-[10px] text-foreground/40">{sub}</p>
	</div>
{/snippet}

<section class="flex min-h-[32rem] flex-col surface shadow-xs xl:col-span-8 xl:min-h-0">
	<div class="qs-canvas relative min-h-0 flex-1 overflow-y-auto rounded-t-2xl bg-muted">
		<div class="qs-grid pointer-events-none absolute inset-0"></div>
		<div class="relative space-y-4 p-4 sm:p-5">
			{#if messages.length === 0}
				<div
					class="flex h-full min-h-[22rem] flex-col items-center justify-center gap-3 p-8 text-center"
				>
					<span
						class="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary-ink"
					>
						<MessageSquare size={19} />
					</span>
					<div>
						<h2 class="text-sm font-semibold">Probe the retrieval pipeline</h2>
						<p class="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-foreground/50">
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
								class="max-w-[78%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground"
							>
								<p class="whitespace-pre-wrap">{message.text}</p>
							</div>
						</div>
					{:else}
						{@const isInspected = inspectedMessage === message}
						<div class="flex gap-3">
							<span
								class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-ink"
							>
								<Bot size={15} />
							</span>
							<div class="min-w-0 max-w-[82%]">
								<div class="surface rounded-tl-md px-4 py-3 shadow-xs">
									<p class="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
								</div>
								<div class="mt-1.5 flex flex-wrap items-center gap-1.5 px-1">
									{#if message.diagnostics}
										<span
											class="rounded-full bg-background px-2 py-0.5 font-mono text-[10px] text-foreground/50 shadow-xs"
										>
											{shortModel(message.diagnostics.model)}
										</span>
										<span
											class="rounded-full bg-background px-2 py-0.5 font-mono text-[10px] text-foreground/50 shadow-xs"
										>
											{message.diagnostics.retrievedGroupCount} groups
										</span>
										<span
											class="rounded-full bg-background px-2 py-0.5 font-mono text-[10px] text-foreground/50 shadow-xs"
										>
											{formatChars(message.diagnostics.contextTextLength)} ctx
										</span>
									{/if}
									{#if message.usage?.totalTokens}
										<span
											class="rounded-full bg-background px-2 py-0.5 font-mono text-[10px] text-foreground/50 shadow-xs"
										>
											{message.usage.totalTokens.toLocaleString()} tok
										</span>
									{/if}
									<button
										class="rounded-full px-2 py-0.5 text-[10px] font-semibold transition {isInspected
											? 'bg-primary/10 text-primary-ink'
											: 'text-foreground/40 hover:bg-background hover:text-foreground/70'}"
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
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-ink"
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
				<div in:fade={{ duration: 150 }}>
					<Alert.Root tone="error" class="rounded-xl py-2">
						<TriangleAlert size={15} />
						<Alert.Description>{ragError}</Alert.Description>
					</Alert.Root>
				</div>
			{/if}
		</div>
	</div>

	<form
		class="shrink-0 border-t border-border p-3"
		onsubmit={(event) => {
			event.preventDefault();
			ask();
		}}
	>
		<div class="flex items-end gap-2 surface p-2 focus-within:border-primary/40">
			<textarea
				class="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none placeholder:text-foreground/35"
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
			<Button type="submit" size="sm" class="gap-1.5 px-4" disabled={!canAsk}>
				{#if isAsking}
					<Spinner class="size-3" />
				{:else}
					<Send size={14} />
				{/if}
				Ask
			</Button>
		</div>
	</form>
</section>

<aside class="flex min-h-0 flex-col overflow-hidden surface shadow-xs xl:col-span-4">
	<div class="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
		<BookOpen size={14} class="text-foreground/45" />
		<p class="text-sm font-semibold">Retrieval inspector</p>
	</div>

	{#if !inspectedMessage}
		<div class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
			<span
				class="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground/35"
			>
				<BookOpen size={17} />
			</span>
			<p class="max-w-[15rem] text-xs leading-relaxed text-foreground/45">
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
							class="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground/55"
						>
							in {inspected.usage.inputTokens.toLocaleString()}
						</span>
					{/if}
					{#if inspected.usage.outputTokens}
						<span
							class="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground/55"
						>
							out {inspected.usage.outputTokens.toLocaleString()}
						</span>
					{/if}
					{#if inspected.usage.totalTokens}
						<span
							class="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-ink"
						>
							{inspected.usage.totalTokens.toLocaleString()} total tok
						</span>
					{/if}
				</div>
			{/if}

			{#if inspected.context?.results?.length}
				<div class="space-y-2">
					<p class="label-caps">Retrieved chunk groups · ranked by score</p>
					{#each inspected.context.results as group, groupIndex (groupIndex)}
						{@const pageNumber = group.content[0]?.metadata?.pageNumber}
						{@const preview = group.content.map((chunk) => chunk.text).join(' ')}
						<details class="group surface-sm">
							<summary class="cursor-pointer list-none p-3">
								<span class="flex items-center gap-2">
									<span class="font-mono text-[10px] font-bold text-foreground/40">
										#{groupIndex + 1}
									</span>
									{#if typeof pageNumber === 'number'}
										<span
											class="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground/55"
										>
											p.{pageNumber}
										</span>
									{/if}
									<span class="ml-auto font-mono text-[10px] font-semibold text-primary-ink">
										{group.score.toFixed(3)}
									</span>
									<ChevronRight
										size={12}
										class="text-foreground/30 transition-transform group-open:rotate-90"
									/>
								</span>
								<Progress
									value={Math.min(100, Math.max(4, Math.round(group.score * 100)))}
									class="mt-1.5 h-1 bg-muted"
									aria-label="Relevance"
								/>
								<span
									class="mt-2 line-clamp-2 block text-[11px] leading-relaxed text-foreground/55 group-open:hidden"
								>
									{preview}
								</span>
							</summary>
							<div class="border-t border-muted p-3">
								<p
									class="max-h-56 overflow-y-auto whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/70"
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
					class="flex w-fit cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold text-foreground/40 transition hover:bg-muted hover:text-foreground/70"
				>
					<Braces size={12} />
					Raw response
					<ChevronRight size={12} class="transition-transform group-open:rotate-90" />
				</summary>
				<pre
					class="mt-2 max-h-80 overflow-auto rounded-xl bg-muted-strong/50 p-3 font-mono text-[11px] leading-relaxed">{prettyJson(
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
					color-mix(in oklab, var(--foreground) 10%, transparent) 1px,
					transparent 1px
				)
				0 0 / 38px 38px,
			linear-gradient(
					to bottom,
					color-mix(in oklab, var(--foreground) 10%, transparent) 1px,
					transparent 1px
				)
				0 0 / 38px 38px;
		opacity: 0.6;
		mask-image: linear-gradient(to bottom, black 0%, black 55%, transparent 100%);
		-webkit-mask-image: linear-gradient(to bottom, black 0%, black 55%, transparent 100%);
	}
</style>
