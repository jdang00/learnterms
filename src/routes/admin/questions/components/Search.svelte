<script lang="ts">
	import type { AdminChallengeQuestions } from '$lib/types';
	import { Plus, ArrowLeft, Search } from 'lucide-svelte';

	let { lm = $bindable() } = $props();

	let chapters = $derived.by(() => {
		return Array.from(new Set(lm.questions.map((q: AdminChallengeQuestions) => q.chapter))).sort(
			(a, b) => Number(a) - Number(b)
		);
	});
</script>

<div class="flex flex-col sm:flex-row justify-between items-start">
	<div class="flex flex-row gap-4">
		<a href="/admin" class="btn btn-ghost"><ArrowLeft /></a>
		<div class="flex gap-2 mb-4 sm:mb-0">
			<button class="btn btn-primary me-2" onclick={() => lm.openAddModal()}>
				<Plus size={16} /> Add Question
			</button>
		</div>
	</div>

	<!-- Controls: Search Bar, Chapter Filter, and Sort -->
	<div class="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
		<div>
			<label class="input">
				<Search />
				<input
					id="search-input"
					type="search"
					placeholder="Search"
					bind:value={lm.searchQuery}
					class="grow"
				/>
			</label>
		</div>

		<div>
			<select id="chapter-select" class="select" bind:value={lm.selectedChapter}>
				<option value="">All Chapters</option>
				{#each chapters as chapter (chapter)}
					{#if chapter}
						<option value={chapter}>{chapter}</option>
					{/if}
				{/each}
			</select>
			<label for="chapter-select" class="sr-only">Select Chapter</label>
		</div>
	</div>
</div>
