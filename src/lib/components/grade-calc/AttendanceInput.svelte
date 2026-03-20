<script lang="ts">
	import { gradeStore } from '$lib/grade-calc/stores/gradeStore.svelte';
	import type { Component } from '$lib/grade-calc/types';

	let { component }: { component: Component } = $props();

	function onInput(value: string) {
		const num = value === '' ? null : Number(value);
		gradeStore.updateAttendance(
			component.id,
			Number.isFinite(num as number) ? (num as number) : null
		);
	}
</script>

<div class="form-control w-full">
	<label class="label" for={component.id + '-att'}>
		<span class="label-text">Sessions attended</span>
		<span class="label-text-alt">out of {component.sessionsTotal}</span>
	</label>
	<input
		id={component.id + '-att'}
		type="number"
		min="0"
		max={component.sessionsTotal}
		step="0.01"
		placeholder="Enter sessions attended"
		class="input input-bordered w-full"
		value={(gradeStore.userInputs[component.id] as any)?.sessionsAttended ?? ''}
		oninput={(e) => onInput((e.target as HTMLInputElement).value)}
	/>
</div>


