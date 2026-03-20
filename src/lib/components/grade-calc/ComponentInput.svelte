<script lang="ts">
	import { gradeStore } from '$lib/grade-calc/stores/gradeStore.svelte';
	import type { Component } from '$lib/grade-calc/types';
	import ComponentGroup from './ComponentGroup.svelte';
	import PercentageInput from './PercentageInput.svelte';
	import AttendanceInput from './AttendanceInput.svelte';

	let { component }: { component: Component } = $props();
	const course = $derived(gradeStore.selectedCourse);
	const isPoints = $derived(course.calculationType === 'points');

	function onSingleInput(value: string) {
		const num = value === '' ? null : Number(value);
		gradeStore.updateSingle(component.id, Number.isFinite(num as number) ? (num as number) : null);
	}
</script>

<section class="mb-6">
	<h3 class="text-lg font-semibold flex items-center">
		{component.name}
		{#if component.type === 'single' && component.weight}
			<span class="badge badge-ghost ml-2">{component.weight}%</span>
		{:else if component.type === 'single' && component.maxPoints}
			<span class="badge badge-ghost ml-2">{component.maxPoints} pts</span>
		{/if}
	</h3>
	<div class="mt-3">
		{#if component.type === 'group'}
			<ComponentGroup {component} />
		{:else if component.type === 'attendance'}
			<AttendanceInput {component} />
		{:else if component.type === 'single'}
			{#if isPoints}
				<div class="form-control w-full">
					<label class="label" for={component.id}>
						<span class="label-text">Score (out of {component.maxPoints})</span>
					</label>
					<input
						id={component.id}
						type="number"
						min="0"
						max={component.maxPoints}
						step="0.01"
						placeholder="Enter score"
						class="input input-bordered w-full"
						value={(gradeStore.userInputs[component.id] as any)?.earnedPoints ?? ''}
						oninput={(e) => onSingleInput((e.target as HTMLInputElement).value)}
					/>
				</div>
			{:else}
				<PercentageInput {component} />
			{/if}
		{/if}
	</div>
</section>


