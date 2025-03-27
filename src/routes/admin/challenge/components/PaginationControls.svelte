<script lang="ts">
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';

	let { currentPage, totalPages, questionsPerPage, totalEntries, goToPage } = $props();
</script>

<div class="flex flex-col sm:flex-row justify-between items-center">
	<!-- Left Side: Showing entries and items per page -->
	<div class="flex items-center">
		<span class="text-sm">
			Showing {totalEntries ? (currentPage - 1) * questionsPerPage + 1 : 0} to {Math.min(
				currentPage * questionsPerPage,
				totalEntries
			)} of {totalEntries} entries
		</span>
		<div class="ml-4">
			<label for="per-page" class="sr-only">Items per page</label>
			<select id="per-page" class="select select-sm" bind:value={questionsPerPage}>
				<option value={5}>5 per page</option>
				<option value={10}>10 per page</option>
				<option value={25}>25 per page</option>
				<option value={50}>50 per page</option>
				<option value={100}>100 per page</option>
			</select>
		</div>
	</div>

	<!-- Right Side: Navigation buttons -->
	<div class="join">
		<button class="join-item btn btn-sm" disabled={currentPage === 1} onclick={() => goToPage(1)}>
			First
		</button>
		<button
			class="join-item btn btn-sm"
			disabled={currentPage === 1}
			onclick={() => goToPage(currentPage - 1)}
		>
			<ChevronLeft size={16} />
		</button>

		{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
			let pageNum;
			if (totalPages <= 5) {
				pageNum = i + 1;
			} else if (currentPage <= 3) {
				pageNum = i + 1;
			} else if (currentPage >= totalPages - 2) {
				pageNum = totalPages - 4 + i;
			} else {
				pageNum = currentPage - 2 + i;
			}
			return pageNum;
		}) as pageNum (pageNum)}
			<button
				class="join-item btn btn-sm"
				class:btn-active={pageNum === currentPage}
				onclick={() => goToPage(pageNum)}
			>
				{pageNum}
			</button>
		{/each}

		<button
			class="join-item btn btn-sm"
			disabled={currentPage === totalPages}
			onclick={() => goToPage(currentPage + 1)}
		>
			<ChevronRight size={16} />
		</button>
		<button
			class="join-item btn btn-sm"
			disabled={currentPage === totalPages}
			onclick={() => goToPage(totalPages)}
		>
			Last
		</button>
	</div>
</div>
