<script lang="ts">
	import type { PageData } from './$types';
	import { browser } from '$app/environment';
	import Table from './components/Table.svelte';
	import Search from './components/Search.svelte';
	import AddNewQuestionModal from './components/AddNewQuestionModal.svelte';
	import EditQuestionModal from './components/EditQuestionModal.svelte';
	import { LogicMap } from './logic.svelte';
	import DeleteConfirmationModel from './components/DeleteConfirmationModel.svelte';
	import SortOptions from './components/SortOptions.svelte';

	// Retrieve the questions from props.
	let { data }: { data: PageData } = $props();

	let lm = $state(new LogicMap(data));

	$effect(() => {
		if (browser) {
			// Initialize from URL parameters
			const urlParams = new URLSearchParams(window.location.search);
			lm.searchQuery = urlParams.get('search') || '';
			lm.currentPage = parseInt(urlParams.get('page') || '1', 10);
			lm.questionsPerPage = parseInt(urlParams.get('perPage') || '10', 10);

			// Create effect for URL updates
			$effect(() => {
				const params = new URLSearchParams();
				if (lm.searchQuery) params.set('search', lm.searchQuery);
				params.set('page', lm.currentPage.toString());
				params.set('perPage', lm.questionsPerPage.toString());

				const newUrl = `${window.location.pathname}${
					params.toString() ? '?' + params.toString() : ''
				}`;
				window.history.replaceState({}, '', newUrl);
			});

			// Handle browser back/forward navigation
			window.addEventListener('popstate', () => {
				const params = new URLSearchParams(window.location.search);
				lm.searchQuery = params.get('search') || '';
				lm.currentPage = parseInt(params.get('page') || '1', 10);
				lm.questionsPerPage = parseInt(params.get('perPage') || '10', 10);
			});
		}
	});

	// Reset to first page when filters change
	$effect(() => {
		// When search query or chapter changes, reset to page 1
		if (lm.searchQuery || lm.selectedChapter) {
			lm.currentPage = 1;
		}
	});
</script>

<!-- Search and filter panel -->
<div class="rounded-box border border-base-content/12 bg-base-100 mx-6 mt-12 mb-4">
	<div class="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
		<div class="flex flex-col sm:flex-row items-center gap-4 w-full">
			<Search bind:lm />
		</div>

		<SortOptions bind:lm />
	</div>
</div>

<!-- Delete Confirmation Modal -->
<DeleteConfirmationModel bind:lm />

<AddNewQuestionModal bind:lm />
<EditQuestionModal bind:lm />

<Table bind:lm />
