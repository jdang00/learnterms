<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import type { PageData } from './$types';
	import { api } from '../../../../../convex/_generated/api.js';
	import type { Doc } from '../../../../../convex/_generated/dataModel';
	import QuizSideBar from '$lib/components/QuizSideBar.svelte';
	import QuizNavigation from '$lib/components/QuizNavigation.svelte';
	import AnswerOptions from '$lib/components/AnswerOptions.svelte';
	import { QuizState } from './states.svelte';
	import ActionButtons from '$lib/components/ActionButtons.svelte';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	let qs = $state(new QuizState());

	const questions = useQuery(
		api.question.getQuestionsByModule,
		{ id: data.moduleId },
		{ initialData: data.module }
	);

	const module = useQuery(
		api.module.getModuleById,
		{ id: data.moduleId },
		{ initialData: data.moduleInfo }
	);

	$effect(() => {
		if (questions.data && questions.data.length > 0) {
			qs.setQuestions(questions.data);
		}
	});

	// Get the currently selected question from QuizState
	let currentlySelected = $derived(
		qs.questions && qs.questions.length > 0 ? qs.getCurrentQuestion() : data.module[0]
	);

	function handleSelect(question: Doc<'question'>) {
		const currentQuestions = qs.isShuffled ? qs.shuffledQuestions : qs.questions;
		const index = currentQuestions.findIndex((q) => q._id === question._id);
		if (index !== -1) {
			qs.setCurrentQuestionIndex(index);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			return;
		}

		switch (event.key) {
			case 'ArrowRight':
				event.preventDefault();
				qs.goToNextQuestion();
				break;
			case 'ArrowLeft':
				event.preventDefault();
				qs.goToPreviousQuestion();
				break;
			case 'Tab':
				event.preventDefault();
				qs.handleSolution();
				break;
			case 's':
			case 'S':
				if (event.shiftKey) {
					event.preventDefault();
					qs.toggleShuffle();
				}
				break;
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
</script>

{#if questions.isLoading}
	<p>Loading...</p>
{:else if questions.error}
	<p>Error: {questions.error.message}</p>
{:else if currentlySelected}
	<div class="flex flex-col lg:flex-row min-h-screen mr-0 lg:mr-8">
		<QuizSideBar bind:qs {module} {currentlySelected} />

		<div class="w-full lg:w-3/4 flex flex-col max-w-full lg:max-w-none overflow-hidden flex-grow">
			<QuizNavigation
				questions={{ data: qs.isShuffled ? qs.shuffledQuestions : qs.questions }}
				{handleSelect}
				{currentlySelected}
			/>

			<div class="text-md sm:text-lg lg:text-xl p-4">
				<div class="flex flex-row flex-wrap mb-4">
					<h4 class="text-lg font-semibold mb-3">{currentlySelected.stem}</h4>
					<span class="text-base-content/70 font-medium text-xs ms-2 self-center mb-2">
						Pick {currentlySelected.correctAnswers.length}.
					</span>
				</div>
				<AnswerOptions bind:qs {currentlySelected} />
				<ActionButtons {qs} {currentlySelected} />
			</div>
		</div>
	</div>
{:else}
	<p>No questions available.</p>
{/if}
