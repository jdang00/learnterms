<script lang="ts">
	import { gradeStore } from '$lib/grade-calc/stores/gradeStore.svelte';
	import type { Component } from '$lib/grade-calc/types';
	import { applyBonusToFinal } from '$lib/grade-calc/utils/bonus';
	import BonusBadge from './BonusBadge.svelte';

	let { component }: { component: Component } = $props();

	function onInput(value: string) {
		const num = value === '' ? null : Number(value);
		gradeStore.updateSingle(component.id, Number.isFinite(num as number) ? (num as number) : null);
	}

	const bonus = $derived(
		component.bonusRule?.enabled
			? applyBonusToFinal(gradeStore.selectedCourse, gradeStore.userInputs, component)
			: null
	);
</script>

<div class="form-control w-full">
	<label class="label" for={component.id + '-pct'}>
		<span class="label-text">Score (out of {component.maxScore})</span>
		{#if bonus && bonus.bonusAmount > 0}
			<BonusBadge bonusAmount={bonus.bonusAmount} />
		{/if}
	</label>
	<input
		id={component.id + '-pct'}
		type="number"
		min="0"
		max={component.maxScore}
		step="0.01"
		placeholder="Enter score"
		class="input input-bordered w-full"
		value={(gradeStore.userInputs[component.id] as any)?.earnedScore ?? ''}
		oninput={(e) => onInput((e.target as HTMLInputElement).value)}
	/>
</div>


