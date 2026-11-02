<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { Id } from '../../../convex/_generated/dataModel';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { SegmentedControl } from '#lib/components/ui/segmented-control/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import type { ModuleWindow, ProgressDashboard } from './dashboard.svelte';
	import ModuleRow from './ModuleRow.svelte';
	import { relativeTime } from './utils';

	let {
		dashboard,
		onOpen,
		onStudent,
		onAll
	}: {
		dashboard: ProgressDashboard;
		onOpen: (moduleId: Id<'module'>) => void;
		onStudent: (id: Id<'users'>) => void;
		onAll: () => void;
	} = $props();

	const windows: { value: ModuleWindow; label: string }[] = [
		{ value: 'now', label: 'Now' },
		{ value: 'today', label: 'Today' },
		{ value: 'week', label: '7 days' }
	];
	const active = $derived(
		Object.fromEntries(
			windows.map((w) => [w.value, dashboard.modules.filter((m) => m.counts[w.value] > 0).length])
		) as Record<ModuleWindow, number>
	);
	let choice = $state<ModuleWindow | null>(null);
	// Until someone picks, follow the action: now if anyone is studying, else today, else the week.
	const window = $derived<ModuleWindow>(
		choice ?? (active.now ? 'now' : active.today ? 'today' : 'week')
	);
	let expanded = $state(false);
	const ranked = $derived(
		dashboard.modules
			.filter((m) => m.counts[window] > 0)
			.sort(
				(a, b) =>
					b.counts[window] - a.counts[window] || (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0)
			)
	);
	const shown = $derived(expanded ? ranked : ranked.slice(0, 7));
	const latest = $derived(
		[...dashboard.modules].sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0))[0]
	);
	const people = (moduleId: string) =>
		(dashboard.liveByModule.get(moduleId) ?? [])
			.map((id) => dashboard.studentsById.get(id))
			.filter((s) => s !== undefined);
</script>

<Card.Root class="gap-0 overflow-hidden py-0">
	<header class="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
		<h2 class="text-base font-semibold">Modules</h2>
		<div class="flex items-center gap-2">
			<SegmentedControl
				value={window}
				onValueChange={(value) => {
					choice = value as ModuleWindow;
					expanded = false;
				}}
				options={windows}
				size="xs"
				track="muted"
				activeVariant="raised"
				aria-label="Time window"
			>
				{#snippet item(option, selected)}
					{option.label}<span class="tabular-nums {selected ? 'opacity-60' : 'opacity-45'}"
						>{active[option.value as ModuleWindow]}</span
					>
				{/snippet}
			</SegmentedControl>
			<Button variant="ghost" tone="neutral" size="xs" class="gap-0.5" onclick={onAll}
				>All <ChevronRight size={13} /></Button
			>
		</div>
	</header>
	{#if !dashboard.curriculum}
		<div class="space-y-2 px-5 pb-5">
			{#each [1, 2, 3, 4] as row (row)}<Skeleton class="h-14" />{/each}
		</div>
	{:else if !ranked.length}
		<div class="border-t border-muted px-5 py-10 text-center text-sm text-muted-foreground">
			{window === 'now' ? 'Nobody is in a module right now.' : 'No module activity yet.'}
			{#if latest?.lastActivityAt}
				<Button
					variant="link"
					size="sm"
					class="mt-1 h-auto p-0"
					onclick={() => onOpen(latest.moduleId)}
					>Last answer {relativeTime(latest.lastActivityAt, dashboard.now).toLowerCase()} in {latest.emoji ??
						''}
					{latest.title}</Button
				>
			{/if}
		</div>
	{:else}
		<div class="divide-y divide-muted border-t border-muted">
			{#each shown as module (module.moduleId)}
				<ModuleRow
					{module}
					{window}
					cohortSize={dashboard.students.length}
					livePeople={people(module.moduleId)}
					pulse={dashboard.pulses.get(module.moduleId)}
					now={dashboard.now}
					{onOpen}
					{onStudent}
				/>
			{/each}
		</div>
		{#if ranked.length > shown.length || expanded}
			<div class="border-t border-muted px-5 py-2">
				<Button variant="ghost" tone="neutral" size="xs" onclick={() => (expanded = !expanded)}
					>{expanded ? 'Show fewer' : `Show ${ranked.length - shown.length} more`}</Button
				>
			</div>
		{/if}
	{/if}
</Card.Root>
