<script lang="ts">
	import type { AdminChallengeQuestions } from '$lib/types';
	import { Plus, ArrowLeft, Search, ListPlus } from 'lucide-svelte';

	let { lm = $bindable() } = $props();
	let chapters = $derived.by(() => {
		return Array.from(new Set(lm.questions.map((q: AdminChallengeQuestions) => q.chapter))).sort(
			(a, b) => Number(a) - Number(b)
		);
	});

	// Function to handle single question add
	function addSingleQuestion() {
		lm.openAddModal('single');
	}

	// Function to handle bulk add
	function addBulkQuestions() {
		lm.openAddModal('bulk');
	}
</script>

<div class="flex flex-col sm:flex-row justify-between items-start gap-4">
	<a href="/admin" class="btn btn-ghost" aria-label="Go back">
		<ArrowLeft />
	</a>
	<div class="dropdown dropdown-bottom">
		<label tabindex="-1" class="btn btn-primary">
			<Plus size={16} />
			<span>Add Questions</span>
			<svg
				class="h-2 w-2 ml-2 stroke-current"
				viewBox="0 0 8 4"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M1 1L4 3L7 1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</label>
		<ul tabindex="-1" class="dropdown-content z-10 menu p-2 shadow bg-base-200 rounded-box w-60">
			<li>
				<button onclick={addSingleQuestion} class="flex items-center p-2">
					<Plus size={16} />
					<span>Add Single Question</span>
				</button>
			</li>
			<li>
				<a href="/admin/challenge/new-set" class="flex items-center p-2">
					<ListPlus size={16} />

					<span>Add Multiple Questions</span>
				</a>
			</li>
		</ul>
	</div>

	<!-- Controls: Search Bar, Chapter Filter -->
	<div class="flex flex-col sm:flex-row gap-3 sm:items-center w-full sm:w-auto">
		<div class="relative">
			<label class="input input-bordered flex items-center gap-2">
				<Search class="w-4 h-4 opacity-70" />
				<input
					id="search-input"
					type="search"
					placeholder="Search questions"
					bind:value={lm.searchQuery}
					class="grow"
				/>
			</label>
		</div>

		<div>
			<select
				id="chapter-select"
				class="select select-bordered w-full"
				bind:value={lm.selectedChapter}
				aria-label="Filter by chapter"
			>
				<option value="">All Chapters</option>
				{#each chapters as chapter (chapter)}
					{#if chapter}
						<option value={chapter}>Chapter {chapter}</option>
					{/if}
				{/each}
			</select>
		</div>
	</div>
</div>
