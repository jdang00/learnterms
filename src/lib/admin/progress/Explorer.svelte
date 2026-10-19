<script lang="ts">
	import { SelectField } from '$lib/components/ui/select';
	import SemesterSelect from '$lib/components/SemesterSelect.svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { ArrowLeft, BookOpen, ChevronRight, Flag, Layers, Search } from 'lucide-svelte';
	import ModuleDetail from './ModuleDetail.svelte';
	import { relativeTime } from './utils';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import * as InputGroup from '$lib/components/ui/input-group';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';

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
	<Alert.Root tone="error" role="alert">
		<Alert.Description>
			Class insights could not load. {coverage.error?.message ?? semesters.error?.message}
		</Alert.Description>
	</Alert.Root>
{:else if moduleId && selectedModule}
	<div class="space-y-4">
		<nav class="flex flex-wrap items-center gap-2 text-sm" aria-label="Module breadcrumb">
			<Button
				variant="ghost"
				tone="neutral"
				size="sm"
				onclick={() => onNavigate({ module: null, class: selectedModule.classId })}
			>
				<ArrowLeft size={15} />{selectedModule.className}
			</Button>
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
			{#each [1, 2, 3, 4] as row (row)}<Skeleton class="h-14" />{/each}
		</div>
		<Skeleton class="h-80" />
	</div>
{:else}
	{#if moduleId && !selectedModule}
		<Alert.Root tone="warning" class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<Alert.Description>That module is no longer available.</Alert.Description>
			<Button variant="ghost" tone="neutral" size="xs" onclick={() => onNavigate({ module: null })}>
				Dismiss
			</Button>
		</Alert.Root>
	{/if}
	<div class="space-y-4">
		<div class="flex flex-wrap items-center gap-2">
			<SemesterSelect
				semesters={semesters.data}
				by="id"
				allLabel="All semesters"
				value={semesterId ?? ''}
				aria-label="Filter by semester"
				onValueChange={(next) => onNavigate({ semester: next || null, class: null, module: null })}
			/>
			<span class="text-xs text-foreground/50"
				>{classes.length} {classes.length === 1 ? 'class' : 'classes'}</span
			>
			<InputGroup.Root class="ml-auto w-full min-w-0 rounded-full sm:w-64">
				<InputGroup.Addon><Search size={15} class="text-foreground/50" /></InputGroup.Addon>
				<InputGroup.Input
					type="search"
					placeholder="Search modules in every class…"
					aria-label="Search modules in every class"
					class="h-8 px-3 text-sm"
					bind:value={search}
				/>
			</InputGroup.Root>
		</div>

		<nav class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Classes">
			{#each classes as course (course.classId)}
				{@const active = !query && course.classId === selectedClass?.classId}
				<button
					class="rounded-xl border px-3.5 py-2.5 text-left transition {active
						? 'border-primary bg-primary/5'
						: 'border-border bg-background hover:border-foreground/25'}"
					aria-current={active ? 'true' : undefined}
					onclick={() => {
						search = '';
						onNavigate({ class: course.classId, module: null });
					}}
				>
					<span class="flex items-center gap-2">
						<span
							class="min-w-0 flex-1 truncate text-sm font-semibold {active
								? 'text-primary-ink'
								: ''}"
							title={course.name}>{course.name}</span
						>
						{#if course.questionsFlagged}<span
								class="flex shrink-0 items-center gap-0.5 text-xs text-warning-ink tabular-nums"
								title="{course.questionsFlagged} student flags"
								><Flag size={11} />{course.questionsFlagged}</span
							>{/if}
					</span>
					<span class="mt-0.5 block truncate text-xs text-foreground/50">
						{course.code} · {course.activeStudents} studying · {course.lastActivityAt
							? relativeTime(course.lastActivityAt, now)
							: 'no activity'}
					</span>
				</button>
			{:else}
				<div
					class="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-sm text-foreground/55"
				>
					<BookOpen size={22} class="mx-auto mb-2 text-foreground/35" />
					No classes in this semester yet.
				</div>
			{/each}
		</nav>

		<Card.Root class="min-w-0 gap-0 overflow-hidden bg-background py-0">
			<header
				class="flex flex-wrap items-center justify-between gap-3 border-b border-muted px-5 py-4"
			>
				<div class="min-w-0">
					<h2 class="truncate text-base font-semibold">
						{query ? `Modules matching “${search.trim()}”` : (selectedClass?.name ?? 'Modules')}
					</h2>
					<p class="text-xs text-foreground/55">
						{query
							? `${visibleModules.length} across all classes`
							: selectedClass
								? `${selectedClass.modules.length} modules · ${selectedClass.totalQuestions} questions · ${selectedClass.activeStudents} of ${totalStudents} students studying`
								: 'Choose a class'}
					</p>
				</div>
				<SelectField
					size="sm"
					class="w-44"
					aria-label="Sort modules"
					value={sort}
					onValueChange={(v) => (sort = v as typeof sort)}
					options={[
						{ value: 'order', label: 'Course order' },
						{ value: 'recent', label: 'Recently studied' },
						{ value: 'students', label: 'Most students' },
						{ value: 'quiet', label: 'Quietest first' },
						{ value: 'flags', label: 'Most flags' }
					]}
				/>
			</header>

			{#if visibleModules.length}
				<Table.Root class="text-xs">
					<Table.Header>
						<Table.Row class="text-[11px] text-foreground/50">
							<Table.Head class="pl-5">Module</Table.Head>
							<Table.Head class="text-right">Questions</Table.Head>
							<Table.Head>Students</Table.Head>
							<Table.Head class="text-right">Answers</Table.Head>
							<Table.Head class="text-right">Flags</Table.Head>
							<Table.Head>Last studied</Table.Head>
							<Table.Head><span class="sr-only">Open</span></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each visibleModules as module (module.moduleId)}
							<Table.Row
								class="cursor-pointer hover:bg-muted/50"
								onclick={() => onNavigate({ class: module.classId, module: module.moduleId })}
							>
								<Table.Cell class="py-2.5 pl-5">
									<span class="flex items-center gap-3">
										<span
											class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted"
											>{module.moduleEmoji ?? '📚'}</span
										>
										<span class="min-w-0">
											<span class="block max-w-72 truncate font-medium">{module.moduleTitle}</span>
											<span class="block text-[11px] text-foreground/50"
												>{query ? module.className : ''}{#if module.moduleStatus !== 'published'}
													<Badge size="xs" class="capitalize">{module.moduleStatus}</Badge
													>{/if}</span
											>
										</span>
									</span>
								</Table.Cell>
								<Table.Cell class="text-right tabular-nums">{module.totalQuestions}</Table.Cell>
								<Table.Cell class="whitespace-nowrap tabular-nums"
									>{module.activeStudents}<span class="text-foreground/40">/{totalStudents}</span
									></Table.Cell
								>
								<Table.Cell class="text-right tabular-nums">{module.questionsInteracted}</Table.Cell
								>
								<Table.Cell class="text-right">
									{#if module.questionsFlagged}<Badge
											variant="soft"
											tone="warning"
											size="sm"
											class="tabular-nums">{module.questionsFlagged}</Badge
										>{:else}<span class="text-foreground/35">—</span>{/if}
								</Table.Cell>
								<Table.Cell class="whitespace-nowrap text-xs text-foreground/60"
									>{module.lastActivityAt
										? relativeTime(module.lastActivityAt, now)
										: '—'}</Table.Cell
								>
								<Table.Cell class="pr-4"
									><ChevronRight size={15} class="text-foreground/40" /></Table.Cell
								>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{:else}
				<div class="p-12 text-center">
					<Layers size={26} class="mx-auto mb-3 text-foreground/40" />
					<p class="text-sm text-foreground/60">
						{query ? 'No modules match your search.' : 'No modules in this class yet.'}
					</p>
					{#if query}<Button
							variant="ghost"
							tone="neutral"
							size="sm"
							class="mt-2"
							onclick={() => (search = '')}>Clear search</Button
						>{/if}
				</div>
			{/if}
		</Card.Root>
	</div>
{/if}
