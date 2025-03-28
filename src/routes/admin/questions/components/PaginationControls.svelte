<script lang="ts">
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';

	let { lm = $bindable() } = $props();
</script>

<div class="flex flex-col sm:flex-row justify-between items-center">
	<!-- Left Side: Showing entries and items per page -->
	<div class="flex items-center">
		<span class="text-sm">
			Showing {lm.totalEntries ? (lm.currentPage - 1) * lm.questionsPerPage + 1 : 0} to {Math.min(
				lm.currentPage * lm.questionsPerPage,
				lm.totalEntries
			)} of {lm.totalEntries} entries
		</span>
		<div class="ml-4">
			<label for="per-page" class="sr-only">Items per page</label>
			<select id="per-page" class="select select-sm" bind:value={lm.questionsPerPage}>
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
		<button
			class="join-item btn btn-sm"
			disabled={lm.currentPage === 1}
			onclick={() => lm.goToPage(1)}
		>
			First
		</button>
		<button
			class="join-item btn btn-sm"
			disabled={lm.currentPage === 1}
			onclick={() => lm.goToPage(lm.currentPage - 1)}
		>
			<ChevronLeft size={16} />
		</button>

		{#each Array.from({ length: Math.min(5, lm.totalPages) }, (_, i) => {
			let pageNum;
			if (lm.totalPages <= 5) {
				pageNum = i + 1;
			} else if (lm.currentPage <= 3) {
				pageNum = i + 1;
			} else if (lm.currentPage >= lm.totalPages - 2) {
				pageNum = lm.totalPages - 4 + i;
			} else {
				pageNum = lm.currentPage - 2 + i;
			}
			return pageNum;
		}) as pageNum (pageNum)}
			<button
				class="join-item btn btn-sm"
				class:btn-active={pageNum === lm.currentPage}
				onclick={() => lm.goToPage(pageNum)}
			>
				{pageNum}
			</button>
		{/each}

		<button
			class="join-item btn btn-sm"
			disabled={lm.currentPage === lm.totalPages}
			onclick={() => lm.goToPage(lm.currentPage + 1)}
		>
			<ChevronRight size={16} />
		</button>
		<button
			class="join-item btn btn-sm"
			disabled={lm.currentPage === lm.totalPages}
			onclick={() => lm.goToPage(lm.totalPages)}
		>
			Last
		</button>
	</div>
</div>
