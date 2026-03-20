<script lang="ts">
	import { gradeStore } from '$lib/grade-calc/stores/gradeStore.svelte';
	import type { Component } from '$lib/grade-calc/types';
	import DroppedBadge from './DroppedBadge.svelte';
	import ReplacedBadge from './ReplacedBadge.svelte';
	import { computeReplacementForGroup } from '$lib/grade-calc/utils/replacement';

	let { component }: { component: Component } = $props();

	const isPoints = $derived(gradeStore.selectedCourse.calculationType === 'points');
	const inputs = $derived((gradeStore.userInputs[component.id] as any)?.instances ?? []);

	function onInput(index: number, value: string) {
		const num = value === '' ? null : Number(value);
		gradeStore.updateGroupInstance(component.id, index, Number.isFinite(num as number) ? (num as number) : null);
	}

	function getDroppedIndices(): number[] {
		const drop = component.dropLowest ?? 0;
		if (drop <= 0) return [];
		const rows = (inputs ?? [])
			.map((inst: any, idx: number) => {
				const val = isPoints ? inst?.earnedPoints : inst?.earnedScore;
				const max = isPoints ? component.pointsPerInstance ?? 0 : component.instances?.[0]?.maxScore ?? 100;
				if (val === null || val === undefined || max <= 0) return null;
				const clamped = Math.max(0, Math.min(Number(val), max));
				return { idx, pct: (clamped / max) * 100 };
			})
			.filter(Boolean) as Array<{ idx: number; pct: number }>;
		if (rows.length === 0) return [];
		rows.sort((a, b) => a.pct - b.pct);
		return rows.slice(0, Math.min(drop, rows.length)).map((r) => r.idx);
	}

	const droppedIndices = $derived(getDroppedIndices());

	function getReplacedIndices(): number[] {
		if (!component.replacementRule?.enabled || isPoints) return [];
		const sourceId = component.replacementRule.sourceComponentId;
		const finalScore: number | null = (gradeStore.userInputs[sourceId] as any)?.earnedScore ?? null;
		const sourceComp = gradeStore.selectedCourse.components.find((c) => c.id === sourceId);
		const finalMax = sourceComp?.maxScore ?? null;
		const preview = computeReplacementForGroup(component, inputs, finalScore, finalMax);
		return preview.replacedIndices;
	}

	const replacedIndices = $derived(getReplacedIndices());
</script>

<div class="space-y-2">
	{#if (component.dropLowest ?? 0) > 0}
		<div class="alert alert-info">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
			</svg>
			<span>Lowest {component.dropLowest} score{(component.dropLowest ?? 0) > 1 ? 's' : ''} will be dropped</span>
		</div>
	{/if}
	{#each component.instances ?? [] as _, index}
		<div class="form-control w-full">
			<label class="label" for={component.id + '-' + index}>
				<span class="label-text">
					{component.name} {index + 1}
					{#if droppedIndices.includes(index)}
						<DroppedBadge />
					{/if}
					{#if replacedIndices.includes(index)}
						<ReplacedBadge />
					{/if}
				</span>
				<span class="label-text-alt">
					out of {isPoints ? component.pointsPerInstance : (component.instances?.[0]?.maxScore ?? 100)}
				</span>
			</label>
			<input
				id={component.id + '-' + index}
				type="number"
				min="0"
				max={isPoints ? component.pointsPerInstance : (component.instances?.[0]?.maxScore ?? 100)}
				step="0.01"
				placeholder="Enter score"
				class={"input input-bordered w-full " + (droppedIndices.includes(index) ? 'opacity-50' : '')}
				disabled={droppedIndices.includes(index)}
				aria-disabled={droppedIndices.includes(index)}
				value={(isPoints ? (inputs[index]?.earnedPoints ?? '') : (inputs[index]?.earnedScore ?? ''))}
				oninput={(e) => onInput(index, (e.target as HTMLInputElement).value)}
			/>
		</div>
	{/each}
</div>


