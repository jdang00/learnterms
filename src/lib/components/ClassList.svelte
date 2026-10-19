<script lang="ts">
	import SemesterSelect from '$lib/components/SemesterSelect.svelte';
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import ClassCard from './ClassCard.svelte';
	import type { ClassWithSemester } from '../types';
	import type { ClassOverview } from '../utils/classProgress';
	import { pickDefaultSemesterName, setLastSemesterName } from '../utils/semester';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';

	interface Props {
		classes: {
			data: ClassWithSemester[];
			isLoading: boolean;
			error: unknown;
		};
		onSelectClass: (classItem: ClassWithSemester) => void;
		progress?: Map<string, ClassOverview>;
		progressLoading?: boolean;
		title?: string;
		variant?: 'grid' | 'list';
	}

	let {
		classes,
		onSelectClass,
		progress,
		progressLoading = false,
		title = 'My Classes',
		variant = 'grid'
	}: Props = $props();

	type SemesterOption = { _id: string; name: string };
	const semesters = $derived.by(() => {
		const source = classes.data ?? [];
		const seen: string[] = [];
		const list: SemesterOption[] = [];
		for (const classItem of source) {
			const semester = classItem.semester;
			if (!semester || seen.includes(semester._id)) continue;
			seen.push(semester._id);
			list.push({ _id: semester._id, name: semester.name });
		}
		return list;
	});

	let currentSemester = $state('');

	$effect(() => {
		if (semesters.length > 0 && !currentSemester) {
			currentSemester = pickDefaultSemesterName(semesters);
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
		<h3 class="text-lg font-semibold text-foreground">{title}</h3>

		{#if classes.isLoading}
			<Skeleton class="h-9 w-32 rounded-full" />
		{:else if classes.error != null}
			<div class="text-error-ink text-sm">Failed to load semesters</div>
		{:else if semesters.length === 0}
			<div class="text-foreground/60 text-sm">No semesters</div>
		{:else}
			<SemesterSelect {semesters} bind:value={currentSemester} />
		{/if}
	</div>

	{#if classes.isLoading}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each Array(4), index (index)}
				<div class="surface shadow-xs p-5 animate-pulse">
					<div class="flex items-start gap-3 mb-3">
						<Skeleton class="h-8 w-8 rounded-lg shrink-0" />
						<div class="flex-1 space-y-2">
							<Skeleton class="h-5 w-3/4" />
							<Skeleton class="h-4 w-16 rounded-full" />
						</div>
					</div>
					<div class="space-y-2 mb-4">
						<Skeleton class="h-3.5 w-full" />
						<Skeleton class="h-3.5 w-full" />
						<Skeleton class="h-3.5 w-2/3" />
					</div>
					<div class="flex justify-end">
						<Skeleton class="h-8 w-20 rounded-full" />
					</div>
				</div>
			{/each}
		</div>
	{:else if classes.error}
		<Alert.Root tone="error" class="rounded-2xl shadow-xs">
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
			<Alert.Title>Failed to load classes: {classes.error.toString()}</Alert.Title>
		</Alert.Root>
	{:else if !filteredClasses || filteredClasses.length === 0}
		<div class="surface shadow-xs p-8">
			<div class="text-center py-8">
				<div class="text-5xl mb-4">📚</div>
				<h3 class="text-lg font-semibold mb-2 text-foreground">No classes yet</h3>
				<p class="text-foreground/60 text-sm">Your classes will appear here once enrolled.</p>
			</div>
		</div>
	{:else if variant === 'grid'}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
			{#each filteredClasses as classItem, i (classItem._id)}
				<div
					class="h-full"
					style="animation: cardReveal 0.4s cubic-bezier(.16,1,.3,1) {i * 60}ms both;"
				>
					<ClassCard
						{classItem}
						onSelect={onSelectClass}
						progress={progress?.get(classItem._id)}
						loading={progressLoading}
					/>
				</div>
			{/each}
		</div>
	{:else}
		<ul class="list">
			{#each filteredClasses as classItem (classItem._id)}
				<li class="list-row">
					<Button
						variant="ghost"
						tone="neutral"
						shape="rect"
						class="w-full justify-start gap-3"
						onclick={() => onSelectClass(classItem)}
					>
						<div class="list-col-grow text-left">
							<div class="font-medium truncate">{classItem.name}</div>
							<div class="text-xs text-foreground/60">{classItem.code}</div>
						</div>
						{#if classItem.semester?.name}
							<Badge>{classItem.semester.name}</Badge>
						{/if}
					</Button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	@keyframes -global-cardReveal {
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
