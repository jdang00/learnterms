<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { ArrowLeft, BookOpen, ChevronRight, Flag, Layers, Search } from 'lucide-svelte';
	import ModuleDetail from './ModuleDetail.svelte';
	import { relativeTime } from './utils';

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
	let sort = $state<'order' | 'recent' | 'students' | 'quiet' | 'flags'>('order');
	const semesters = useQuery(api.progress.getSemestersForCohort, () => ({ cohortId }));
	const validSemesterId = $derived(semesters.data?.find((s) => s._id === semesterId)?._id);
	// Point-in-time snapshot refreshed each minute: a live subscription here would re-run
	// the cohort-wide rollup on every answer any student saves.
	const client = useConvexClient();
	const coverage = $state<{
		data?: FunctionReturnType<typeof api.progress.getCurriculumActivity>;
		error?: Error;
	}>({});
	$effect(() => {
		if (semesterId && !semesters.data) return;
		const args = { cohortId, semesterId: validSemesterId };
		let cancelled = false;
		const load = () =>
			client
				.query(api.progress.getCurriculumActivity, args)
				.then((data) => {
					if (cancelled) return;
					coverage.data = data;
					coverage.error = undefined;
				})
				.catch((error: unknown) => {
					if (!cancelled)
						coverage.error = error instanceof Error ? error : new Error(String(error));
				});
		load();
		const timer = setInterval(load, 60_000);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	});
	const classes = $derived(coverage.data?.classes ?? []);
	const totalStudents = $derived(coverage.data?.totalStudents ?? 0);
	const selectedClass = $derived(classes.find((c) => c.classId === classId) ?? classes[0]);
	const selectedModule = $derived(
		moduleId ? classes.flatMap((c) => c.modules).find((m) => m.moduleId === moduleId) : undefined
	);
	const query = $derived(search.trim().toLowerCase());
	const visibleModules = $derived.by(() => {
		const pool = query
			? classes.flatMap((c) => c.modules).filter((m) => m.moduleTitle.toLowerCase().includes(query))
			: (selectedClass?.modules ?? []);
		const sorted = [...pool];
		if (sort === 'students') sorted.sort((a, b) => b.activeStudents - a.activeStudents);
		if (sort === 'quiet') sorted.sort((a, b) => (a.lastActivityAt ?? 0) - (b.lastActivityAt ?? 0));
		if (sort === 'flags') sorted.sort((a, b) => b.questionsFlagged - a.questionsFlagged);
		if (sort === 'recent') sorted.sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0));
		return sorted;
	});
</script>

{#if coverage.error || semesters.error}
	<div class="alert alert-error alert-soft" role="alert">
		Class insights could not load. {coverage.error?.message ?? semesters.error?.message}
	</div>
{:else if moduleId && selectedModule}
	<div class="space-y-4">
		<nav class="flex flex-wrap items-center gap-2 text-sm" aria-label="Module breadcrumb">
			<button
				class="btn btn-ghost btn-sm rounded-full"
				onclick={() => onNavigate({ module: null, class: selectedModule.classId })}
				><ArrowLeft size={15} />{selectedModule.className}</button
			>
		</nav>
		{#key selectedModule.moduleId}<ModuleDetail
				{cohortId}
				moduleId={selectedModule.moduleId}
				{now}
				{onStudent}
			/>{/key}
	</div>
{:else if !coverage.data}
	<div class="space-y-4">
		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			{#each [1, 2, 3, 4] as row (row)}<div class="skeleton h-14"></div>{/each}
		</div>
		<div class="skeleton h-80"></div>
	</div>
{:else}
	{#if moduleId && !selectedModule}
		<div class="alert alert-warning alert-soft mb-4">
			That module is no longer available.
			<button class="btn btn-ghost btn-xs rounded-full" onclick={() => onNavigate({ module: null })}
				>Dismiss</button
			>
		</div>
	{/if}
	<div class="space-y-4">
		<div class="flex flex-wrap items-center gap-2">
			<select
				class="select select-sm w-44 rounded-full"
				aria-label="Filter by semester"
				value={semesterId}
				onchange={(e) =>
					onNavigate({ semester: e.currentTarget.value || null, class: null, module: null })}
				><option value="">All semesters</option
				>{#each semesters.data ?? [] as semester (semester._id)}<option value={semester._id}
						>{semester.name}</option
					>{/each}</select
			>
			<span class="text-xs text-base-content/50"
				>{classes.length} {classes.length === 1 ? 'class' : 'classes'}</span
			>
			<label class="input input-sm ml-auto w-full min-w-0 rounded-full sm:w-64"
				><Search size={15} class="text-base-content/50" /><input
					type="search"
					placeholder="Search modules in every class…"
					aria-label="Search modules in every class"
					bind:value={search}
				/></label
			>
		</div>

		<nav class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Classes">
			{#each classes as course (course.classId)}
				{@const active = !query && course.classId === selectedClass?.classId}
				<button
					class="rounded-xl border px-3.5 py-2.5 text-left transition {active
						? 'border-primary bg-primary/5'
						: 'border-base-300 bg-base-100 hover:border-base-content/25'}"
					aria-current={active ? 'true' : undefined}
					onclick={() => {
						search = '';
						onNavigate({ class: course.classId, module: null });
					}}
				>
					<span class="flex items-center gap-2">
						<span
							class="min-w-0 flex-1 truncate text-sm font-semibold {active ? 'text-primary' : ''}"
							title={course.name}>{course.name}</span
						>
						{#if course.questionsFlagged}<span
								class="flex shrink-0 items-center gap-0.5 text-xs text-warning tabular-nums"
								title="{course.questionsFlagged} student flags"
								><Flag size={11} />{course.questionsFlagged}</span
							>{/if}
					</span>
					<span class="mt-0.5 block truncate text-xs text-base-content/50">
						{course.code} · {course.activeStudents} studying · {course.lastActivityAt
							? relativeTime(course.lastActivityAt, now)
							: 'no activity'}
					</span>
				</button>
			{:else}
				<div
					class="col-span-full rounded-2xl border border-dashed border-base-300 p-10 text-center text-sm text-base-content/55"
				>
					<BookOpen size={22} class="mx-auto mb-2 text-base-content/35" />
					No classes in this semester yet.
				</div>
			{/each}
		</nav>

		<section class="card card-border min-w-0 overflow-hidden bg-base-100">
			<header
				class="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 px-5 py-4"
			>
				<div class="min-w-0">
					<h2 class="truncate text-base font-semibold">
						{query ? `Modules matching “${search.trim()}”` : (selectedClass?.name ?? 'Modules')}
					</h2>
					<p class="text-xs text-base-content/55">
						{query
							? `${visibleModules.length} across all classes`
							: selectedClass
								? `${selectedClass.modules.length} modules · ${selectedClass.totalQuestions} questions · ${selectedClass.activeStudents} of ${totalStudents} students studying`
								: 'Choose a class'}
					</p>
				</div>
				<select
					class="select select-sm w-40 rounded-full"
					aria-label="Sort modules"
					bind:value={sort}
				>
					<option value="order">Course order</option>
					<option value="recent">Recently studied</option>
					<option value="students">Most students</option>
					<option value="quiet">Quietest first</option>
					<option value="flags">Most flags</option>
				</select>
			</header>

			{#if visibleModules.length}
				<div class="overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr class="text-[11px] text-base-content/50">
								<th class="pl-5">Module</th>
								<th class="text-right">Questions</th>
								<th>Students</th>
								<th class="text-right">Answers</th>
								<th class="text-right">Flags</th>
								<th>Last studied</th>
								<th><span class="sr-only">Open</span></th>
							</tr>
						</thead>
						<tbody>
							{#each visibleModules as module (module.moduleId)}
								<tr
									class="cursor-pointer hover:bg-base-200/50"
									onclick={() => onNavigate({ class: module.classId, module: module.moduleId })}
								>
									<td class="py-2.5 pl-5">
										<span class="flex items-center gap-3">
											<span
												class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-base-200"
												>{module.moduleEmoji ?? '📚'}</span
											>
											<span class="min-w-0">
												<span class="block max-w-72 truncate font-medium">{module.moduleTitle}</span
												>
												<span class="block text-[11px] text-base-content/50"
													>{query ? module.className : ''}{#if module.moduleStatus !== 'published'}
														<span class="badge badge-ghost badge-xs capitalize"
															>{module.moduleStatus}</span
														>{/if}</span
												>
											</span>
										</span>
									</td>
									<td class="text-right tabular-nums">{module.totalQuestions}</td>
									<td class="whitespace-nowrap tabular-nums"
										>{module.activeStudents}<span class="text-base-content/40"
											>/{totalStudents}</span
										></td
									>
									<td class="text-right tabular-nums">{module.questionsInteracted}</td>
									<td class="text-right">
										{#if module.questionsFlagged}<span
												class="badge badge-soft badge-warning badge-sm tabular-nums"
												>{module.questionsFlagged}</span
											>{:else}<span class="text-base-content/35">—</span>{/if}
									</td>
									<td class="whitespace-nowrap text-xs text-base-content/60"
										>{module.lastActivityAt ? relativeTime(module.lastActivityAt, now) : '—'}</td
									>
									<td class="pr-4"><ChevronRight size={15} class="text-base-content/40" /></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<div class="p-12 text-center">
					<Layers size={26} class="mx-auto mb-3 text-base-content/40" />
					<p class="text-sm text-base-content/60">
						{query ? 'No modules match your search.' : 'No modules in this class yet.'}
					</p>
					{#if query}<button
							class="btn btn-ghost btn-sm mt-2 rounded-full"
							onclick={() => (search = '')}>Clear search</button
						>{/if}
				</div>
			{/if}
		</section>
	</div>
{/if}
