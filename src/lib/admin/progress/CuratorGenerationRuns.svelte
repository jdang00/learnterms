<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import CircleDollarSign from '@lucide/svelte/icons/circle-dollar-sign';
	import Clock from '@lucide/svelte/icons/clock';
	import Layers from '@lucide/svelte/icons/layers';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import UserRound from '@lucide/svelte/icons/user-round';
	import { resolve } from '$app/paths';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { formatDuration, formatTokens, formatUsd } from '../question-studio/questionStudioRun';
	import { percent } from './utils';
	import { SvelteMap } from 'svelte/reactivity';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';

	let { cohortId }: { cohortId: Id<'cohort'> } = $props();

	const history = useQuery(api.questionStudio.jobs.listCohortGenerationJobs, () => ({
		cohortId,
		limit: 25
	}));

	const summary = $derived(history.data?.summary);
	const runs = $derived(history.data?.runs ?? []);
	const inFlight = $derived(
		runs.filter((run) => run.status === 'running' || run.status === 'queued')
	);
	const finished = $derived(runs.filter((run) => run.status === 'ready'));
	const drafted = $derived(finished.reduce((sum, run) => sum + run.deliveredCount, 0));
	const kept = $derived(finished.reduce((sum, run) => sum + run.savedCount, 0));
	const curators = $derived.by(() => {
		const byName = new SvelteMap<
			string,
			{ name: string; runs: number; kept: number; spend: number }
		>();
		for (const run of runs) {
			const name = run.curatorName ?? 'Unknown';
			const entry = byName.get(name) ?? { name, runs: 0, kept: 0, spend: 0 };
			entry.runs++;
			entry.kept += run.savedCount;
			entry.spend += run.costUsd;
			byName.set(name, entry);
		}
		return [...byName.values()].sort((a, b) => b.kept - a.kept || b.runs - a.runs);
	});

	const day = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
	const statusTone: Record<string, 'success' | 'error' | 'info' | 'neutral'> = {
		ready: 'success',
		failed: 'error',
		running: 'info',
		queued: 'neutral'
	};
</script>

{#if history.error}
	<Alert.Root tone="error">
		<Alert.Description>Failed to load generation runs: {history.error.message}</Alert.Description>
	</Alert.Root>
{:else}
	<div class="space-y-4">
		<section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Question Studio summary">
			{#each [{ label: 'Runs this week', icon: Sparkles, value: String(summary?.runsThisWeek ?? 0), note: summary?.failedThisWeek ? `${summary.failedThisWeek} failed` : 'None failed', tone: summary?.failedThisWeek ? 'text-warning-ink' : '' }, { label: 'Questions kept', icon: Layers, value: String(summary?.savedThisWeek ?? 0), note: drafted ? `${percent(kept, drafted)}% of drafts kept recently` : 'Saved into modules this week', tone: '' }, { label: 'Spend this week', icon: CircleDollarSign, value: formatUsd(summary?.spendThisWeek ?? 0), note: summary?.costPerSavedQuestion ? `${formatUsd(summary.costPerSavedQuestion)} per kept question` : `${formatTokens(summary?.tokensThisWeek ?? 0)} tokens`, tone: '' }, { label: 'Typical run', icon: Clock, value: summary?.medianDurationMs ? formatDuration(summary.medianDurationMs) : '—', note: 'Median start to finish', tone: '' }] as stat (stat.label)}
				<Card.Root class="gap-0 p-4">
					<span class="flex items-center justify-between text-xs text-foreground/60"
						>{stat.label}<stat.icon size={15} class="text-primary" /></span
					>
					{#if history.isLoading}<Skeleton class="mt-3 h-8 w-16" />{:else}
						<span class="mt-2 block text-3xl font-semibold tabular-nums {stat.tone}"
							>{stat.value}</span
						>
						<span class="mt-1 block text-xs text-foreground/50">{stat.note}</span>
					{/if}
				</Card.Root>
			{/each}
		</section>

		{#if inFlight.length}
			<Card.Root class="gap-0 border-info/40 bg-info/5 p-4">
				<h2 class="flex items-center gap-2 text-sm font-semibold">
					<Spinner class="size-3 text-info" />
					{inFlight.length}
					{inFlight.length === 1 ? 'run' : 'runs'} in progress
				</h2>
				<ul class="mt-2 space-y-1 text-sm">
					{#each inFlight as run (run.jobId)}
						<li class="flex flex-wrap items-center gap-x-2 text-foreground/70">
							<span class="font-medium text-foreground">{run.moduleTitle ?? 'Module'}</span>
							<span>· {run.curatorName ?? 'Curator'}</span>
							<span class="tabular-nums"
								>· {run.deliveredCount}/{run.requestedCount} drafted · started {day.format(
									run.createdAt
								)}</span
							>
						</li>
					{/each}
				</ul>
			</Card.Root>
		{/if}

		<div class="grid items-start gap-4 lg:grid-cols-3">
			<Card.Root class="gap-0 overflow-hidden py-0 lg:col-span-2">
				<header class="border-b border-muted px-5 py-4">
					<h2 class="text-base font-semibold">Question Studio runs</h2>
					<p class="text-xs text-foreground/55">Most recent {runs.length} runs for this cohort</p>
				</header>
				{#if history.isLoading}
					<div class="space-y-2 p-5">
						{#each [1, 2, 3, 4] as row (row)}<Skeleton class="h-10" />{/each}
					</div>
				{:else if runs.length === 0}
					<p class="p-10 text-center text-sm text-foreground/55">
						No questions have been generated for this cohort yet.
					</p>
				{:else}
					<Table.Root class="text-xs">
						<Table.Header>
							<Table.Row class="text-[11px] text-foreground/50">
								<Table.Head class="pl-5">Module</Table.Head>
								<Table.Head>Curator</Table.Head>
								<Table.Head>Kept</Table.Head>
								<Table.Head class="text-right">Cost</Table.Head>
								<Table.Head class="text-right">Took</Table.Head>
								<Table.Head>Status</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each runs as run (run.jobId)}
								<Table.Row class="hover:bg-muted/40">
									<Table.Cell class="min-w-0 py-2.5 pl-5">
										{#if run.moduleClassId}
											<a
												class="font-medium hover:text-primary-ink"
												href={resolve('/admin/[classId]/module/[moduleId]', {
													classId: String(run.moduleClassId),
													moduleId: String(run.moduleId)
												})}>{run.moduleTitle ?? 'Deleted module'}</a
											>
										{:else}
											<span class="font-medium">{run.moduleTitle ?? 'Deleted module'}</span>
										{/if}
										<span class="block max-w-72 truncate text-[11px] text-foreground/50">
											{day.format(run.createdAt)}{run.documentTitle
												? ` · ${run.documentTitle}`
												: ''}
										</span>
									</Table.Cell>
									<Table.Cell class="max-w-32 truncate text-xs text-foreground/65"
										>{run.curatorName ?? '—'}</Table.Cell
									>
									<Table.Cell>
										<span class="flex items-center gap-2">
											<span class="whitespace-nowrap text-xs tabular-nums"
												><span class="font-semibold">{run.savedCount}</span><span
													class="text-foreground/45"
													>/{run.deliveredCount} of {run.requestedCount}</span
												></span
											>
										</span>
									</Table.Cell>
									<Table.Cell class="text-right text-xs tabular-nums">
										{run.costKnownCalls > 0
											? `${run.costEstimated ? '~' : ''}${formatUsd(run.costUsd)}`
											: '—'}
									</Table.Cell>
									<Table.Cell class="text-right text-xs tabular-nums text-foreground/60">
										{run.completedAt ? formatDuration(run.completedAt - run.createdAt) : '—'}
									</Table.Cell>
									<Table.Cell
										><Badge
											variant="soft"
											tone={statusTone[run.status] ?? 'neutral'}
											size="sm"
											class="capitalize">{run.status}</Badge
										></Table.Cell
									>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</Card.Root>

			<Card.Root class="gap-0 p-5">
				<h2 class="text-base font-semibold">Curators</h2>
				<p class="text-xs text-foreground/55">Across the runs listed here</p>
				{#if history.isLoading}<Skeleton class="mt-4 h-32" />{:else}
					<ul class="mt-4 space-y-2.5">
						{#each curators as curator, i (i)}
							<li>
								<span class="flex items-center gap-2 text-sm">
									<UserRound size={14} class="text-foreground/45" />
									<span class="min-w-0 flex-1 truncate font-medium">{curator.name}</span>
									<span class="text-xs tabular-nums text-foreground/55"
										><span class="font-semibold text-foreground">{curator.kept}</span> kept · {curator.runs}
										{curator.runs === 1 ? 'run' : 'runs'} · {formatUsd(curator.spend)}</span
									>
								</span>
							</li>
						{:else}
							<li class="py-6 text-center text-sm text-foreground/55">No runs yet.</li>
						{/each}
					</ul>
				{/if}
			</Card.Root>
		</div>
	</div>
{/if}
