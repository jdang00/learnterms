<script lang="ts">
	let { isAddModalOpen, closeAddModal, classId } = $props();

	import { X, BookOpenText, AlignLeft, Hash } from 'lucide-svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id } from '../../convex/_generated/dataModel';

	const client = useConvexClient();

	let moduleTitle: string = $state('');
	let moduleDescription: string = $state('');
	let moduleStatus: string = $state('draft');
	let isSubmitting: boolean = $state(false);

	// Get current modules to calculate next order number
	const modules = useQuery(api.module.getClassModules, {
		id: classId as Id<'class'>
	});

	async function handleSubmit() {
		if (!moduleTitle || !classId) return;

		isSubmitting = true;

		try {
			// Calculate next order number
			const nextOrder = modules.data?.length
				? Math.max(...modules.data.map((m) => m.order)) + 1
				: 0;

			await client.mutation(api.module.insertModule, {
				title: moduleTitle,
				description: moduleDescription,
				status: moduleStatus.toLowerCase(),
				classId: classId as Id<'class'>,
				order: nextOrder,
				metadata: {},
				updatedAt: Date.now()
			});

			// Reset form
			moduleTitle = '';
			moduleDescription = '';
			moduleStatus = 'draft';
			closeAddModal();
		} catch (error) {
			console.error('Failed to create module:', error);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<dialog class="modal p-6" class:modal-open={isAddModalOpen}>
	<div class="modal-box w-full max-w-2xl rounded-2xl border border-base-300 shadow-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
				onclick={closeAddModal}
				aria-label="Close"
			>
				<X size={18} />
			</button>
		</form>

		<div class="mb-6 flex items-center gap-2">
			<h3 class="text-2xl font-extrabold tracking-tight">Add New Module</h3>
		</div>

		<!-- Responsive form: description snaps to top on mobile -->
		<div class="flex flex-col gap-6">
			<!-- Description block (first on mobile, later in grid on md+) -->
			<div class="md:hidden">
				<label
					class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80"
					for="module-description"
				>
					<AlignLeft size={18} class="text-primary/80" />
					<span>Description</span>
				</label>
				<textarea
					id="module-description"
					class="textarea textarea-bordered w-full min-h-48"
					bind:value={moduleDescription}
					placeholder="Enter module description..."
				></textarea>
			</div>

			<!-- Two-column label/field grid for md+; single column on mobile -->
			<div class="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-[auto_1fr]">
				<label
					class="label m-0 hidden items-center gap-2 p-0 text-base font-medium text-base-content/80 md:flex"
					for="module-title"
				>
					<BookOpenText size={18} class="text-primary/80" />
					<span>Module Title</span>
				</label>
				<div class="md:contents">
					<label
						for="module-title"
						class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden"
					>
						<BookOpenText size={18} class="text-primary/80" />
						<span>Module Title</span>
					</label>
					<input
						id="module-title"
						type="text"
						placeholder="Enter module title..."
						class="input input-bordered w-full"
						bind:value={moduleTitle}
					/>
				</div>

				<label
					class="label m-0 hidden items-center gap-2 p-0 text-base font-medium text-base-content/80 md:flex"
					for="module-status"
				>
					<Hash size={18} class="text-primary/80" />
					<span>Status</span>
				</label>
				<div class="md:contents">
					<label
						for="module-status"
						class="label m-0 flex items-center gap-2 p-0 text-base font-medium text-base-content/80 md:hidden"
					>
						<Hash size={18} class="text-primary/80" />
						<span>Status</span>
					</label>
					<select
						id="module-status"
						class="select select-bordered w-full"
						bind:value={moduleStatus}
					>
						<option value="draft">Draft</option>
						<option value="published">Published</option>
						<option value="archived">Archived</option>
					</select>
				</div>

				<label
					class="label m-0 hidden items-center gap-2 self-start p-0 text-base font-medium text-base-content/80 md:flex"
					for="module-description"
				>
					<AlignLeft size={18} class="text-primary/80" />
					<span>Description</span>
				</label>
				<textarea
					id="module-description"
					class="textarea textarea-bordered hidden w-full min-h-48 md:block"
					bind:value={moduleDescription}
					placeholder="Enter module description..."
				></textarea>
			</div>
		</div>

		<div class="modal-action mt-8">
			<form method="dialog" class="flex gap-3">
				<button class="btn btn-ghost" onclick={closeAddModal} disabled={isSubmitting}>Cancel</button
				>
				<button
					class="btn btn-primary gap-2"
					onclick={handleSubmit}
					disabled={isSubmitting || !moduleTitle}
				>
					{#if isSubmitting}
						<span class="loading loading-spinner loading-sm"></span>
						<span>Creating...</span>
					{:else}
						<span>Create Module</span>
					{/if}
				</button>
			</form>
		</div>
	</div>
</dialog>
