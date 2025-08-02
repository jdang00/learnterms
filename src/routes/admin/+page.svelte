<script lang="ts">
	import type { PageData } from './$types';
	import { useClerkContext } from 'svelte-clerk';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { Id } from '../../convex/_generated/dataModel';
	import { api } from '../../convex/_generated/api.js';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';

	const ctx = useClerkContext();

	let { data }: { data: PageData } = $props();
	const userData = data.userData;

	const classes = useQuery(api.class.getUserClasses, {
		id: (userData?.cohortId as Id<'cohort'>) || ''
	});

	const client = useConvexClient();

	type ClassItem = NonNullable<typeof classes.data>[0];
	let classList = $state<ClassItem[]>([]);

	$effect(() => {
		if (classes.data) {
			classList = [...classes.data];
		}
	});

	async function handleDrop(state: DragDropState<ClassItem>) {
		const { draggedItem, targetContainer } = state;
		if (!targetContainer) return;

		const draggedIndex = classList.findIndex((item) => item._id === draggedItem._id);
		const targetIndex = parseInt(targetContainer);

		if (draggedIndex !== -1 && !isNaN(targetIndex) && draggedIndex !== targetIndex) {
			const newClassList = [...classList];
			const [movedItem] = newClassList.splice(draggedIndex, 1);
			newClassList.splice(targetIndex, 0, movedItem);

			classList = newClassList;

			try {
				await client.mutation(api.class.updateClassOrder, {
					classId: movedItem._id,
					newOrder: targetIndex,
					cohortId: userData?.cohortId as Id<'cohort'>
				});
			} catch (error) {
				console.error('Failed to update class order:', error);
				classList = [...(classes.data || [])];
			}
		}
	}
</script>

<div class="min-h-screen bg-base-200 p-8">
	<div class="mb-8 flex flex-col gap-2">
		<h1 class="text-2xl font-bold text-base-content">Admin Dashboard</h1>
		<p class="text-base-content/70">Manage your learning classes. Drag and drop to reorder them.</p>
	</div>

	{#if classes.isLoading}
		<div class="flex items-center justify-center p-8">
			<div class="text-base-content/70">Loading classes...</div>
		</div>
	{:else if classes.error != null}
		<div class="flex items-center justify-center p-8">
			<div class="text-error">Failed to load: {classes.error.toString()}</div>
		</div>
	{:else}
		<div class="w-full max-w-4xl">
			<div class="rounded-xl bg-base-100 p-4 shadow-sm border border-base-300">
				<div class="space-y-3">
					{#each classList as classItem, index (classItem._id)}
						<div
							use:draggable={{ container: index.toString(), dragData: classItem }}
							use:droppable={{
								container: index.toString(),
								callbacks: { onDrop: handleDrop }
							}}
							animate:flip={{ duration: 200 }}
							in:fade={{ duration: 150 }}
							out:fade={{ duration: 150 }}
							class="cursor-move rounded-lg bg-base-100 p-4 shadow-sm border border-base-300
                                   transition-all duration-200 hover:shadow-md hover:border-primary svelte-dnd-touch-feedback"
						>
							<div class="mb-3 flex items-start justify-between gap-3">
								<div class="flex-1">
									<div class="flex flex-row gap-2 items-center">
										<h3 class="font-medium text-base-content mb-1">
											{classItem.name}
										</h3>
										<span class="text-xs text-base-content/60 font-mono">
											{classItem.code}
										</span>
									</div>
									<p class="text-sm text-base-content/70 mb-2">
										{classItem.description || 'No description available'}
									</p>
								</div>
								<div class="flex items-center gap-2">
									<span
										class="text-xs text-base-content/60 badge rounded-full badge-soft badge-neutral font-mono"
									>
										{classItem.semester?.name || 'No semester'}
									</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(.dragging) {
		@apply opacity-50 shadow-lg border-2 border-primary;
	}

	:global(.drag-over) {
		@apply bg-primary/10;
	}
</style>
