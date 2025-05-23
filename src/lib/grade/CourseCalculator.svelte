<script lang="ts">
	import { courses } from '$lib/courseStore.svelte';
	import CategoryCard from './CategoryCard.svelte';
	import SummaryCard from './SummaryCard.svelte';
	import { computeFinal } from '$lib/utils/gradeUtils';
	import { fly, fade } from 'svelte/transition';

	// make this local so bind:value can write to it
	let selectedCourseId = $state<string>(courses[0].id);

	// derive the currently selected Course object
	const selectedCourse = $derived.by(
		() => courses.find((c) => c.id === selectedCourseId) ?? courses[0]
	);

	// derive the { value, letter } for that course
	const finalResult = $derived.by(() => computeFinal(selectedCourse));
</script>

<div class="container mx-auto max-w-5xl px-4 py-8">
	<!-- Instruction Banner -->
	<div class="mb-6 p-4 bg-base-200 text-base-content rounded-md">
		<p class="font-semibold">How to use this calculator:</p>
		<ol class="list-decimal list-inside ml-4">
			<li>Enter your scores and total points for each assessment above.</li>
			<li>Your estimated final grade will update instantly as you type.</li>
		</ol>
		<p class="mt-4 font-semibold">Your privacy matters:</p>
		<p>This tool runs entirely in your browser—no grades are ever sent, stored, or tracked.</p>
	</div>

	<!-- Course Selector -->
	<div class="mb-8 text-center">
		<label for="course-select" class="block text-sm font-medium mb-4">
			Select a course to calculate grades
		</label>
		<select
			id="course-select"
			bind:value={selectedCourseId}
			class="w-full max-w-xs mx-auto p-3 border border-gray-300 rounded-md text-center"
		>
			{#each courses as c (c.id)}
				<option value={c.id}>{c.name}</option>
			{/each}
		</select>
	</div>

	<!-- Course Content (with transitions) -->
	<div in:fade={{ duration: 300, delay: 150 }} out:fade={{ duration: 150 }}>
		<!-- Course Title -->
		<div class="rounded-lg p-4 mb-4">
			<h1 class="text-3xl font-bold text-center">
				{selectedCourse.name}
			</h1>
		</div>

		<!-- Category Cards: flex-wrap two-column, auto-center last item -->
		<div class="flex flex-col md:flex-row md:flex-wrap md:justify-center gap-6 mb-8">
			{#each selectedCourse.categories as category, i (category.id)}
				<div
					class="w-full md:w-[calc(50%-1.5rem)]"
					in:fly={{ y: 20, delay: i * 75, duration: 300 }}
				>
					<CategoryCard {category} />
				</div>
			{/each}
		</div>

		<!-- Final Summary -->
		<div in:fly={{ y: 20, duration: 400 }}>
			<SummaryCard {finalResult} course={selectedCourse} />
		</div>
	</div>
</div>
