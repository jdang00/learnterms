<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { BookOpen, ChevronRight, Layers, Search } from 'lucide-svelte';
	import ModuleDetail from './ModuleDetail.svelte';

	let {
		cohortId,
		classId = '',
		moduleId = '',
		semesterId = '',
		now,
		onNavigate,
		onStudent
	}: {
		cohortId: Id<'cohort'>;
		classId?: string;
		moduleId?: string;
		semesterId?: string;
		now: number;
		onNavigate: (values: Record<string, string | null>) => void;
		onStudent: (id: Id<'users'>) => void;
	} = $props();
	let search = $state('');
	const semesters = useQuery(api.progress.getSemestersForCohort, () => ({ cohortId }));
	const validSemesterId = $derived(semesters.data?.find((s) => s._id === semesterId)?._id);
	const classesQuery = useQuery(api.curatorAnalytics.getModuleSelectorOptions, () => ({
		cohortId,
		semesterId: validSemesterId
	}));
	const selectedClass = $derived(classesQuery.data?.classes.find((c) => c._id === classId));
	const modulesQuery = useQuery(api.curatorAnalytics.getModuleSelectorOptions, () =>
		selectedClass ? { cohortId, semesterId: validSemesterId, classId: selectedClass._id } : 'skip'
	);
	const selectedModule = $derived(modulesQuery.data?.modules.find((m) => m._id === moduleId));
	const classes = $derived(
		(classesQuery.data?.classes ?? []).filter((c) =>
			`${c.name} ${c.code}`.toLowerCase().includes(search.toLowerCase())
		)
	);
	const modules = $derived(
		(modulesQuery.data?.modules ?? []).filter((m) =>
			m.title.toLowerCase().includes(search.toLowerCase())
		)
	);
	function navigate(values: Record<string, string | null>) {
		search = '';
		onNavigate(values);
	}
</script>

<div class="space-y-5">
	{#if selectedClass}<div class="flex flex-wrap items-center justify-between gap-3">
			<nav class="breadcrumbs min-w-0 text-sm" aria-label="Progress drill-down">
				<ul class="flex-wrap">
					<li>
						<button
							class="font-medium hover:text-primary"
							onclick={() => navigate({ class: null, module: null })}>All classes</button
						>
					</li>
					{#if selectedClass}<li>
							<button
								class="max-w-72 truncate font-medium hover:text-primary"
								onclick={() => navigate({ module: null })}>{selectedClass.name}</button
							>
						</li>{/if}{#if selectedModule}<li>
							<span class="max-w-64 truncate text-base-content/60" aria-current="page"
								>{selectedModule.title}</span
							>
						</li>{/if}
				</ul>
			</nav>
		</div>
	{/if}
	{#if semesters.error || classesQuery.error || modulesQuery.error}<div
			class="alert alert-error"
			role="alert"
		>
			The explorer could not load. {semesters.error?.message ??
				classesQuery.error?.message ??
				modulesQuery.error?.message}
		</div>
	{:else if classesQuery.isLoading || (selectedClass && modulesQuery.isLoading)}<div
			class="grid gap-4 sm:grid-cols-2"
		>
			{#each [1, 2, 3, 4] as row}<div class="skeleton h-40"></div>{/each}
		</div>
	{:else if selectedModule}
		{#key selectedModule._id}<ModuleDetail
				{cohortId}
				moduleId={selectedModule._id}
				{now}
				{onStudent}
			/>{/key}
	{:else}
		{#if (classId && !selectedClass) || (moduleId && !selectedModule)}<div
				class="alert alert-warning"
			>
				That selection is no longer available. Choose from the current list below.
			</div>{/if}
		<header class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<h2 class="text-xl font-semibold">
					{selectedClass?.name ?? 'Classes'}
				</h2>
			</div>
			<div class="flex w-full flex-wrap gap-2 sm:w-auto">
				<label class="input input-sm rounded-full w-full bg-base-100 sm:w-64"
					><Search size={18} class="text-base-content/50" /><input
						aria-label={selectedClass ? 'Search modules' : 'Search classes'}
						type="search"
						placeholder={selectedClass ? 'Search modules…' : 'Search classes…'}
						bind:value={search}
					/></label
				>
				{#if !selectedClass}
					<label class="flex items-center gap-2 text-sm text-base-content/60"
						><select
							class="select select-sm rounded-full w-40 bg-base-100"
							aria-label="Filter by semester"
							value={semesterId}
							onchange={(e) =>
								navigate({ semester: e.currentTarget.value || null, class: null, module: null })}
							><option value="">All semesters</option
							>{#each semesters.data ?? [] as semester (semester._id)}<option value={semester._id}
									>{semester.name}</option
								>{/each}</select
						></label
					>
				{/if}
			</div>
		</header>
		{#if selectedClass}
			<p class="text-sm text-base-content/60">
				{modules.length} of {modulesQuery.data?.modules.length ?? 0} modules
			</p>
			<div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
				{#each modules as module (module._id)}<button
						class="group flex min-h-36 flex-col rounded-2xl border border-base-300 bg-base-100 p-5 text-left transition hover:border-primary hover:shadow-sm"
						onclick={() => navigate({ module: module._id })}
						><span class="flex w-full items-center justify-between"
							><span class="text-2xl">{module.emoji ?? '📚'}</span></span
						><strong class="mt-4 text-lg leading-snug">{module.title}</strong><span
							class="mt-4 flex w-full items-center justify-between text-sm text-base-content/60"
							><span>{module.questionCount} questions · {module.status}</span><ChevronRight
								size={19}
								class="text-primary transition-transform group-hover:translate-x-1"
							/></span
						></button
					>{:else}<div
						class="col-span-full rounded-2xl border border-dashed border-base-300 p-10 text-center"
					>
						<Layers size={28} class="mx-auto mb-3 text-base-content/40" />
						<p>{search ? 'No modules match your search.' : 'No modules in this class yet.'}</p>
						{#if search}<button
								class="btn rounded-full btn-ghost mt-2"
								onclick={() => (search = '')}>Clear search</button
							>{/if}
					</div>{/each}
			</div>
		{:else}
			<p class="text-sm text-base-content/60">
				{classes.length} of {classesQuery.data?.classes.length ?? 0} classes
			</p>
			<div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
				{#each classes as course (course._id)}<button
						class="group relative flex min-h-44 flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 p-6 text-left transition hover:border-primary hover:shadow-sm"
						onclick={() => navigate({ class: course._id, module: null })}
						><span class="flex w-full items-center justify-between"
							><BookOpen size={20} class="text-primary" /></span
						><strong class="my-4 text-xl leading-snug tracking-tight">{course.name}</strong><span
							class="mt-auto flex w-full items-center justify-between text-sm text-base-content/60"
							>{course.code}
							<ChevronRight
								size={19}
								class="text-primary transition-transform group-hover:translate-x-1"
							/></span
						></button
					>{:else}<div
						class="col-span-full rounded-2xl border border-dashed border-base-300 p-10 text-center"
					>
						<BookOpen size={28} class="mx-auto mb-3 text-base-content/40" />
						<p>{search ? 'No classes match your search.' : 'No classes in this semester yet.'}</p>
						{#if search}<button
								class="btn rounded-full btn-ghost mt-2"
								onclick={() => (search = '')}>Clear search</button
							>{/if}
					</div>{/each}
			</div>
		{/if}
	{/if}
</div>
