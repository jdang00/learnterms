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

<div class="container mx-auto max-w-3xl px-4 py-8">
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
		<div class=" rounded-lg p-4 mb-4">
			<h1 class="text-3xl font-bold text-center">
				{selectedCourse.name}
			</h1>
		</div>

		<!-- Category Cards -->
		<div class="space-y-6 mb-8">
			{#each selectedCourse.categories as category, i (category.id)}
				<div in:fly={{ y: 20, delay: i * 75, duration: 300 }}>
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
