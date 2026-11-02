<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { flip } from 'svelte/animate';
	import { fly, scale } from 'svelte/transition';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { SegmentedControl } from '#lib/components/ui/segmented-control/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { indexBy } from './aggregate';
	import type { ProgressDashboard } from './dashboard.svelte';
	import {
		buildRuns,
		isStruggling,
		minuteBuckets,
		moduleHeat,
		questionHeat,
		summarize,
		type Check
	} from './liveStream';
	import StudentAvatar from './StudentAvatar.svelte';
	import { HOUR_MS, relativeTime, startOfLocalDay } from './utils';
	import { LIVE_MS } from './viz';
	import LiveDot from './viz/LiveDot.svelte';
	import LiveNumber from './viz/LiveNumber.svelte';
	import PulseAvatars from './viz/PulseAvatars.svelte';

	// Every answer as it is checked: a per-minute result stream, each student's run of
	// right and wrong answers, and the questions and modules the cohort is on right now.
	let {
		dashboard,
		onOpen,
		onStudent
	}: {
		dashboard: ProgressDashboard;
		onOpen: (moduleId: Id<'module'>) => void;
		onStudent: (id: Id<'users'>) => void;
	} = $props();

	const recent = useQuery(
		api.liveResults.getRecentChecks,
		() => {
			const cohortId = dashboard.cohortId();
			return cohortId ? { cohortId, since: dashboard.hourStart - HOUR_MS } : 'skip';
		},
		{ keepPreviousData: true }
	);
	let span = $state<'15' | '60'>('60');
	const minutes = $derived(Number(span));
	const now = $derived(dashboard.now);
	const checks = $derived(
		(recent.data?.checks ?? []).filter((c) => c.checkedAt >= now - minutes * 60_000)
	);
	const stats = $derived(summarize(checks));
	const buckets = $derived(minuteBuckets(checks, now, minutes));
	const peak = $derived(Math.max(1, ...buckets.map((b) => b.correct + b.incorrect)));
	const runs = $derived(buildRuns(checks).slice(0, 40));
	const questions = $derived(questionHeat(checks, recent.data?.questions ?? []).slice(0, 8));
	const modules = $derived(moduleHeat(checks).slice(0, 6));
	const questionsById = $derived(indexBy(recent.data?.questions ?? [], (q) => q.questionId));
	const answeringNow = $derived(
		summarize(checks.filter((c) => now - c.checkedAt <= LIVE_MS))
			.students.map((id) => dashboard.studentsById.get(id))
			.filter((s) => s !== undefined)
	);
	const tests = $derived(
		(dashboard.live?.sessions ?? []).filter(
			(s) => s.kind !== 'practice' && s.at >= startOfLocalDay(now)
		)
	);

	let hoveredMinute = $state<number | null>(null);
	let hoveredCheck = $state<Check | null>(null);
	const clock = (at: number) =>
		new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
	const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
	const pip = (check: Check) =>
		check.isCorrect ? (check.firstTry ? 'bg-success' : 'bg-success/45') : 'bg-error/75';
	const moduleLabel = (moduleId: string) => {
		const module = dashboard.modulesById.get(moduleId);
		return module ? `${module.emoji ?? '📚'} ${module.title}` : 'Module';
	};
</script>

{#if recent.error}
	<Alert.Root tone="error" role="alert">
		<Alert.Description>Live results could not load. {recent.error.message}</Alert.Description>
	</Alert.Root>
{:else}
	<section class="surface p-4 sm:p-5" aria-label="Results right now">
		<div class="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
			<dl class="flex flex-wrap items-end gap-x-8 gap-y-3">
				<div>
					<dt class="label-caps">Answers</dt>
					<dd class="text-4xl leading-tight font-semibold">
						<LiveNumber value={stats.answers} />
					</dd>
				</div>
				<div>
					<dt class="label-caps">Correct</dt>
					<dd class="text-2xl font-semibold tabular-nums">
						{stats.accuracy ?? '—'}{#if stats.accuracy !== null}<span
								class="text-base text-muted-foreground">%</span
							>{/if}
					</dd>
				</div>
				<div>
					<dt class="label-caps">First try</dt>
					<dd class="text-2xl font-semibold tabular-nums">
						{stats.firstTryRate ?? '—'}{#if stats.firstTryRate !== null}<span
								class="text-base text-muted-foreground">%</span
							>{/if}
					</dd>
				</div>
				<div>
					<dt class="label-caps">Students</dt>
					<dd class="flex items-center gap-3 text-2xl font-semibold">
						<LiveNumber value={stats.students.length} />
						<PulseAvatars people={answeringNow} max={6} {onStudent} />
					</dd>
				</div>
			</dl>
			<SegmentedControl
				bind:value={span}
				options={[
					{ value: '15', label: '15 min' },
					{ value: '60', label: '60 min' }
				]}
				size="xs"
				track="muted"
				activeVariant="raised"
				aria-label="Time window"
			/>
		</div>

		<p class="mt-4 min-h-5 text-sm text-muted-foreground" aria-live="polite">
			{#if hoveredMinute !== null}
				{@const b = buckets[hoveredMinute]}
				<span class="font-semibold text-foreground">{clock(b.at)}</span> ·
				<span class="text-foreground tabular-nums">{b.correct + b.incorrect}</span> answers ·
				<span class="text-success-ink tabular-nums">{b.correct}</span> correct ·
				<span class="text-error-ink tabular-nums">{b.incorrect}</span> wrong
			{:else if dashboard.lastAnswerAt}
				Last answer {relativeTime(dashboard.lastAnswerAt, now).toLowerCase()}
			{/if}
		</p>
		{#if !recent.data}
			<Skeleton class="mt-2 h-24" />
		{:else}
			<div
				class="mt-2 flex h-24 items-end gap-px"
				role="img"
				aria-label="Correct and wrong answers per minute, last {minutes} minutes"
				onmouseleave={() => (hoveredMinute = null)}
			>
				{#each buckets as bucket, i (bucket.at)}
					{@const total = bucket.correct + bucket.incorrect}
					<span
						class="flex h-full min-w-0 flex-1 flex-col justify-end rounded-[3px] {hoveredMinute ===
						i
							? 'bg-muted'
							: ''}"
						role="presentation"
						onmouseenter={() => (hoveredMinute = i)}
					>
						{#if total}
							<span
								class="w-full rounded-t-[3px] bg-error/70 transition-[height] duration-500"
								style="height: {(bucket.incorrect / peak) * 100}%"
							></span>
							<span
								class="w-full bg-success transition-[height] duration-500 {bucket.incorrect
									? ''
									: 'rounded-t-[3px]'} {i === buckets.length - 1
									? 'motion-safe:animate-live-breathe'
									: ''}"
								style="height: {(bucket.correct / peak) * 100}%"
							></span>
						{:else}
							<span class="h-0.5 w-full rounded-full bg-muted-strong"></span>
						{/if}
					</span>
				{/each}
			</div>
			<div class="mt-1 flex justify-between text-[10px] text-muted-foreground">
				<span>{minutes} min ago</span><span>Now</span>
			</div>
		{/if}
	</section>

	<div class="mt-4 grid gap-4 lg:grid-cols-3">
		<Card.Root class="gap-0 overflow-hidden py-0 lg:col-span-2">
			<header class="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
				<h2 class="text-base font-semibold">Answers</h2>
				<span class="flex items-center gap-3 text-[11px] text-muted-foreground">
					<span class="flex items-center gap-1.5"
						><span class="size-2.5 rounded-[3px] bg-success"></span>First try</span
					>
					<span class="flex items-center gap-1.5"
						><span class="size-2.5 rounded-[3px] bg-success/45"></span>Correct</span
					>
					<span class="flex items-center gap-1.5"
						><span class="size-2.5 rounded-[3px] bg-error/75"></span>Wrong</span
					>
				</span>
			</header>
			<p class="min-h-9 border-t border-muted px-5 py-2 text-xs text-muted-foreground">
				{#if hoveredCheck}
					{@const question = questionsById.get(hoveredCheck.questionId)}
					<span class="font-medium {hoveredCheck.isCorrect ? 'text-success-ink' : 'text-error-ink'}"
						>{hoveredCheck.isCorrect
							? hoveredCheck.firstTry
								? 'First try'
								: 'Correct'
							: 'Wrong'}</span
					>
					· {clock(hoveredCheck.checkedAt)}
					{#if question}· <span class="font-mono">Q{question.order + 1}</span>
						<span class="text-foreground">{question.stem}</span>{/if}
				{/if}
			</p>
			{#if !recent.data || !dashboard.ready}
				<div class="space-y-2 px-5 pb-5">
					{#each [1, 2, 3, 4, 5] as row (row)}<Skeleton class="h-12" />{/each}
				</div>
			{:else if !runs.length}
				<Empty.Root class="border-t border-muted py-14">
					<Empty.Description>No answers in the last {minutes} minutes.</Empty.Description>
				</Empty.Root>
			{:else}
				<ul
					class="divide-y divide-muted border-t border-muted"
					onmouseleave={() => (hoveredCheck = null)}
				>
					{#each runs as run (run.key)}
						{@const student = dashboard.studentsById.get(run.userId)}
						{@const live = now - run.lastAt <= LIVE_MS}
						{@const shown = run.checks.slice(-32)}
						<li
							class="relative grid grid-cols-[2.25rem_minmax(0,1fr)_4rem] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[2.25rem_minmax(0,14rem)_minmax(0,1fr)_4rem] sm:px-5"
							in:fly={{ y: -8, duration: 300 }}
							animate:flip={{ duration: 300 }}
						>
							{#if live}<span class="absolute inset-y-2 left-0 w-0.5 rounded-full bg-success"
								></span>{/if}
							<button
								type="button"
								class="rounded-full {live ? 'motion-safe:animate-live-breathe' : ''}"
								aria-label="Open {student?.name ?? 'student'}"
								onclick={() => onStudent(run.userId)}
							>
								<StudentAvatar
									name={student?.name ?? 'Student'}
									imageUrl={student?.imageUrl}
									size="sm"
								/>
							</button>
							<span class="min-w-0">
								<button
									type="button"
									class="block max-w-full truncate text-left text-sm font-semibold hover:underline"
									onclick={() => onStudent(run.userId)}>{student?.name ?? 'A student'}</button
								>
								<span class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
									<button
										type="button"
										class="min-w-0 truncate hover:text-primary-ink hover:underline"
										onclick={() => onOpen(run.moduleId)}>{moduleLabel(run.moduleId)}</button
									>
									<span aria-hidden="true">·</span>
									<time
										class="shrink-0 {live ? 'font-medium text-success-ink' : ''}"
										datetime={new Date(run.lastAt).toISOString()}
										>{relativeTime(run.lastAt, now)}</time
									>
								</span>
							</span>
							<span
								class="col-span-3 col-start-1 flex flex-wrap gap-[3px] sm:col-span-1 sm:col-start-auto"
								role="list"
								aria-label="{run.correct} of {run.checks.length} correct"
							>
								{#each shown as check (check._id)}
									<span
										class="size-3.5 rounded-[3px] transition-transform hover:scale-125 {pip(check)}"
										role="listitem"
										aria-label={check.isCorrect ? 'Correct' : 'Wrong'}
										in:scale={{ start: 0.2, duration: 350 }}
										onmouseenter={() => (hoveredCheck = check)}
									></span>
								{/each}
							</span>
							<span class="col-start-3 row-start-1 text-right sm:col-start-auto sm:row-start-auto">
								<span class="block text-sm font-semibold tabular-nums"
									>{run.correct}/{run.checks.length}</span
								>
								<span
									class="text-[11px] tabular-nums {pct(run.correct, run.checks.length) >= 70
										? 'text-success-ink'
										: pct(run.correct, run.checks.length) < 50
											? 'text-error-ink'
											: 'text-muted-foreground'}">{pct(run.correct, run.checks.length)}%</span
								>
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Root>

		<div class="space-y-4">
			<Card.Root class="gap-0 overflow-hidden py-0">
				<h2 class="px-5 pt-4 pb-3 text-base font-semibold">Questions</h2>
				{#if !recent.data}
					<Skeleton class="m-5 mt-0 h-40" />
				{:else}
					{#each questions as entry (entry.question.questionId)}
						{@const struggling = isStruggling(entry)}
						<button
							type="button"
							class="block w-full border-t border-muted px-5 py-3 text-left hover:bg-muted/60"
							onclick={() => onOpen(entry.question.moduleId)}
						>
							<span class="flex items-start gap-2">
								<span class="min-w-0 flex-1 text-sm">
									<span class="line-clamp-2"
										><span class="font-mono text-xs text-muted-foreground"
											>Q{entry.question.order + 1}</span
										>
										{entry.question.stem}</span
									>
									<span class="mt-0.5 block truncate text-[11px] text-muted-foreground"
										>{moduleLabel(entry.question.moduleId)}</span
									>
								</span>
								{#if struggling}<Badge variant="soft" tone="error" size="xs" class="shrink-0"
										>Missed</Badge
									>{/if}
							</span>
							<span class="mt-2 flex items-center gap-2">
								<span class="flex h-1.5 flex-1 overflow-hidden rounded-full bg-error/60">
									<span
										class="h-full bg-success transition-[width] duration-700"
										style="width: {pct(entry.correct, entry.answers)}%"
									></span>
								</span>
								<span class="w-24 text-right text-[11px] text-muted-foreground tabular-nums"
									>{pct(entry.correct, entry.answers)}% · {entry.students}
									{entry.students === 1 ? 'student' : 'students'}</span
								>
							</span>
						</button>
					{:else}
						<p class="border-t border-muted px-5 py-8 text-center text-sm text-muted-foreground">
							No answers yet.
						</p>
					{/each}
				{/if}
			</Card.Root>

			<Card.Root class="gap-0 overflow-hidden py-0">
				<h2 class="px-5 pt-4 pb-3 text-base font-semibold">Modules</h2>
				{#each modules as entry (entry.moduleId)}
					{@const here = dashboard.liveByModule.get(entry.moduleId)?.length ?? 0}
					<button
						type="button"
						class="flex w-full items-center gap-3 border-t border-muted px-5 py-2.5 text-left hover:bg-muted/60"
						onclick={() => onOpen(entry.moduleId as Id<'module'>)}
					>
						<span class="min-w-0 flex-1 truncate text-sm">{moduleLabel(entry.moduleId)}</span>
						{#if here}<span class="flex items-center gap-1.5 text-xs text-success-ink tabular-nums"
								><LiveDot />{here}</span
							>{/if}
						<span class="w-20 text-right text-xs tabular-nums"
							><span class="font-semibold">{entry.answers}</span>
							<span class="text-muted-foreground">· {pct(entry.correct, entry.answers)}%</span
							></span
						>
					</button>
				{:else}
					<p class="border-t border-muted px-5 py-8 text-center text-sm text-muted-foreground">
						No answers yet.
					</p>
				{/each}
			</Card.Root>

			{#if tests.length}
				<Card.Root class="gap-0 overflow-hidden py-0">
					<h2 class="px-5 pt-4 pb-3 text-base font-semibold">Practice tests today</h2>
					{#each tests.slice(0, 6) as test (`${test.userId}:${test.startedAt}`)}
						{@const student = dashboard.studentsById.get(test.userId)}
						<button
							type="button"
							class="flex w-full items-center gap-3 border-t border-muted px-5 py-2.5 text-left hover:bg-muted/60"
							onclick={() => onStudent(test.userId)}
						>
							<StudentAvatar
								name={student?.name ?? 'Student'}
								imageUrl={student?.imageUrl}
								size="xs"
							/>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm font-medium"
									>{student?.name ?? 'A student'}</span
								>
								<span class="block truncate text-[11px] text-muted-foreground"
									>{test.count} questions · {test.className} · {relativeTime(test.at, now)}</span
								>
							</span>
							{#if test.scorePct !== null}
								<Badge
									tone={test.scorePct >= 80 ? 'success' : test.scorePct >= 60 ? 'warning' : 'error'}
									size="sm"
									class="tabular-nums">{test.scorePct}%</Badge
								>
							{:else}
								<Badge variant="soft" tone="neutral" size="sm">In progress</Badge>
							{/if}
						</button>
					{/each}
				</Card.Root>
			{/if}
		</div>
	</div>
	{#if recent.data?.truncated}
		<p class="mt-3 px-1 text-xs text-muted-foreground">
			Showing the most recent {recent.data.checks.length} answers.
		</p>
	{/if}
{/if}
