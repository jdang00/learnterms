<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import type { PageData } from './$types';
	import { api } from '../../../../../convex/_generated/api.js';
	import type { Doc } from '../../../../../convex/_generated/dataModel';
	import QuizSideBar from '$lib/components/QuizSideBar.svelte';

	let { data }: { data: PageData } = $props();

	let questions = useQuery(api.question.getQuestionsByModule, { id: data.moduleId });
	const module = useQuery(api.module.getModuleById, { id: data.moduleId });

	let currentlySelected: Doc<'question'> = $state(data.firstQuestion[0]);

	function handleSelect(question: Doc<'question'>) {
		currentlySelected = question;
	}
</script>

{#if questions.isLoading}
	<p>Loading...</p>
{:else if questions.error}
	<p>Error: {questions.error.message}</p>
{:else}
	<div class="flex flex-col lg:flex-row min-h-screen">
		<QuizSideBar {module} />

		<div
			class="w-full lg:w-3/4 flex flex-col
			 p-2 sm:p-3 lg:p-8 mx-0
			lg:mx-6 my-0 max-w-full lg:max-w-none overflow-hidden flex-grow"
		>
			<div
				class="
    flex flex-row w-full overflow-x-auto
    space-x-4
    relative
    items-center
    bg-transparent mt-2 mb-6 lg:my-0
  "
			>
				{#each questions.data as question, index (question._id)}
					<button class="btn btn-circle btn-soft" onclick={() => handleSelect(question)}
						>{index + 1}</button
					>
				{/each}
			</div>

			<div class="max-w-2xl mx-auto mt-12">
				<h4 class="text-lg font-semibold">{currentlySelected.stem}</h4>
				{#each currentlySelected.options as option (option.id)}
					<div class="flex flex-row items-center">
						<input type="radio" name="answer" value={option.id} />
						<p>{option.text}</p>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
