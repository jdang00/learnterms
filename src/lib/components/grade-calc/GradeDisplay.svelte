<script lang="ts">
	import { gradeStore } from '$lib/grade-calc/stores/gradeStore.svelte';
	import ProgressBar from './ProgressBar.svelte';

	const grade = $derived(gradeStore.calculatedGrade);
	const course = $derived(gradeStore.selectedCourse);
	const gradeColor = $derived(getGradeColor(grade.letterGrade));

	function getGradeColor(letter: 'A' | 'B' | 'C' | 'F') {
		switch (letter) {
			case 'A':
				return 'success';
			case 'B':
				return 'info';
			case 'C':
				return 'warning';
			case 'F':
				return 'error';
			default:
				return 'neutral';
		}
	}

	function getBgClass(letter: string) {
		if (letter === 'A') return 'bg-success/10';
		if (letter === 'B') return 'bg-info/10';
		if (letter === 'C') return 'bg-warning/10';
		if (letter === 'F') return 'bg-error/10';
		return '';
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-lg font-semibold text-base-content/70">Current Grade</h3>
			<div class="flex items-baseline gap-3">
				<span class="text-4xl font-bold text-base-content">
					{grade.percentage.toFixed(2)}%
				</span>
				<div class={"badge badge-" + gradeColor + " badge-lg"}>
					{grade.letterGrade}
				</div>
			</div>
		</div>

		{#if course.calculationType === 'points'}
			<div class="text-right">
				<div class="text-sm text-base-content/70">Points Earned</div>
				<div class="text-2xl font-bold text-base-content">
					{grade.earnedPoints.toFixed(2)} / {grade.totalPoints.toFixed(2)}
				</div>
			</div>
		{/if}
	</div>

	<ProgressBar percentage={grade.percentage} color={gradeColor} />

	<div class="divider">Grading Scale</div>

	<div class="flex flex-col gap-2">
		{#each Object.entries(course.gradingScale) as [letter, scale]}
			<div class={"flex items-center justify-between p-3 rounded-lg " + getBgClass(letter)}>
				<div class={"badge badge-lg badge-" + getGradeColor(letter as 'A' | 'B' | 'C' | 'F')}>
					{letter}
				</div>
				<span class="text-sm">
					{scale.label}
				</span>
			</div>
		{/each}
	</div>
</div>


