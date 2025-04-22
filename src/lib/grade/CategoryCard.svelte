<script lang="ts">
	import type { Category } from '$lib/models';
	import { Plus } from 'lucide-svelte';
	import AssessmentRow from './AssessmentRow.svelte';

	export let category: Category;

	function addAssessment() {
		category.assessments = [
			...category.assessments,
			{ id: crypto.randomUUID(), score: null, total: null }
		];
	}

	function removeAssessment(id: string) {
		category.assessments = category.assessments.filter((a) => a.id !== id);
	}
</script>

<div class="card bg-base-100 border border-base-content/10 shadow">
	<div class="card-body">
		<div class="flex justify-between items-center mb-4">
			<h2 class="card-title">{category.name}</h2>
			<div class="flex items-center gap-2">
				<input
					type="number"
					class="input input-sm input-bordered w-20"
					bind:value={category.weightValue}
					min="0"
					aria-label="Category weight"
				/>
				<span class="text-sm">
					{category.weightType === 'percent' ? '%' : 'pts'}
				</span>
			</div>
		</div>

		<!-- removed max-h-60 and overflow classes so card expands -->
		<div class="space-y-3 mb-4 pr-2">
			{#if category.assessments.length === 0}
				<p class="text-center text-base-content/60 italic py-4">No items yet.</p>
			{/if}
			{#each category.assessments as assessment (assessment.id)}
				<AssessmentRow {assessment} onRemove={() => removeAssessment(assessment.id)} />
			{/each}
		</div>

		<button class="btn btn-sm btn-primary" on:click={addAssessment}>
			<Plus size={16} /> Add
		</button>
	</div>
</div>
