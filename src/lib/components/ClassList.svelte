<script lang="ts">
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Id } from '../../convex/_generated/dataModel';
	import ClassCard from './ClassCard.svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';

	interface ClassType {
		_id: Id<'class'>;
		_creationTime: number;
		updatedAt: number;
		cohortId: Id<'cohort'>;
		name: string;
		metadata: {};
		description: string;
		semesterId: Id<'semester'>;
		code: string;
		order: number;
		deletedAt?: number;
		semester?: {
			_id: Id<'semester'>;
			name: string;
		} | null;
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

	const semesters = useQuery(api.semester.getAllSemesters, {});

	let currentSemester = $state('');

	$effect(() => {
		if (semesters.data && semesters.data.length > 0 && !currentSemester) {
			currentSemester = semesters.data[0].name;
		}
	});

	const filteredClasses = $derived(
		!classes.data || !currentSemester 
			? classes.data 
			: classes.data.filter(classItem => 
				classItem.semester?.name === currentSemester
			)
	);
</script>

<div in:fade={{ duration: 400, easing: cubicOut }} class="w-full">
	<div class="flex justify-between mb-6">
		<h3 class="text-lg font-semibold">{title}</h3>

		{#if semesters.isLoading}
			Loading...
		{:else if semesters.error != null}
			failed to load: {semesters.error.toString()}
		{:else}<button class="btn" popovertarget="popover-1" style="anchor-name:--anchor-1">
				{currentSemester}
			</button>
			<ul
				class="dropdown menu w-52 rounded-box bg-base-100 shadow-sm"
				popover
				id="popover-1"
				style="position-anchor:--anchor-1"
			>
				{#each semesters.data as semester (semester._id)}
					<li>
						<button onclick={() => (currentSemester = semester.name)}>{semester.name}</button>
					</li>
				{/each}
			</ul>{/if}
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
	{:else if !filteredClasses || filteredClasses.length === 0}
		<div class="card bg-base-100 shadow-md">
			<div class="card-body py-12">
				<div class="text-4xl mb-4">📚</div>
				<h3 class="text-lg font-semibold mb-2">No classes yet</h3>
				<p class="text-base-content/70">Your classes will appear here once enrolled.</p>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each filteredClasses as classItem (classItem._id)}
				<ClassCard {classItem} onSelect={onSelectClass} />
			{/each}
		</div>
	{/if}
</div>
