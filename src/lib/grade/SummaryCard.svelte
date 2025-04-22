<script lang="ts">
	import type { Course } from '$lib/models';
	import type { FinalResult } from '$lib/utils/gradeUtils';

	export let finalResult: FinalResult;
	export let course: Course;
</script>

<div class="card bg-primary text-primary-content shadow-xl sticky bottom-4">
	<div class="card-body items-center text-center">
		<h2 class="card-title text-2xl">
			Estimated Final {course.gradingMethod === 'percent' ? 'Grade' : 'Score'}
		</h2>
		<p class="text-5xl font-bold my-2">
			{#if course.gradingMethod === 'percent'}
				{finalResult.value.toFixed(2)}%
			{:else}
				{finalResult.value.toFixed(0)} pts
			{/if}
		</p>
		<p class="text-3xl font-semibold">Letter: {finalResult.letter}</p>
	</div>
</div>
