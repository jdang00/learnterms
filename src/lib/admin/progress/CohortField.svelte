<script lang="ts">
	import type { Id } from '../../../convex/_generated/dataModel';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import type { ProgressDashboard } from './dashboard.svelte';
	import { engagementMeta, relativeTime, type Engagement } from './utils';

	// Every student as one dot, grouped by how recently they studied. Live dots breathe and
	// flash when an answer lands; hovering names the student and where they were.
	let {
		dashboard,
		onStudent,
		onFilter
	}: {
		dashboard: ProgressDashboard;
		onStudent: (id: Id<'users'>) => void;
		onFilter: (engagement: Engagement) => void;
	} = $props();

	const order: Engagement[] = ['live', 'active', 'cooling', 'dormant', 'none'];
	const sorted = $derived(
		[...dashboard.students].sort(
			(a, b) =>
				order.indexOf(a.engagement) - order.indexOf(b.engagement) ||
				(b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0)
		)
	);
	let hoveredId = $state<string | null>(null);
	const hovered = $derived(hoveredId ? dashboard.studentsById.get(hoveredId) : undefined);
	const hoveredModule = $derived(
		hovered?.lastModuleId ? dashboard.modulesById.get(hovered.lastModuleId) : undefined
	);
</script>

<div>
	<p class="min-h-10 text-sm text-muted-foreground" aria-live="polite">
		{#if hovered}
			<span class="block font-semibold text-foreground">{hovered.name}</span>
			{hovered.engagement === 'live'
				? 'Studying now'
				: relativeTime(hovered.lastActivityAt, dashboard.now)}{#if hoveredModule}
				· {hoveredModule.emoji ?? ''} {hoveredModule.title}{/if}
		{:else}
			<span class="block font-semibold text-foreground tabular-nums"
				>{dashboard.engagementCounts.live + dashboard.engagementCounts.active} of {dashboard
					.students.length}</span
			>
			studied in the last 7 days
		{/if}
	</p>
	{#if !dashboard.ready}
		<Skeleton class="mt-3 h-28" />
	{:else}
		<div
			class="mt-3 flex flex-wrap gap-1.5"
			role="group"
			aria-label="Students by activity"
			onmouseleave={() => (hoveredId = null)}
		>
			{#each sorted as student (student._id)}
				{@const pulse = dashboard.pulses.get(student._id)}
				<button
					type="button"
					class="relative size-4 rounded-full transition-transform hover:scale-125 focus-visible:scale-125 {engagementMeta[
						student.engagement
					].dot} {student.engagement === 'live'
						? 'motion-safe:animate-live-breathe'
						: ''} {student.engagement === 'none' ? 'opacity-35' : ''}"
					aria-label="{student.name}: {engagementMeta[student.engagement].label}"
					onmouseenter={() => (hoveredId = student._id)}
					onfocus={() => (hoveredId = student._id)}
					onblur={() => (hoveredId = null)}
					onclick={() => onStudent(student._id)}
				>
					{#if pulse}{#key pulse}<span
								class="absolute inset-0 rounded-full motion-safe:animate-live-flash"
							></span>{/key}{/if}
				</button>
			{/each}
		</div>
		<ul class="mt-4 grid grid-cols-2 gap-x-3 gap-y-0.5">
			{#each order as id (id)}
				<li>
					<button
						type="button"
						class="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs hover:bg-muted"
						onclick={() => onFilter(id)}
					>
						<span class="size-2 rounded-full {engagementMeta[id].dot}"></span>
						<span class="min-w-0 flex-1 truncate">{engagementMeta[id].label}</span>
						<span class="font-semibold tabular-nums">{dashboard.engagementCounts[id]}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
