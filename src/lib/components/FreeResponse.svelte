<script lang="ts">
	import QuestionRichTextEditor from '$lib/admin/questions/QuestionRichTextEditor.svelte';
	import {
		acceptanceLevels,
		responseText,
		responseWordCount,
		MAX_RESPONSE_WORDS
	} from '$lib/utils/freeResponse';
	import type { Doc } from '../../convex/_generated/dataModel';
	import type { QuizState } from '../../routes/classes/[classId]/modules/[moduleId]/states.svelte';
	let { qs, question }: { qs: QuizState; question: Doc<'question'> } = $props();
	let value = $derived(qs.selectedAnswers[0] ?? '');
	const words = $derived(responseWordCount(value));
	const grade = $derived(qs.freeResponseGrades[question._id]);
	const currentGrade = $derived(
		grade &&
			!qs.learningEvidence[question._id]?.needsFreshEvidence &&
			grade.response === responseText(value)
			? grade
			: null
	);
	function updateValue(html: string) {
		qs.selectedAnswers = responseText(html) ? [html] : [];
		qs.checkResult = '';
		qs.scheduleSave();
	}
</script>

<div class="mt-5 space-y-3">
	<div class="flex flex-wrap items-center justify-between gap-2 text-sm">
		<span class="font-semibold">Your response</span>
		<span class="text-base-content/60"
			>{acceptanceLevels[question.freeResponseAcceptance ?? 'lenient'].label} acceptance</span
		>
	</div>
	<QuestionRichTextEditor
		bind:value={() => value, updateValue}
		label="Your response"
		disabled={qs.gradingQuestionId === question._id}
	/>
	<p class="text-xs text-base-content/60">
		Graded on meaning. Formatting does not affect your grade. {words.toLocaleString()} / {MAX_RESPONSE_WORDS.toLocaleString()}
		words
	</p>
	{#if words > MAX_RESPONSE_WORDS}<p role="alert" class="text-sm text-error">
			Shorten your response to 1,500 words before submitting.
		</p>{/if}
	{#if qs.gradingQuestionId === question._id}<p
			role="status"
			class="flex items-center gap-2 text-sm"
		>
			<span class="loading loading-spinner loading-xs"></span> Grading your response…
		</p>{/if}
	{#if qs.gradingErrors[question._id]}<p role="alert" class="text-sm text-error">
			{qs.gradingErrors[question._id]}
		</p>{/if}
	{#if currentGrade}
		<section
			aria-label="Feedback"
			aria-live="polite"
			class="rounded-2xl border border-base-300 p-4 space-y-2"
		>
			<div class="flex items-center gap-2">
				<h3 class="font-semibold">Feedback</h3>
				<span
					class:badge-success={currentGrade.isCorrect}
					class:badge-warning={!currentGrade.isCorrect}
					class="badge badge-sm">{currentGrade.isCorrect ? 'Accepted' : 'Needs revision'}</span
				>
			</div>
			<p class="whitespace-pre-wrap text-sm">{currentGrade.feedback}</p>
			<details class="pt-2 text-sm">
				<summary class="cursor-pointer font-medium text-base-content/70">More</summary>
				<p class="whitespace-pre-wrap mt-2">{currentGrade.comparison}</p>
			</details>
		</section>
	{/if}
</div>
