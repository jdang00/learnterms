<script lang="ts">
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Id } from '../../convex/_generated/dataModel';
	import ClassCard from './ClassCard.svelte';

	interface ClassType {
		_id: Id<'class'>;
		name: string;
		code: string;
		description?: string;
	}

	interface Props {
		classes: {
			data: ClassType[] | undefined;
			isLoading: boolean;
			error: any;
		};
		onSelectClass: (classItem: ClassType) => void;
		title?: string;
	}

	let { classes, onSelectClass, title = 'My Classes' }: Props = $props();
</script>

<div in:fade={{ duration: 400, easing: cubicOut }} class="w-full">
	<div class="flex justify-between mb-6">
		<h3 class="text-lg font-semibold">{title}</h3>
	</div>

	{#if classes.isLoading}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each Array(4), index (index)}
				<div class="card bg-base-100 shadow-md animate-pulse">
					<div class="card-body">
						<div class="skeleton h-8 w-32 mb-4"></div>
						<div class="skeleton h-4 w-full mb-2"></div>
						<div class="skeleton h-4 w-full mb-2"></div>
						<div class="skeleton h-4 w-2/3 mb-4"></div>
						<div class="skeleton h-8 w-8 rounded-full ml-auto"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if classes.error}
		<div class="alert alert-error">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="stroke-current shrink-0 h-6 w-6"
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
			<span>Failed to load classes: {classes.error.toString()}</span>
		</div>
	{:else if !classes.data || classes.data.length === 0}
		<div class="card bg-base-100 shadow-md">
			<div class="card-body py-12">
				<div class="text-4xl mb-4">📚</div>
				<h3 class="text-lg font-semibold mb-2">No classes yet</h3>
				<p class="text-base-content/70">Your classes will appear here once enrolled.</p>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each classes.data as classItem (classItem._id)}
				<ClassCard {classItem} onSelect={onSelectClass} />
			{/each}
		</div>
	{/if}
</div> 