<script lang="ts">
	import QuestionSources from '$lib/components/QuestionSources.svelte';
	import { untrack } from 'svelte';
	import QuestionRichTextEditor from './QuestionRichTextEditor.svelte';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { CandidateQuestion } from './questionStudioTypes';

	interface Props {
		candidate: CandidateQuestion;
		index: number;
		isMobile?: boolean;
		onDone: () => void;
	}

	let { candidate, index, isMobile = false, onDone }: Props = $props();
	const client = useConvexClient();

	// Snapshot once: subscription updates must not overwrite an in-progress edit.
	const initial = untrack(() => $state.snapshot(candidate));
	let stem = $state(initial.stem);
	let options = $state([...initial.options]);
	let answerIndex = $state(initial.options.indexOf(initial.correctAnswers[0]));
	let rationale = $state(initial.rationale);
	let saving = $state(false);
	let error = $state('');

	const optionIndexes = $derived(options.map((_, position) => position));
	const valid = $derived(
		stem.trim().length > 0 &&
			stem.length <= 900 &&
			rationale.trim().length > 0 &&
			rationale.length <= 1600 &&
			options.length === 4 &&
			options.every((option) => option.trim()) &&
			new Set(options.map((option) => option.trim().normalize('NFKC').toLowerCase())).size === 4 &&
			answerIndex >= 0 &&
			answerIndex < 4
	);

	async function apply() {
		if (!valid || !initial.metadata.jobId || saving) return;
		saving = true;
		error = '';
		try {
			await client.mutation(api.questionStudio.editCandidate, {
				jobId: initial.metadata.jobId,
				candidateIndex: index,
				expectedRevision: initial.metadata.curatorRevision ?? 0,
				stem,
				options,
				answerIndex,
				rationale
			});
			onDone();
		} catch (cause) {
			error =
				cause instanceof Error
					? cause.message
					: 'Could not apply edits. Your changes are still here.';
		} finally {
			saving = false;
		}
	}
</script>

<form
	class="flex min-h-0 flex-1 flex-col"
	onsubmit={(event) => {
		event.preventDefault();
		void apply();
	}}
>
	<div class="min-h-0 flex-1 overflow-y-auto {isMobile ? 'p-4' : 'p-6'}">
		<fieldset disabled={saving}>
			<!-- Question Stem -->
			<div class={isMobile ? 'mb-6' : 'mb-8'}>
				<QuestionRichTextEditor label="Question" bind:value={stem} disabled={saving} />
			</div>

			<!-- Options -->
			<div class={isMobile ? 'mb-4' : 'mb-6'}>
				<div
					class="text-xs font-semibold uppercase tracking-wide text-base-content/60 {isMobile
						? 'mb-2'
						: 'mb-3'}"
				>
					Options · select the correct answer
				</div>
				<div class={isMobile ? 'space-y-2' : 'space-y-3'}>
					{#each optionIndexes as optionIndex (optionIndex)}
						<div
							class="flex items-center rounded-full transition-colors {isMobile
								? 'border p-1.5'
								: 'border-2 p-2'} {answerIndex === optionIndex
								? 'border-success bg-success/5'
								: 'border-base-300 bg-base-100'}"
						>
							<input
								type="radio"
								class="radio shrink-0 {isMobile
									? 'radio-xs ms-2'
									: 'radio-sm ms-3'} {answerIndex === optionIndex ? 'radio-success' : ''}"
								aria-label={`Mark option ${String.fromCharCode(65 + optionIndex)} correct`}
								name={`answer-${index}`}
								value={optionIndex}
								bind:group={answerIndex}
							/>
							<span
								class="my-2 shrink-0 select-none font-semibold {isMobile
									? 'ml-2 text-xs'
									: 'ml-4 text-sm'}"
							>
								{String.fromCharCode(65 + optionIndex)}.
							</span>
							<input
								type="text"
								class="grow border-none bg-transparent px-2 focus:outline-none {isMobile
									? 'h-8 text-xs'
									: 'h-9 text-sm'}"
								aria-label={`Option ${String.fromCharCode(65 + optionIndex)}`}
								maxlength="260"
								required
								bind:value={options[optionIndex]}
							/>
						</div>
					{/each}
				</div>
			</div>

			<!-- Rationale -->
			<div>
				<div
					class="text-xs font-semibold uppercase tracking-wide text-base-content/60 {isMobile
						? 'mb-2'
						: 'mb-3'}"
				>
					Rationale
				</div>
				<QuestionRichTextEditor label="Rationale" bind:value={rationale} disabled={saving} />
				<QuestionSources
					source={{
						sourceDocumentId: initial.metadata.sourceDocumentId,
						sourceCitations: initial.sourceCitations,
						sourcePageNumbers: initial.sourcePageNumbers
					}}
					editing
				/>
			</div>
		</fieldset>
	</div>

	<!-- Pinned so the way out of the editor is always on screen -->
	<div class="shrink-0 border-t border-base-300 bg-base-100 {isMobile ? 'px-4 py-3' : 'px-6 py-3'}">
		{#if error}<p class="mb-2 text-sm text-error" role="alert">{error}</p>{/if}
		<div class="flex flex-wrap items-center gap-2">
			<p class="max-w-md text-xs text-base-content/45">
				{#if valid}
					Your edits replace the draft text and are not re-checked against the source.
				{:else}
					Fill every field, keep four distinct options, and pick one correct answer. Question and
					rationale limits are 900 and 1,600 characters, including formatting.
				{/if}
			</p>
			<div class="ml-auto flex items-center gap-2">
				<button
					type="button"
					class="btn btn-ghost btn-sm rounded-full"
					disabled={saving}
					onclick={onDone}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="btn btn-primary btn-sm rounded-full"
					disabled={!valid || saving}
				>
					{saving ? 'Applying…' : 'Apply edits'}
				</button>
			</div>
		</div>
	</div>
</form>
