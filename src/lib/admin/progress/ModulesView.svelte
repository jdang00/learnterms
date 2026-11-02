<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import Grid3x3 from '@lucide/svelte/icons/grid-3x3';
	import List from '@lucide/svelte/icons/list';
	import Search from '@lucide/svelte/icons/search';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import SemesterSelect from '#lib/components/SemesterSelect.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import { SegmentedControl } from '#lib/components/ui/segmented-control/index.js';
	import { SelectField } from '#lib/components/ui/select/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { classPulse } from './aggregate';
	import ClassGrid from './ClassGrid.svelte';
	import type { ModuleWindow, ProgressDashboard } from './dashboard.svelte';
	import ModuleRow from './ModuleRow.svelte';
	import LiveDot from './viz/LiveDot.svelte';

	let {
		dashboard,
		classId = '',
		semesterId = '',
		layout = 'grid',
		onNavigate,
		onOpen,
		onStudent
	}: {
		dashboard: ProgressDashboard;
		classId?: string;
		semesterId?: string;
		layout?: string;
		onNavigate: (values: Record<string, string | null>) => void;
		onOpen: (moduleId: Id<'module'>) => void;
		onStudent: (id: Id<'users'>) => void;
	} = $props();

	const semesters = useQuery(api.progress.getSemestersForCohort, () => {
		const cohortId = dashboard.cohortId();
		return cohortId ? { cohortId } : 'skip';
	});
	let search = $state('');
	let window = $state<ModuleWindow>('today');
	let sort = $state<'order' | 'active' | 'quiet' | 'flags'>('order');

	const classes = $derived(
		(dashboard.curriculum?.classes ?? []).filter((c) => !semesterId || c.semesterId === semesterId)
	);
	const pulses = $derived(classPulse(dashboard.modules, dashboard.liveByModule, dashboard.now));
	// Default to the class with the most students in it right now, then today.
	const selected = $derived(
		classes.find((c) => c.classId === classId) ??
			[...classes].sort(
				(a, b) =>
					(pulses.get(b.classId)?.live ?? 0) - (pulses.get(a.classId)?.live ?? 0) ||
					(pulses.get(b.classId)?.today ?? 0) - (pulses.get(a.classId)?.today ?? 0)
			)[0]
	);
	const query = $derived(search.trim().toLowerCase());
	const classModules = $derived(
		dashboard.modules
			.filter((m) => m.classId === selected?.classId)
			.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
	);
	const listModules = $derived.by(() => {
		const pool = query
			? dashboard.modules.filter((m) => m.title.toLowerCase().includes(query))
			: classModules;
		const sorted = [...pool];
		if (sort === 'active')
			sorted.sort(
				(a, b) =>
					b.counts[window] - a.counts[window] || (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0)
			);
		if (sort === 'quiet') sorted.sort((a, b) => (a.lastActivityAt ?? 0) - (b.lastActivityAt ?? 0));
		if (sort === 'flags') sorted.sort((a, b) => b.flags - a.flags);
		return sorted;
	});
	const people = (moduleId: string) =>
		(dashboard.liveByModule.get(moduleId) ?? [])
			.map((id) => dashboard.studentsById.get(id))
			.filter((s) => s !== undefined);
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-center gap-2">
		<SemesterSelect
			semesters={semesters.data}
			by="id"
			allLabel="All semesters"
			value={semesterId}
			aria-label="Filter by semester"
			onValueChange={(next) => onNavigate({ semester: next || null, class: null })}
		/>
		<InputGroup.Root class="ml-auto w-full min-w-0 rounded-full sm:w-64">
			<InputGroup.Addon><Search size={15} class="text-muted-foreground" /></InputGroup.Addon>
			<InputGroup.Input
				type="search"
				placeholder="Search every module"
				aria-label="Search every module"
				class="h-8 px-3 text-sm"
				bind:value={search}
			/>
		</InputGroup.Root>
	</div>

	{#if !dashboard.curriculum}
		<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
			{#each [1, 2, 3, 4] as row (row)}<Skeleton class="h-16" />{/each}
		</div>
		<Skeleton class="h-96" />
	{:else if !classes.length}
		<Empty.Root class="surface-dashed p-10">
			<Empty.Description>No classes in this semester yet.</Empty.Description>
		</Empty.Root>
	{:else}
		{#if !query}
			<nav class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Classes">
				{#each classes as course (course.classId)}
					{@const pulse = pulses.get(course.classId)}
					{@const active = course.classId === selected?.classId}
					<button
						type="button"
						class="surface-sm px-3.5 py-2.5 text-left transition {active
							? 'border-primary bg-primary/5'
							: 'hover:border-foreground/25'}"
						aria-current={active ? 'true' : undefined}
						onclick={() => onNavigate({ class: course.classId })}
					>
						<span class="flex items-center gap-2">
							<span
								class="min-w-0 flex-1 truncate text-sm font-semibold {active
									? 'text-primary-ink'
									: ''}">{course.name}</span
							>
							{#if pulse?.live}<span
									class="flex shrink-0 items-center gap-1.5 text-xs font-medium text-success-ink tabular-nums"
									><LiveDot />{pulse.live}</span
								>{/if}
						</span>
						<span class="mt-0.5 block truncate text-xs text-muted-foreground"
							>{course.code} · {pulse?.today ?? 0} today · {course.modules.length} modules</span
						>
					</button>
				{/each}
			</nav>
		{/if}

		<Card.Root class="gap-0 py-0">
			<header class="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
				<h2 class="min-w-0 truncate text-base font-semibold">
					{query ? `Modules matching “${search.trim()}”` : selected?.name}
				</h2>
				<div class="flex flex-wrap items-center gap-2">
					{#if layout === 'list' || query}
						<SegmentedControl
							bind:value={window}
							options={[
								{ value: 'now', label: 'Now' },
								{ value: 'today', label: 'Today' },
								{ value: 'week', label: '7 days' }
							]}
							size="xs"
							track="muted"
							activeVariant="raised"
							aria-label="Time window"
						/>
						<SelectField
							size="sm"
							class="w-40"
							aria-label="Sort modules"
							value={sort}
							onValueChange={(v) => (sort = v as typeof sort)}
							options={[
								{ value: 'order', label: 'Course order' },
								{ value: 'active', label: 'Most active' },
								{ value: 'quiet', label: 'Quietest' },
								{ value: 'flags', label: 'Most flags' }
							]}
						/>
					{/if}
					{#if !query}
						<SegmentedControl
							value={layout === 'list' ? 'list' : 'grid'}
							onValueChange={(next) => onNavigate({ layout: next === 'grid' ? null : next })}
							options={[
								{ value: 'grid', label: 'Grid', icon: Grid3x3 },
								{ value: 'list', label: 'List', icon: List }
							]}
							size="xs"
							track="muted"
							activeVariant="raised"
							aria-label="Layout"
						/>
					{/if}
				</div>
			</header>
			{#if layout !== 'list' && !query && selected}
				<div class="px-5 pb-5">
					{#key selected.classId}
						<ClassGrid
							{dashboard}
							classId={selected.classId}
							modules={classModules}
							{onOpen}
							{onStudent}
						/>
					{/key}
				</div>
			{:else}
				<div class="divide-y divide-muted border-t border-muted">
					{#each listModules as module (module.moduleId)}
						<ModuleRow
							{module}
							{window}
							cohortSize={dashboard.students.length}
							livePeople={people(module.moduleId)}
							pulse={dashboard.pulses.get(module.moduleId)}
							now={dashboard.now}
							showClass={!!query}
							{onOpen}
							{onStudent}
						/>
					{:else}
						<p class="px-5 py-12 text-center text-sm text-muted-foreground">
							{query ? 'No modules match.' : 'No modules in this class yet.'}
						</p>
					{/each}
				</div>
			{/if}
		</Card.Root>
	{/if}
</div>
