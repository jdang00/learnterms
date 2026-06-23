<script lang="ts">
	import { ArrowLeft, Bot, ChevronDown, FileSearch, Send, Sparkles } from 'lucide-svelte';
	import { useClerkContext } from 'svelte-clerk';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
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

	type Message = {
		role: 'user' | 'assistant';
		text: string;
		sourceCount?: number;
		diagnostics?: unknown;
		context?: unknown;
		usage?: unknown;
	};

	let prompt = $state('');
	let selectedDocumentId = $state('');
	let isAsking = $state(false);
	let error = $state('');
	let messages = $state<Message[]>([]);

	const canAsk = $derived(
		Boolean(userData.data?.cohortId && selectedDocumentId && prompt.trim() && !isAsking)
	);
	const indexedDocs = $derived(docs.data ?? []);

	$effect(() => {
		if (!selectedDocumentId && indexedDocs.length > 0) {
			selectedDocumentId = indexedDocs[0]._id;
		}
	});

	function prettyJson(value: unknown) {
		return JSON.stringify(value, null, 2);
	}

	async function ask() {
		if (!canAsk || !userData.data?.cohortId) return;

		const question = prompt.trim();
		prompt = '';
		error = '';
		isAsking = true;
		messages = [...messages, { role: 'user', text: question }];

		try {
			const result = await client.action(api.ragKnowledge.askCohort, {
				cohortId: userData.data.cohortId as Id<'cohort'>,
				prompt: question,
					sourceDocumentId: selectedDocumentId
					? (selectedDocumentId as Id<'contentLib'>)
					: undefined,
				limit: 8
			});

			messages = [
				...messages,
				{
					role: 'assistant',
					text: result.answer,
					sourceCount: result.context?.results?.length ?? 0,
					diagnostics: result.diagnostics,
					context: result.context,
					usage: result.usage
				}
			];
		} catch (e) {
			error = e instanceof Error ? e.message : 'RAG chat failed';
			messages = messages.filter((message) => message.text !== question || message.role !== 'user');
		} finally {
			isAsking = false;
		}
	}
</script>

<div class="min-h-screen bg-base-200/40 px-4 py-8">
	<div class="mx-auto flex max-w-5xl flex-col gap-5">
		<div class="flex items-center justify-between gap-4">
			<a href={resolve('/admin')} class="btn btn-ghost btn-sm gap-2">
				<ArrowLeft size={16} />
				Admin
			</a>
			<div class="badge badge-outline gap-2 px-3 py-3">
				<Sparkles size={13} />
				Cohort RAG
			</div>
		</div>

		<section class="rounded-lg border border-base-300 bg-base-100 shadow-xs">
			<div class="border-b border-base-300 p-5">
				<div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div>
						<h1 class="text-2xl font-bold tracking-tight">RAG Console</h1>
						<p class="mt-1 text-sm text-base-content/60">
							Ask a question against indexed R2 knowledge and inspect the retrieval payload.
						</p>
					</div>

					<label class="form-control w-full md:max-w-xs">
						<span class="label-text mb-1 text-xs">Document filter</span>
						<select class="select select-bordered select-sm" bind:value={selectedDocumentId}>
							<option value="">Select indexed or mapped document</option>
							{#each indexedDocs as doc (doc._id)}
								<option value={doc._id}>{doc.title}</option>
							{/each}
						</select>
						<span class="mt-1 text-xs text-base-content/50">
							This tester queries one document namespace at a time.
						</span>
					</label>
				</div>
			</div>

			<div class="grid min-h-[560px] grid-rows-[1fr_auto]">
				<div class="space-y-4 overflow-y-auto p-5">
					{#if messages.length === 0}
						<div class="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
							<div class="mb-4 rounded-lg border border-base-300 bg-base-200 p-4">
								<FileSearch size={34} class="text-primary" />
							</div>
							<h2 class="text-base font-semibold">No conversation yet</h2>
							<p class="mt-1 max-w-md text-sm text-base-content/60">
								Select an indexed or mapped R2 document, then ask about definitions, mechanisms,
								formulas, or page-specific details.
							</p>
						</div>
					{:else}
						{#each messages as message}
							<div
								class="flex gap-3 {message.role === 'user' ? 'justify-end' : 'justify-start'}"
							>
								{#if message.role === 'assistant'}
									<div class="mt-1 rounded-md bg-primary/10 p-2 text-primary">
										<Bot size={16} />
									</div>
								{/if}
								<div
									class="max-w-[78%] rounded-lg border px-4 py-3 text-sm leading-relaxed {message.role ===
									'user'
										? 'border-primary bg-primary text-primary-content'
										: 'border-base-300 bg-base-200/70'}"
								>
									<p class="whitespace-pre-wrap">{message.text}</p>
									{#if message.role === 'assistant'}
										<p class="mt-2 text-xs text-base-content/50">
											{message.sourceCount ?? 0} retrieved chunk groups
										</p>
										<div class="mt-3 space-y-2">
											<details class="collapse collapse-arrow rounded-md border border-base-300 bg-base-100">
												<summary class="collapse-title min-h-0 px-3 py-2 text-xs font-semibold">
													<span class="inline-flex items-center gap-2">
														<ChevronDown size={13} />
														Diagnostics
													</span>
												</summary>
												<div class="collapse-content px-3 pb-3">
													<pre class="max-h-72 overflow-auto rounded bg-base-300/60 p-3 text-[11px] leading-relaxed">{prettyJson({
															diagnostics: message.diagnostics,
															usage: message.usage
														})}</pre>
												</div>
											</details>

											<details class="collapse collapse-arrow rounded-md border border-base-300 bg-base-100">
												<summary class="collapse-title min-h-0 px-3 py-2 text-xs font-semibold">
													Retrieved context
												</summary>
												<div class="collapse-content px-3 pb-3">
													<pre class="max-h-96 overflow-auto rounded bg-base-300/60 p-3 text-[11px] leading-relaxed">{prettyJson(message.context)}</pre>
												</div>
											</details>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					{/if}

					{#if error}
						<div class="alert alert-error text-sm">
							<span>{error}</span>
						</div>
					{/if}
				</div>

				<form
					class="border-t border-base-300 p-4"
					onsubmit={(event) => {
						event.preventDefault();
						ask();
					}}
				>
					<div class="flex gap-3">
						<textarea
							class="textarea textarea-bordered min-h-12 flex-1 resize-none"
							placeholder="Ask about the selected indexed or mapped document..."
							rows="2"
							bind:value={prompt}
						></textarea>
						<button class="btn btn-primary h-auto gap-2 px-5" disabled={!canAsk}>
							{#if isAsking}
								<span class="loading loading-spinner loading-sm"></span>
							{:else}
								<Send size={16} />
							{/if}
							<span class="hidden sm:inline">Ask</span>
						</button>
					</div>
				</form>
			</div>
		</section>
	</div>
</div>
