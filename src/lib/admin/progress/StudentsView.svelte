<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Flame from '@lucide/svelte/icons/flame';
	import Search from '@lucide/svelte/icons/search';
	import type { Id } from '../../../convex/_generated/dataModel';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { SegmentedControl } from '#lib/components/ui/segmented-control/index.js';
	import { SelectField } from '#lib/components/ui/select/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import type { ProgressDashboard } from './dashboard.svelte';
	import StudentAvatar from './StudentAvatar.svelte';
	import { engagementMeta, relativeTime, type Engagement } from './utils';
	import LiveDot from './viz/LiveDot.svelte';

	let {
		dashboard,
		filter,
		onFilter,
		onStudent,
		onModule
	}: {
		dashboard: ProgressDashboard;
		filter: string;
		onFilter: (filter: string) => void;
		onStudent: (id: Id<'users'>) => void;
		onModule: (id: Id<'module'>) => void;
	} = $props();

	let search = $state('');
	let sort = $state('recent');
	const order: Engagement[] = ['live', 'active', 'cooling', 'dormant', 'none'];
	const onStreak = $derived(dashboard.students.filter((s) => s.streak >= 2).length);
	const filters = $derived([
		{ id: 'all', label: 'All', count: dashboard.students.length },
		...order.map((id) => ({
			id,
			label: engagementMeta[id].label,
			count: dashboard.engagementCounts[id]
		})),
		{ id: 'streak', label: 'On a streak', count: onStreak }
	]);
	type Student = ProgressDashboard['students'][number];
	const matches = (s: Student) =>
		filter === 'all' || (filter === 'streak' ? s.streak >= 2 : s.engagement === filter);
	const visible = $derived(
		dashboard.students
			.filter(
				(s) =>
					`${s.name} ${s.email ?? ''} ${s.username ?? ''}`
						.toLowerCase()
						.includes(search.toLowerCase()) && matches(s)
			)
			.sort((a, b) =>
				sort === 'name'
					? a.name.localeCompare(b.name)
					: sort === 'tried'
						? b.questionsInteracted - a.questionsInteracted || a.name.localeCompare(b.name)
						: sort === 'week'
							? b.weekTries - a.weekTries || a.name.localeCompare(b.name)
							: (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0) || a.name.localeCompare(b.name)
			)
	);
</script>

<Card.Root class="gap-0 overflow-hidden py-0">
	<div class="border-b border-muted p-5">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 class="text-base font-semibold">
				Students {#if dashboard.ready}<span class="font-normal text-muted-foreground tabular-nums"
						>{visible.length}/{dashboard.students.length}</span
					>{/if}
			</h2>
			<div class="flex w-full flex-wrap gap-2 sm:w-auto">
				<InputGroup.Root class="min-w-0 flex-1 rounded-full sm:w-60">
					<InputGroup.Addon><Search size={15} class="text-muted-foreground" /></InputGroup.Addon>
					<InputGroup.Input
						type="search"
						placeholder="Name, email, or username"
						aria-label="Search students"
						class="h-8 px-3 text-sm"
						bind:value={search}
					/>
				</InputGroup.Root>
				<SelectField
					size="sm"
					class="w-52"
					aria-label="Sort students"
					value={sort}
					onValueChange={(v) => (sort = v)}
					options={[
						{ value: 'recent', label: 'Recently active' },
						{ value: 'week', label: 'Most active this week' },
						{ value: 'tried', label: 'Most questions tried' },
						{ value: 'name', label: 'Name A–Z' }
					]}
				/>
			</div>
		</div>
		<SegmentedControl
			value={filter}
			onValueChange={onFilter}
			options={filters.map((option) => ({ value: option.id, label: option.label }))}
			size="xs"
			track="none"
			aria-label="Student filters"
			class="mt-4 gap-1.5"
			itemClass="data-[state=unchecked]:bg-muted"
		>
			{#snippet item(option)}
				{#if option.value in engagementMeta}<span
						class="inline-block size-1.5 rounded-full {engagementMeta[option.value as Engagement]
							.dot}"
					></span>{/if}{option.label}<span class="opacity-60 tabular-nums"
					>{filters.find((entry) => entry.id === option.value)?.count}</span
				>
			{/snippet}
		</SegmentedControl>
	</div>
	{#if !dashboard.ready}
		<div class="space-y-2 p-5">
			{#each [1, 2, 3, 4, 5] as row (row)}<Skeleton class="h-12" />{/each}
		</div>
	{:else if !visible.length}
		<div class="p-12 text-center">
			<h3 class="font-semibold">
				{dashboard.students.length ? 'No students in this view' : 'Your cohort is empty'}
			</h3>
			{#if dashboard.students.length}<Button
					variant="outline"
					tone="neutral"
					size="sm"
					class="mt-4"
					onclick={() => {
						search = '';
						onFilter('all');
					}}>Show all students</Button
				>{/if}
		</div>
	{:else}
		<Table.Root class="text-xs">
			<Table.Header>
				<Table.Row class="text-[11px] text-muted-foreground">
					<Table.Head class="pl-5">Student</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>Last module</Table.Head>
					<Table.Head class="text-right">This week</Table.Head>
					<Table.Head class="text-right">All time</Table.Head>
					<Table.Head class="text-right">Streak</Table.Head>
					<Table.Head>Last active</Table.Head>
					<Table.Head><span class="sr-only">Details</span></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each visible as student (student._id)}
					{@const meta = engagementMeta[student.engagement]}
					{@const module = student.lastModuleId
						? dashboard.modulesById.get(student.lastModuleId)
						: undefined}
					{@const pulse = dashboard.pulses.get(student._id)}
					<Table.Row
						class="cursor-pointer hover:bg-muted/50"
						onclick={() => onStudent(student._id)}
					>
						<Table.Cell class="py-2.5 pl-5">
							<span class="flex items-center gap-3">
								<span
									class="relative rounded-full {student.engagement === 'live'
										? 'motion-safe:animate-live-breathe'
										: ''}"
									><StudentAvatar name={student.name} imageUrl={student.imageUrl} size="sm" />
									{#if pulse}{#key pulse}<span
												class="absolute inset-0 rounded-full motion-safe:animate-live-flash"
											></span>{/key}{/if}</span
								>
								<span class="min-w-0"
									><span class="block font-medium">{student.name}</span><span
										class="block max-w-56 truncate text-xs text-muted-foreground"
										>{student.email ?? student.username ?? 'Student'}</span
									></span
								>{#if student.role}<Badge size="xs" class="capitalize">{student.role}</Badge>{/if}
							</span>
						</Table.Cell>
						<Table.Cell>
							<span class="flex items-center gap-2 text-xs whitespace-nowrap">
								{#if student.engagement === 'live'}<LiveDot />{:else}<span
										class="inline-block size-2 rounded-full {meta.dot}"
									></span>{/if}{meta.label}
							</span>
						</Table.Cell>
						<Table.Cell class="max-w-48">
							{#if module}
								<button
									type="button"
									class="block max-w-full truncate text-left hover:text-primary-ink hover:underline"
									onclick={(event) => {
										event.stopPropagation();
										onModule(module.moduleId);
									}}>{module.emoji ?? '📚'} {module.title}</button
								>
							{:else}<span class="text-muted-foreground">—</span>{/if}
						</Table.Cell>
						<Table.Cell class="text-right tabular-nums">{student.weekTries || '—'}</Table.Cell>
						<Table.Cell class="text-right text-muted-foreground tabular-nums"
							>{student.statsAvailable ? student.questionsInteracted : '—'}</Table.Cell
						>
						<Table.Cell class="text-right">
							{#if student.streak >= 2}<span
									class="inline-flex items-center gap-0.5 text-xs font-medium text-warning-ink tabular-nums"
									><Flame size={13} />{student.streak}d</span
								>{:else}<span class="text-muted-foreground">—</span>{/if}
						</Table.Cell>
						<Table.Cell class="text-xs whitespace-nowrap text-muted-foreground"
							>{relativeTime(student.lastActivityAt, dashboard.now)}</Table.Cell
						>
						<Table.Cell class="pr-4">
							<Button
								variant="ghost"
								tone="neutral"
								size="xs"
								shape="circle"
								aria-label="View progress for {student.name}"
								onclick={(event) => {
									event.stopPropagation();
									onStudent(student._id);
								}}><ChevronRight size={15} /></Button
							>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</Card.Root>
