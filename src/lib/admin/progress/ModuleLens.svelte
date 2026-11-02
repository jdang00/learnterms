<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import Flag from '@lucide/svelte/icons/flag';
	import { resolve } from '$app/paths';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { SegmentedControl } from '#lib/components/ui/segmented-control/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import type { ProgressDashboard } from './dashboard.svelte';
	import ModuleQuestions from './ModuleQuestions.svelte';
	import StudentAvatar from './StudentAvatar.svelte';
	import { relativeTime, startOfLocalDay } from './utils';
	import { LIVE_MS, plural, recencyFor, recencyMeta } from './viz';
	import LiveDot from './viz/LiveDot.svelte';
	import LiveNumber from './viz/LiveNumber.svelte';
	import PulseAvatars from './viz/PulseAvatars.svelte';
	import ReachBar from './viz/ReachBar.svelte';
	import Sparkline from './viz/Sparkline.svelte';

	// The night-before view of one module: who is in it now, who has studied it, who hasn't.
	let {
		dashboard,
		moduleId,
		onClose,
		onOpen,
		onStudent
	}: {
		dashboard: ProgressDashboard;
		moduleId: Id<'module'> | null;
		onClose: () => void;
		onOpen: (moduleId: Id<'module'>) => void;
		onStudent: (id: Id<'users'>) => void;
	} = $props();

	const cohortId = $derived(dashboard.cohortId());
	const roster = useQuery(
		api.moduleActivity.getModuleRoster,
		() => (cohortId && moduleId ? { cohortId, moduleId } : 'skip'),
		{ keepPreviousData: true }
	);
	const data = $derived(roster.data?.module._id === moduleId ? roster.data : undefined);
	const summary = $derived(moduleId ? dashboard.modulesById.get(moduleId) : undefined);
	const siblings = $derived(
		summary
			? dashboard.modules
					.filter((m) => m.classId === summary.classId)
					.sort((a, b) => a.order - b.order)
			: []
	);
	const position = $derived(siblings.findIndex((m) => m.moduleId === moduleId));
	let tab = $state<'students' | 'questions'>('students');
	let group = $state<'studied' | 'notYet'>('studied');

	const now = $derived(dashboard.now);
	const people = $derived.by(() => {
		const rows = new Map((data?.rows ?? []).map((row) => [row.userId as string, row]));
		const studied = [];
		const notYet = [];
		for (const student of dashboard.students) {
			const row = rows.get(student._id);
			if (row && row.questionsInteracted > 0) studied.push({ student, row });
			else notYet.push(student);
		}
		studied.sort((a, b) => (b.row.lastActivityAt ?? 0) - (a.row.lastActivityAt ?? 0));
		notYet.sort(
			(a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0) || a.name.localeCompare(b.name)
		);
		return { studied, notYet };
	});
	const hereNow = $derived(
		people.studied.filter((p) => p.row.lastActivityAt && now - p.row.lastActivityAt <= LIVE_MS)
	);
	const today = $derived(
		people.studied.filter((p) => (p.row.lastActivityAt ?? 0) >= startOfLocalDay(now)).length
	);
	const total = $derived(data?.module.totalQuestions ?? summary?.totalQuestions ?? 0);
	const flags = $derived((data?.rows ?? []).reduce((sum, row) => sum + row.questionsFlagged, 0));
	const cohortSize = $derived(dashboard.students.length);
	const lastModuleTitle = (userId: string) => {
		const row = dashboard.lastModuleByUser.get(userId);
		const module = row ? dashboard.modulesById.get(row.moduleId) : undefined;
		return module ? `${module.emoji ?? ''} ${module.title}`.trim() : null;
	};
</script>

<Sheet.Root open={moduleId !== null} onOpenChange={(open) => !open && onClose()}>
	<Sheet.Content
		side="right"
		class="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
		aria-describedby={undefined}
	>
		{#if moduleId}
			<header class="border-b border-muted px-5 pt-5 pb-4">
				<div class="flex items-start gap-3 pr-10">
					<span
						class="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-muted text-2xl"
					>
						{data?.module.emoji ?? summary?.emoji ?? '📚'}
						{#if dashboard.pulses.get(moduleId)}{#key dashboard.pulses.get(moduleId)}<span
									class="absolute inset-0 rounded-2xl motion-safe:animate-live-flash"
									aria-hidden="true"
								></span>{/key}{/if}
					</span>
					<div class="min-w-0 flex-1">
						<Sheet.Title class="text-lg leading-snug font-semibold"
							>{data?.module.title ?? summary?.title ?? 'Module'}</Sheet.Title
						>
						<p class="text-xs text-muted-foreground">
							{data?.module.className ?? summary?.className}{total
								? ` · ${plural(total, 'question')}`
								: ''}
						</p>
					</div>
				</div>
				<div class="mt-3 flex flex-wrap items-center gap-2">
					{#if siblings.length > 1}
						<span class="flex">
							<Button
								variant="soft"
								tone="neutral"
								size="xs"
								shape="segment-start"
								aria-label="Previous module"
								disabled={position <= 0}
								onclick={() => onOpen(siblings[position - 1].moduleId)}
								><ChevronUp size={14} /></Button
							>
							<Button
								variant="soft"
								tone="neutral"
								size="xs"
								shape="segment-end"
								aria-label="Next module"
								disabled={position < 0 || position >= siblings.length - 1}
								onclick={() => onOpen(siblings[position + 1].moduleId)}
								><ChevronDown size={14} /></Button
							>
						</span>
						<span class="text-xs text-muted-foreground tabular-nums"
							>{position + 1} of {siblings.length}</span
						>
					{/if}
					{#if data}
						<Button
							href={resolve('/admin/[classId]/module/[moduleId]', {
								classId: String(data.module.classId),
								moduleId: String(moduleId)
							})}
							variant="ghost"
							tone="neutral"
							size="xs"
							class="ml-auto gap-1">Manage <ArrowUpRight size={13} /></Button
						>
					{/if}
				</div>
			</header>

			<div class="min-h-0 flex-1 overflow-y-auto">
				{#if roster.error}
					<Alert.Root tone="error" role="alert" class="m-5">
						<Alert.Description>This module could not load. {roster.error.message}</Alert.Description
						>
					</Alert.Root>
				{:else if !data}
					<div class="space-y-3 p-5">
						<Skeleton class="h-20" />
						{#each [1, 2, 3, 4, 5] as row (row)}<Skeleton class="h-11" />{/each}
					</div>
				{:else}
					<section class="space-y-4 px-5 pt-4" aria-label="Module activity">
						<div
							class="flex items-center gap-3 rounded-xl px-3 py-2.5 {hereNow.length
								? 'bg-success/10'
								: 'bg-muted'}"
						>
							<LiveDot active={hereNow.length > 0} />
							<span class="min-w-0 flex-1 text-sm">
								{#if hereNow.length}
									<span class="font-semibold text-success-ink">{hereNow.length} studying now</span>
								{:else if people.studied[0]?.row.lastActivityAt}
									Last answer {relativeTime(
										people.studied[0].row.lastActivityAt,
										now
									).toLowerCase()}
								{:else}
									Nobody has studied this yet
								{/if}
							</span>
							<PulseAvatars people={hereNow.map((p) => p.student)} max={6} {onStudent} />
						</div>

						<dl class="grid grid-cols-4 gap-2">
							{#each [{ label: 'Studied', value: people.studied.length, of: cohortSize }, { label: 'Today', value: today }, { label: '7 days', value: summary?.counts.week ?? 0 }, { label: 'Flags', value: flags }] as stat (stat.label)}
								<div class="rounded-xl bg-muted/70 px-3 py-2">
									<dt class="label-caps">{stat.label}</dt>
									<dd class="mt-0.5 text-lg font-semibold">
										<LiveNumber value={stat.value} />{#if stat.of !== undefined}<span
												class="text-sm font-normal text-muted-foreground">/{stat.of}</span
											>{/if}
									</dd>
								</div>
							{/each}
						</dl>
						<ReachBar
							reach={people.studied.length}
							inWindow={today}
							total={cohortSize}
							live={hereNow.length > 0}
						/>
						{#if summary}
							<div>
								<Sparkline
									values={summary.daily}
									live={hereNow.length > 0}
									class="h-14 w-full"
									label="First attempts per day, last {summary.daily.length} days"
								/>
								<div class="mt-1 flex justify-between text-[10px] text-muted-foreground">
									<span>{summary.daily.length} days ago</span><span>Today</span>
								</div>
							</div>
						{/if}
					</section>

					<Tabs.Root bind:value={tab} class="mt-4">
						<Tabs.List class="mx-5" aria-label="Module detail">
							<Tabs.Trigger value="students">Students</Tabs.Trigger>
							<Tabs.Trigger value="questions">Questions</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="students" class="px-5 pt-3 pb-8">
							<SegmentedControl
								bind:value={group}
								options={[
									{ value: 'studied', label: 'Studied' },
									{ value: 'notYet', label: 'Not yet' }
								]}
								size="xs"
								track="none"
								aria-label="Students"
								itemClass="data-[state=unchecked]:bg-muted"
							>
								{#snippet item(option)}
									{option.label}<span class="tabular-nums opacity-60"
										>{option.value === 'studied'
											? people.studied.length
											: people.notYet.length}</span
									>
								{/snippet}
							</SegmentedControl>
							<ul class="mt-2 -mx-2">
								{#if group === 'studied'}
									{#each people.studied as { student, row } (student._id)}
										{@const recency = recencyFor(row.lastActivityAt, now)}
										{@const covered = total
											? Math.min(100, (row.questionsInteracted / total) * 100)
											: 0}
										<li>
											<button
												type="button"
												class="grid w-full grid-cols-[2.25rem_minmax(0,1fr)_6rem_5.5rem] items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted"
												onclick={() => onStudent(student._id)}
											>
												<span
													class="relative rounded-full {recency === 'now'
														? 'motion-safe:animate-live-breathe'
														: ''}"
												>
													<StudentAvatar
														name={student.name}
														imageUrl={student.imageUrl}
														size="sm"
													/>
													{#if dashboard.pulses.get(`${student._id}:${moduleId}`)}{#key dashboard.pulses.get(`${student._id}:${moduleId}`)}<span
																class="absolute inset-0 rounded-full motion-safe:animate-live-flash"
															></span>{/key}{/if}
												</span>
												<span class="min-w-0">
													<span class="block truncate text-sm font-medium">{student.name}</span>
													{#if row.questionsFlagged}<span
															class="flex items-center gap-1 text-[11px] text-warning-ink"
															><Flag size={10} />{row.questionsFlagged} flagged</span
														>{/if}
												</span>
												<span>
													<span
														class="block text-right text-[11px] text-muted-foreground tabular-nums"
														>{row.questionsInteracted}/{total}</span
													>
													<span class="mt-1 block h-1 overflow-hidden rounded-full bg-muted-strong">
														<span
															class="block h-full rounded-full bg-primary transition-[width] duration-700"
															style="width: {covered}%"
														></span>
													</span>
												</span>
												<span
													class="flex items-center justify-end gap-1.5 text-xs whitespace-nowrap {recency ===
													'now'
														? 'font-medium text-success-ink'
														: 'text-muted-foreground'}"
												>
													<span class="size-1.5 rounded-full {recencyMeta[recency].fill}"></span>
													{recency === 'now' ? 'Now' : relativeTime(row.lastActivityAt, now)}
												</span>
											</button>
										</li>
									{:else}
										<li class="px-2 py-10 text-center text-sm text-muted-foreground">
											Nobody has studied this module yet.
										</li>
									{/each}
								{:else}
									{#each people.notYet as student (student._id)}
										{@const elsewhere = lastModuleTitle(student._id)}
										<li>
											<button
												type="button"
												class="grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted"
												onclick={() => onStudent(student._id)}
											>
												<StudentAvatar name={student.name} imageUrl={student.imageUrl} size="sm" />
												<span class="min-w-0">
													<span class="block truncate text-sm font-medium">{student.name}</span>
													{#if elsewhere}<span
															class="block truncate text-[11px] text-muted-foreground"
															>Last in {elsewhere}</span
														>{/if}
												</span>
												<span
													class="text-xs whitespace-nowrap {student.engagement === 'live'
														? 'font-medium text-success-ink'
														: 'text-muted-foreground'}"
													>{student.engagement === 'live'
														? 'Studying now'
														: relativeTime(student.lastActivityAt, now)}</span
												>
											</button>
										</li>
									{:else}
										<li class="px-2 py-10 text-center text-sm text-muted-foreground">
											Everyone in the cohort has studied this module.
										</li>
									{/each}
								{/if}
							</ul>
						</Tabs.Content>
						<Tabs.Content value="questions" class="px-5 pt-3 pb-8">
							{#if cohortId && tab === 'questions'}
								<ModuleQuestions {cohortId} {moduleId} {cohortSize} {now} />
							{/if}
						</Tabs.Content>
					</Tabs.Root>
				{/if}
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
