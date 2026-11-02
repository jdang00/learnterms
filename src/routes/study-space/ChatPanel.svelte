<script lang="ts">
	import { toast } from 'svelte-sonner';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import Copy from '@lucide/svelte/icons/copy';
	import FileText from '@lucide/svelte/icons/file-text';
	import Search from '@lucide/svelte/icons/search';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import * as Attachment from '#lib/components/ui/attachment/index.js';
	import * as Bubble from '#lib/components/ui/bubble/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import * as Marker from '#lib/components/ui/marker/index.js';
	import * as Message from '#lib/components/ui/message/index.js';
	import * as MessageScroller from '#lib/components/ui/message-scroller/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import * as Trace from '#lib/components/ui/trace/index.js';
	import { cannedReply, openingTurns, sourceTitle, suggestions, type Turn } from './fixtures';
	import RichText from './RichText.svelte';

	let { selectedCount, onQuiz }: { selectedCount: number; onQuiz: () => void } = $props();

	let turns = $state<Turn[]>([...openingTurns]);
	let draft = $state('');
	let thinking = $state(false);

	function send(text = draft) {
		const question = text.trim();
		if (!question || thinking) return;
		turns = [...turns, { id: `u${turns.length}`, role: 'user', text: question }];
		draft = '';
		thinking = true;
		// The mock always answers with the same cited reply after a short pause.
		setTimeout(() => {
			turns = [...turns, { ...cannedReply, id: `a${turns.length}` }];
			thinking = false;
		}, 1400);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
		event.preventDefault();
		send();
	}

	const citedSources = (turn: Extract<Turn, { role: 'assistant' }>) => [
		...new Map((turn.citations ?? []).map((c) => [c.sourceId, c])).values()
	];
</script>

<section class="flex h-full min-h-0 flex-col" aria-label="Conversation">
	<MessageScroller.Provider defaultScrollPosition="end">
		<MessageScroller.Root class="min-h-0 flex-1">
			<MessageScroller.Viewport class="px-4 sm:px-6">
				<MessageScroller.Content class="mx-auto max-w-2xl gap-6 py-6">
					{#each turns as turn (turn.id)}
						<MessageScroller.Item>
							{#if turn.role === 'user'}
								<Message.Root align="end">
									<Message.Content>
										<Bubble.Root variant="tinted" align="end">
											<Bubble.Content>{turn.text}</Bubble.Content>
										</Bubble.Root>
									</Message.Content>
								</Message.Root>
							{:else}
								<div class="space-y-3">
									{#if turn.searched}
										<Trace.Root>
											<Trace.Collapsible>
												<Trace.CollapsibleTrigger>
													<Trace.Line>
														<Trace.Icon><Search /></Trace.Icon>
														<Trace.Title>Searched {turn.searched.sources} sources</Trace.Title>
														<Trace.Description>{turn.searched.passages} passages</Trace.Description>
													</Trace.Line>
												</Trace.CollapsibleTrigger>
												<Trace.CollapsibleContent class="text-sm text-foreground/70">
													{turn.searched.queries.map((q) => `“${q}”`).join(', ')}
												</Trace.CollapsibleContent>
											</Trace.Collapsible>
										</Trace.Root>
									{/if}
									<Message.Root>
										<Message.Content class="w-full">
											<Bubble.Root variant="ghost">
												<Bubble.Content class="text-[15px] leading-relaxed">
													<RichText parts={turn.parts} citations={turn.citations} />
												</Bubble.Content>
											</Bubble.Root>
											{#if turn.citations?.length}
												<Message.Footer class="flex flex-wrap items-center gap-1.5">
													{#each citedSources(turn) as c (c.sourceId)}
														<Attachment.Root size="xs">
															<Attachment.Media><FileText /></Attachment.Media>
															<Attachment.Content>
																<Attachment.Title>{sourceTitle(c.sourceId)}</Attachment.Title>
															</Attachment.Content>
														</Attachment.Root>
													{/each}
													<span class="flex-1"></span>
													<Button
														size="xs"
														shape="circle"
														variant="ghost"
														tone="neutral"
														tooltip="Copy"
														aria-label="Copy answer"
														onclick={() => toast.success('Copied')}><Copy /></Button
													>
													<Button size="xs" variant="soft" tone="primary" onclick={onQuiz}
														><Sparkles />Quiz me on this</Button
													>
												</Message.Footer>
											{/if}
										</Message.Content>
									</Message.Root>
								</div>
							{/if}
						</MessageScroller.Item>
					{/each}
					{#if thinking}
						<MessageScroller.Item>
							<Marker.Root role="status">
								<Marker.Icon><Spinner /></Marker.Icon>
								<Marker.Content class="text-muted-foreground"
									>Reading {selectedCount} sources…</Marker.Content
								>
							</Marker.Root>
						</MessageScroller.Item>
					{/if}
				</MessageScroller.Content>
			</MessageScroller.Viewport>
			<MessageScroller.Button />
		</MessageScroller.Root>
	</MessageScroller.Provider>

	<div class="mx-auto w-full max-w-2xl space-y-2 px-4 pb-4 sm:px-6">
		<div class="flex gap-1.5 overflow-x-auto pb-0.5">
			{#each suggestions as suggestion (suggestion)}
				<Button
					size="xs"
					variant="outline"
					tone="neutral"
					class="shrink-0"
					disabled={thinking}
					onclick={() => send(suggestion)}>{suggestion}</Button
				>
			{/each}
		</div>
		<InputGroup.Root class="rounded-3xl">
			<InputGroup.Textarea
				bind:value={draft}
				onkeydown={onKeydown}
				rows={1}
				placeholder={selectedCount
					? `Ask about ${selectedCount} ${selectedCount === 1 ? 'source' : 'sources'}…`
					: 'Pick at least one source to ask about'}
				aria-label="Ask your sources"
				class="max-h-36 min-h-11"
			/>
			<InputGroup.Addon align="inline-end">
				<InputGroup.Button
					size="icon-xs"
					variant="solid"
					tone="primary"
					aria-label="Send"
					disabled={!draft.trim() || thinking || !selectedCount}
					onclick={() => send()}><ArrowUp /></InputGroup.Button
				>
			</InputGroup.Addon>
		</InputGroup.Root>
	</div>
</section>
