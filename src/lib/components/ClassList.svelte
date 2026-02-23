<script lang="ts">
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import ClassCard from './ClassCard.svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { ClassWithSemester } from '../types';
	import { pickDefaultSemesterName, setLastSemesterName } from '../utils/semester';
	import { ChevronDown } from 'lucide-svelte';

	interface Props {
		classes: {
			data: ClassWithSemester[];
			isLoading: boolean;
			error: any;
		};
		onSelectClass: (classItem: ClassWithSemester) => void;
		title?: string;
		variant?: 'grid' | 'list';
	}

	let { classes, onSelectClass, title = 'My Classes', variant = 'grid' }: Props = $props();

	const semesters = useQuery(api.semester.getAllSemesters, {});

	let currentSemester = $state('');

	$effect(() => {
		if (semesters.data && !currentSemester) {
			currentSemester = pickDefaultSemesterName(semesters.data);
		}
	});

	$effect(() => {
		if (currentSemester) setLastSemesterName(currentSemester);
	});

	const filteredClasses = $derived(
		!classes.data || !currentSemester
			? classes.data
			: classes.data.filter((classItem) => classItem.semester?.name === currentSemester)
	);
</script>

<div in:fade={{ duration: 400, easing: cubicOut }} class="w-full">
	<div class="mb-6 flex justify-between items-center">
		<h3 class="text-lg font-semibold text-base-content">{title}</h3>

		{#if semesters.isLoading}
			<div class="skeleton h-9 w-32 rounded-full"></div>
		{:else if semesters.error != null}
			<div class="text-error text-sm">Failed to load semesters</div>
		{:else}
			<button class="btn btn-sm rounded-full gap-1.5 border-base-300 hover:border-primary/30 transition-colors duration-200" popovertarget="popover-1" style="anchor-name:--anchor-1">
				{currentSemester}
				<ChevronDown size={14} class="text-base-content/50" />
			</button>
			<ul
				class="dropdown menu w-52 rounded-xl bg-base-100 shadow-lg border border-base-300"
				popover
				id="popover-1"
				style="position-anchor:--anchor-1"
			>
				{#each semesters.data as semester (semester._id)}
					<li>
						<button
							onclick={() => (currentSemester = semester.name)}
							class="rounded-lg hover:bg-base-200 transition-colors duration-150"
							class:font-semibold={currentSemester === semester.name}
							style={currentSemester === semester.name ? "background: color-mix(in oklab, var(--color-primary) 8%, transparent)" : ""}
						>
							{semester.name}
							{#if currentSemester === semester.name}
								<span class="text-primary ml-auto">✓</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if classes.isLoading}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each Array(4), index (index)}
				<div class="rounded-2xl bg-base-100 shadow-sm border border-base-300 p-5 animate-pulse">
					<div class="flex items-start gap-3 mb-3">
						<div class="skeleton h-8 w-8 rounded-lg shrink-0"></div>
						<div class="flex-1 space-y-2">
							<div class="skeleton h-5 w-3/4"></div>
							<div class="skeleton h-4 w-16 rounded-full"></div>
						</div>
					</div>
					<div class="space-y-2 mb-4">
						<div class="skeleton h-3.5 w-full"></div>
						<div class="skeleton h-3.5 w-full"></div>
						<div class="skeleton h-3.5 w-2/3"></div>
					</div>
					<div class="flex justify-end">
						<div class="skeleton h-8 w-20 rounded-full"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if classes.error}
		<div class="alert alert-error rounded-2xl shadow-sm border border-error/20">
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
		<div class="rounded-2xl bg-base-100 shadow-sm border border-base-300 p-8">
			<div class="text-center py-8">
				<div class="text-5xl mb-4">📚</div>
				<h3 class="text-lg font-semibold mb-2 text-base-content">No classes yet</h3>
				<p class="text-base-content/60 text-sm">Your classes will appear here once enrolled.</p>
			</div>
		</div>
	{:else if variant === 'grid'}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
			{#each filteredClasses as classItem, i (classItem._id)}
				<div style="animation: cardReveal 0.4s cubic-bezier(.16,1,.3,1) {i * 60}ms both;">
					<ClassCard {classItem} onSelect={onSelectClass} />
				</div>
			{/each}
		</div>
	{:else}
		<ul class="list">
			{#each filteredClasses as classItem (classItem._id)}
				<li class="list-row">
					<button
						class="btn btn-ghost w-full justify-start gap-3 rounded-xl"
						onclick={() => onSelectClass(classItem)}
					>
						<div class="list-col-grow text-left">
							<div class="font-medium truncate">{classItem.name}</div>
							<div class="text-xs text-base-content/60">{classItem.code}</div>
						</div>
						{#if classItem.semester?.name}
							<span class="badge badge-soft badge-sm rounded-full">{classItem.semester.name}</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	@keyframes cardReveal {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
