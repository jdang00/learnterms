<script lang="ts">
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { SegmentedControl } from '#lib/components/ui/segmented-control/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Tip } from '#lib/components/ui/tooltip/index.js';
	import { gridCells } from './aggregate';
	import type { ModuleSummary, ProgressDashboard } from './dashboard.svelte';
	import StudentAvatar from './StudentAvatar.svelte';
	import { relativeTime } from './utils';
	import { rampFills, recencyFor, recencyMeta, recencyOrder } from './viz';

	// Student × module grid for one class. Rows come from a snapshot refreshed each minute,
	// with the live week of study rows layered on top so cells light up as answers land.
	let {
		dashboard,
		classId,
		modules,
		onOpen,
		onStudent
	}: {
		dashboard: ProgressDashboard;
		classId: Id<'class'>;
		modules: ModuleSummary[];
		onOpen: (moduleId: Id<'module'>) => void;
		onStudent: (id: Id<'users'>) => void;
	} = $props();

	type Grid = FunctionReturnType<typeof api.moduleActivity.getClassModuleGrid>;
	let snapshot = $state<{ classId: string; data: Grid } | null>(null);
	let colorBy = $state<'recency' | 'coverage'>('recency');
	let scope = $state<'studied' | 'all'>('studied');
	let hovered = $state<{ userId: string; moduleId: string } | null>(null);

	$effect(() => {
		const cohortId = dashboard.cohortId();
		if (!cohortId) return;
		const target = classId;
		let cancelled = false;
		const load = () => {
			if (document.hidden) return;
			dashboard.client
				.query(api.moduleActivity.getClassModuleGrid, { cohortId, classId: target })
				.then((data) => {
					if (!cancelled) snapshot = { classId: target, data };
				})
				.catch(() => {});
		};
		load();
		const timer = setInterval(load, 60_000);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	});

	const loaded = $derived(snapshot?.classId === classId ? snapshot.data : null);
	const cells = $derived(gridCells(loaded?.rows ?? [], dashboard.studyRows.values(), classId));
	const rows = $derived.by(() => {
		const withLast = dashboard.students.map((student) => {
			let last = 0;
			let studied = 0;
			for (const module of modules) {
				const cell = cells.get(`${student._id}:${module.moduleId}`);
				if (!cell) continue;
				studied++;
				last = Math.max(last, cell.at ?? 0);
			}
			return { student, last, studied };
		});
		return withLast
			.filter((row) => scope === 'all' || row.studied > 0)
			.sort((a, b) => b.last - a.last || a.student.name.localeCompare(b.student.name));
	});
	const studiedCount = $derived(rows.filter((row) => row.studied > 0).length);

	function fill(userId: string, module: ModuleSummary) {
		const cell = cells.get(`${userId}:${module.moduleId}`);
		if (colorBy === 'recency') return recencyMeta[recencyFor(cell?.at, dashboard.now)].fill;
		if (!cell?.interacted || !module.totalQuestions) return rampFills[0];
		const pct = cell.interacted / module.totalQuestions;
		return rampFills[Math.min(4, Math.max(1, Math.ceil(pct * 4)))];
	}

	const readout = $derived.by(() => {
		if (!hovered) return null;
		const student = dashboard.studentsById.get(hovered.userId);
		const module = modules.find((m) => m.moduleId === hovered!.moduleId);
		if (!student || !module) return null;
		const cell = cells.get(`${hovered.userId}:${hovered.moduleId}`);
		return { student, module, cell };
	});
</script>

<div>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="min-h-5 text-sm text-muted-foreground" aria-live="polite">
			{#if readout}
				<span class="font-semibold text-foreground">{readout.student.name}</span>
				in {readout.module.emoji ?? ''}
				{readout.module.title}:
				{#if readout.cell}
					<span class="text-foreground tabular-nums"
						>{readout.cell.interacted}/{readout.module.totalQuestions}</span
					>
					tried · {relativeTime(readout.cell.at, dashboard.now).toLowerCase()}
				{:else}
					not started
				{/if}
			{:else if loaded}
				<span class="font-semibold text-foreground tabular-nums">{studiedCount}</span> of {dashboard
					.students.length} students have studied this class
			{/if}
		</p>
		<div class="flex flex-wrap items-center gap-2">
			<SegmentedControl
				bind:value={scope}
				options={[
					{ value: 'studied', label: 'Studied' },
					{ value: 'all', label: 'Everyone' }
				]}
				size="xs"
				track="muted"
				activeVariant="raised"
				aria-label="Students shown"
			/>
			<SegmentedControl
				bind:value={colorBy}
				options={[
					{ value: 'recency', label: 'Recency' },
					{ value: 'coverage', label: 'Coverage' }
				]}
				size="xs"
				track="muted"
				activeVariant="raised"
				aria-label="Color cells by"
			/>
		</div>
	</div>

	{#if !loaded}
		<Skeleton class="mt-4 h-72" />
	{:else if !modules.length}
		<p class="py-12 text-center text-sm text-muted-foreground">No modules in this class yet.</p>
	{:else}
		<div
			class="mt-3 max-h-[min(70vh,44rem)] overflow-auto rounded-xl"
			role="presentation"
			onmouseleave={() => (hovered = null)}
		>
			<table class="border-separate border-spacing-[3px] text-xs">
				<thead class="sticky top-0 z-20 bg-card">
					<tr>
						<th class="sticky left-0 z-10 min-w-40 bg-card text-left font-normal"
							><span class="sr-only">Student</span></th
						>
						{#each modules as module (module.moduleId)}
							{@const live = (dashboard.liveByModule.get(module.moduleId)?.length ?? 0) > 0}
							<th class="p-0 align-bottom font-normal">
								<Tip label={module.title}>
									{#snippet child({ props })}
										<button
											{...props}
											type="button"
											class="relative flex w-7 flex-col items-center gap-0.5 rounded-md pb-1 hover:bg-muted {hovered?.moduleId ===
											module.moduleId
												? 'bg-muted'
												: ''}"
											aria-label="Open {module.title}"
											onclick={() => onOpen(module.moduleId)}
										>
											<span class="text-base leading-6">{module.emoji ?? '📚'}</span>
											<span
												class="h-3.5 text-[10px] leading-3.5 tabular-nums {live
													? 'font-semibold text-success-ink'
													: 'text-muted-foreground'}">{module.counts.today || ''}</span
											>
											{#if dashboard.pulses.get(module.moduleId)}{#key dashboard.pulses.get(module.moduleId)}<span
														class="absolute inset-0 rounded-md motion-safe:animate-live-flash"
													></span>{/key}{/if}
										</button>
									{/snippet}
								</Tip>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each rows as { student } (student._id)}
						<tr>
							<th class="sticky left-0 z-10 bg-card p-0 text-left font-normal">
								<button
									type="button"
									class="flex w-full items-center gap-2 rounded-md py-0.5 pr-3 text-left hover:bg-muted {hovered?.userId ===
									student._id
										? 'bg-muted'
										: ''}"
									onclick={() => onStudent(student._id)}
								>
									<StudentAvatar name={student.name} imageUrl={student.imageUrl} size="xs" />
									<span class="max-w-36 truncate text-xs">{student.name}</span>
								</button>
							</th>
							{#each modules as module (module.moduleId)}
								{@const pulse = dashboard.pulses.get(`${student._id}:${module.moduleId}`)}
								<td class="p-0">
									<span
										class="relative block size-7 rounded-md transition-colors duration-500 {fill(
											student._id,
											module
										)} {hovered?.userId === student._id && hovered?.moduleId === module.moduleId
											? 'ring-2 ring-foreground/50'
											: ''}"
										role="presentation"
										onmouseenter={() =>
											(hovered = { userId: student._id, moduleId: module.moduleId })}
									>
										{#if pulse}{#key pulse}<span
													class="absolute inset-0 rounded-md motion-safe:animate-live-flash"
												></span>{/key}{/if}
									</span>
								</td>
							{/each}
						</tr>
					{:else}
						<tr>
							<td
								colspan={modules.length + 1}
								class="py-10 text-center text-sm text-muted-foreground"
								>Nobody has studied this class yet.</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
			{#if colorBy === 'recency'}
				{#each recencyOrder as recency (recency)}
					<span class="flex items-center gap-1.5"
						><span class="size-2.5 rounded-[3px] {recencyMeta[recency].fill}"></span>{recencyMeta[
							recency
						].label}</span
					>
				{/each}
			{:else}
				<span class="flex items-center gap-1"
					>None {#each rampFills as rampFill (rampFill)}<span
							class="size-2.5 rounded-[3px] {rampFill}"
						></span>{/each} All questions</span
				>
			{/if}
			<span class="ml-auto">Count under each module: students today</span>
		</div>
	{/if}
</div>
