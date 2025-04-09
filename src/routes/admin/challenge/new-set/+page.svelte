<script lang="ts">
	import type { PageData } from './$types';
	import { NewSetLogic } from './NewSetLogic.svelte';
	import { createUploadThing } from '$lib/utils/uploadthing';
	import { AlertCircle, CheckCircle, Plus, Save } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import BulkQuestionRow from '../components/BulkQuestionRow.svelte';

	// Props & State
	let { data }: { data: PageData } = $props();
	let logic = $state(new NewSetLogic());

	// Initialize chapters when data is available
	$effect(() => {
		if (data?.existingChapters) {
			logic.loadChapters(data.existingChapters);
		}
	});

	// UploadThing Configuration
	const { startUpload } = createUploadThing('imageUploader', {
		onClientUploadComplete: (res) => {
			const index = logic.uploadingRowIndex;
			if (res && res.length > 0 && index !== null) {
				const uploadedUrl = res[0].url;
				logic.imageStates = {
					...logic.imageStates,
					[index]: { uploading: false, url: uploadedUrl }
				};
			}
			if (index !== null) {
				const currentImageState = logic.imageStates[index] || {};
				logic.imageStates = {
					...logic.imageStates,
					[index]: { ...currentImageState, uploading: false }
				};
			}
			logic.uploadingRowIndex = null;
		},
		onUploadError: (error) => {
			const index = logic.uploadingRowIndex;
			console.error('Upload error:', error);
			alert(`Upload failed: ${error.message}`);
			if (index !== null) {
				const currentImageState = logic.imageStates[index] || {};
				logic.imageStates = {
					...logic.imageStates,
					[index]: { ...currentImageState, uploading: false }
				};
			}
			logic.uploadingRowIndex = null;
		}
	});

	// Handle image upload for a specific row
	async function handleImageUploadForRow(event: Event, index: number) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files || files.length === 0) return;

		logic.uploadingRowIndex = index;
		await logic.handleImageUpload(files, index, startUpload);
		input.value = ''; // Clear file input
	}
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<div role="alert" class="alert alert-error mb-10">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-6 w-6 shrink-0 stroke-current"
			fill="none"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
		<span>This feautre is still under development and will not work yet. Coming soon!</span>
	</div>
	<header class="mb-8">
		<h1 class="text-3xl font-bold">Create New Question Set</h1>
	</header>

	<!-- Chapter Selection Card -->
	<section class="card bg-base-100 border border-base-content/10 shadow-md mb-8">
		<div class="card-body">
			<h2 class="card-title text-xl mb-4">Chapter Selection</h2>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
				<!-- Create New Chapter Option -->
				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-3 p-0 mb-3">
						<input
							type="radio"
							name="chapter-mode"
							class="radio radio-primary"
							checked={logic.isCreatingNewChapter}
							onchange={() => logic.toggleNewChapterMode(true)}
						/>
						<span class="label-text font-medium">Create New Chapter</span>
					</label>

					{#if logic.isCreatingNewChapter}
						<div class="mt-2">
							<input
								type="number"
								placeholder="Enter chapter number (e.g., 15)"
								class="input input-bordered w-full"
								min="1"
								step="1"
								bind:value={logic.newChapterNumber}
							/>
						</div>
					{/if}
				</div>

				<!-- Select Existing Chapter Option -->
				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-3 p-0 mb-3">
						<input
							type="radio"
							name="chapter-mode"
							class="radio radio-primary"
							checked={!logic.isCreatingNewChapter}
							onchange={() => logic.toggleNewChapterMode(false)}
						/>
						<span class="label-text font-medium">Select Existing Chapter</span>
					</label>

					{#if !logic.isCreatingNewChapter}
						<div class="mt-2">
							{#if logic.existingChapters.length > 0}
								<select class="select select-bordered w-full" bind:value={logic.selectedChapterId}>
									<option value={null} disabled selected>Select a chapter</option>
									{#each logic.existingChapters as chapter (chapter.id)}
										<option value={chapter.id}>
											{chapter.name || `Chapter ${chapter.id}`}
										</option>
									{/each}
								</select>
							{:else}
								<div class="alert alert-info shadow-sm">
									<p>No existing chapters found. Create a new chapter instead.</p>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- Status Messages -->
	{#if logic.saveError}
		<div class="alert alert-error mb-6 shadow-md" transition:fade={{ duration: 300 }}>
			<AlertCircle size={20} />
			<span class="whitespace-pre-wrap">{logic.saveError}</span>
		</div>
	{/if}

	{#if logic.saveSuccessMessage}
		<div class="alert alert-success mb-6 shadow-md" transition:fade={{ duration: 300 }}>
			<CheckCircle size={20} />
			<span>{logic.saveSuccessMessage}</span>
		</div>
	{/if}

	<!-- Questions Section -->
	<section class="mb-10">
		<div class="flex justify-between items-center mb-6">
			<h2 class="text-xl font-semibold">Questions</h2>

			<div class="flex gap-3 flex-wrap justify-end">
				<button class="btn btn-primary btn-sm sm:btn-md" onclick={() => logic.addRow()}>
					<Plus size={18} />
					<span class="hidden sm:inline">Add Question</span>
					<span class="sm:hidden">Add</span>
				</button>

				<button
					class="btn btn-success btn-sm sm:btn-md"
					onclick={logic.saveAll}
					disabled={logic.isSaving || logic.questionsToAdd.length === 0}
				>
					{#if logic.isSaving}
						<span class="loading loading-spinner loading-sm"></span>
						<span>Saving...</span>
					{:else}
						<Save size={18} />
						<span>Save All ({logic.questionsToAdd.length})</span>
					{/if}
				</button>
			</div>
		</div>

		<!-- Question Rows -->
		{#if logic.questionsToAdd.length > 0}
			<div class="space-y-6">
				{#each logic.questionsToAdd, index (index)}
					<BulkQuestionRow
						bind:question={logic.questionsToAdd[index]}
						{index}
						{logic}
						{handleImageUploadForRow}
					/>
				{/each}
			</div>
		{:else}
			<div class="text-center py-12 border-2 border-dashed border-base-300 rounded-lg bg-base-100">
				<div class="flex flex-col items-center gap-3">
					<Plus size={24} class="text-base-content/40" />
					<p class="text-base-content/60">Click "Add Question" to start building your set.</p>
					<button class="btn btn-primary btn-sm mt-2" onclick={() => logic.addRow()}>
						Add First Question
					</button>
				</div>
			</div>
		{/if}
	</section>
</div>
