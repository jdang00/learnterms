<script>
	import { Plus } from 'lucide-svelte';
	let {
		searchQuery = $bindable(),
		questions = $bindable(),
		selectedChapter = $bindable(),
		openAddModal
	} = $props();
</script>

<div class="flex flex-col sm:flex-row justify-between items-start">
	<div class="flex gap-2 mb-4 sm:mb-0">
		<button class="btn btn-primary" onclick={openAddModal}>
			<Plus size={16} /> Add Question
		</button>
	</div>

	<!-- Controls: Search Bar and Chapter Filter -->
	<div class="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
		<div>
			<label class="input">
				<svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
					<g
						stroke-linejoin="round"
						stroke-linecap="round"
						stroke-width="2.5"
						fill="none"
						stroke="currentColor"
					>
						<circle cx="11" cy="11" r="8"></circle>
						<path d="m21 21-4.3-4.3"></path>
					</g>
				</svg>
				<input
					id="search-input"
					type="search"
					placeholder="Search"
					bind:value={searchQuery}
					class="grow"
				/>
			</label>
		</div>

		<div>
			<select id="chapter-select" class="select" bind:value={selectedChapter}>
				<option value="">All Chapters</option>
				{#each Array.from(new Set(questions.map((q) => q.chapter))).sort() as chapter}
					{#if chapter}
						<option value={chapter}>{chapter}</option>
					{/if}
				{/each}
			</select>
			<label for="chapter-select" class="sr-only">Select Chapter</label>
		</div>
	</div>
</div>
