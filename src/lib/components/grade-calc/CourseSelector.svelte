<script lang="ts">
	import { gradeStore } from '$lib/grade-calc/stores/gradeStore.svelte';
	import { courses } from '$lib/grade-calc/data/courses';
	import { RotateCcw, Trash2 } from 'lucide-svelte';
</script>

<div class="form-control w-full">
	<label class="label" for="course-select">
		<span class="label-text text-lg font-semibold mb-4">Select Course</span>
	</label>
	<select
		id="course-select"
		class="select select-bordered w-full select-lg"
		bind:value={gradeStore.selectedCourseId}
		onchange={() => gradeStore.selectCourse(gradeStore.selectedCourseId)}
	>
		{#each courses as course}
			<option value={course.id}>{course.code} - {course.name}</option>
		{/each}
	</select>

	<div class="my-8 flex flex-wrap gap-2 justify-center">
		<button type="button" class="btn btn-soft btn-warning btn-sm" onclick={() => gradeStore.clearCurrentCourse()}>
			<RotateCcw size={16} />
			<span class="ml-1">Clear this course</span>
		</button>
		<button type="button" class="btn btn-soft btn-error btn-sm" onclick={() => gradeStore.clearAllCourses()}>
			<Trash2 size={16} />
			<span class="ml-1">Clear all courses</span>
		</button>
	</div>
</div>


