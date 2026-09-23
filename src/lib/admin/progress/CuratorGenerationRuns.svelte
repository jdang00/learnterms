<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { CircleDollarSign, Clock, Layers, Sparkles, UserRound } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { formatDuration, formatTokens, formatUsd } from '../question-studio/questionStudioRun';
	import { percent } from './utils';
	import { SvelteMap } from 'svelte/reactivity';

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
	const statusBadge: Record<string, string> = {
		ready: 'badge-success',
		failed: 'badge-error',
		running: 'badge-info',
		queued: 'badge-ghost'
	};
</script>

{#if history.error}
	<div class="alert alert-error alert-soft">
		Failed to load generation runs: {history.error.message}
	</div>
{:else}
	<div class="space-y-4">
		<section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Question Studio summary">
			{#each [{ label: 'Runs this week', icon: Sparkles, value: String(summary?.runsThisWeek ?? 0), note: summary?.failedThisWeek ? `${summary.failedThisWeek} failed` : 'None failed', tone: summary?.failedThisWeek ? 'text-warning' : '' }, { label: 'Questions kept', icon: Layers, value: String(summary?.savedThisWeek ?? 0), note: drafted ? `${percent(kept, drafted)}% of drafts kept recently` : 'Saved into modules this week', tone: '' }, { label: 'Spend this week', icon: CircleDollarSign, value: formatUsd(summary?.spendThisWeek ?? 0), note: summary?.costPerSavedQuestion ? `${formatUsd(summary.costPerSavedQuestion)} per kept question` : `${formatTokens(summary?.tokensThisWeek ?? 0)} tokens`, tone: '' }, { label: 'Typical run', icon: Clock, value: summary?.medianDurationMs ? formatDuration(summary.medianDurationMs) : '—', note: 'Median start to finish', tone: '' }] as stat (stat.label)}
				<div class="card card-border bg-base-100 p-4">
					<span class="flex items-center justify-between text-xs text-base-content/60"
						>{stat.label}<stat.icon size={15} class="text-primary" /></span
					>
					{#if history.isLoading}<span class="skeleton mt-3 h-8 w-16"></span>{:else}
						<span class="mt-2 block text-3xl font-semibold tabular-nums {stat.tone}"
							>{stat.value}</span
						>
						<span class="mt-1 block text-xs text-base-content/50">{stat.note}</span>
					{/if}
				</div>
			{/each}
		</section>

		{#if inFlight.length}
			<section class="card card-border border-info/40 bg-info/5 p-4">
				<h2 class="flex items-center gap-2 text-sm font-semibold">
					<span class="loading loading-spinner loading-xs text-info"></span>
					{inFlight.length}
					{inFlight.length === 1 ? 'run' : 'runs'} in progress
				</h2>
				<ul class="mt-2 space-y-1 text-sm">
					{#each inFlight as run (run.jobId)}
						<li class="flex flex-wrap items-center gap-x-2 text-base-content/70">
							<span class="font-medium text-base-content">{run.moduleTitle ?? 'Module'}</span>
							<span>· {run.curatorName ?? 'Curator'}</span>
							<span class="tabular-nums"
								>· {run.deliveredCount}/{run.requestedCount} drafted · started {day.format(
									run.createdAt
								)}</span
							>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<div class="grid items-start gap-4 lg:grid-cols-3">
			<section class="card card-border overflow-hidden bg-base-100 lg:col-span-2">
				<header class="border-b border-base-200 px-5 py-4">
					<h2 class="text-base font-semibold">Question Studio runs</h2>
					<p class="text-xs text-base-content/55">Most recent {runs.length} runs for this cohort</p>
				</header>
				{#if history.isLoading}
					<div class="space-y-2 p-5">
						{#each [1, 2, 3, 4] as row (row)}<div class="skeleton h-10"></div>{/each}
					</div>
				{:else if runs.length === 0}
					<p class="p-10 text-center text-sm text-base-content/55">
						No questions have been generated for this cohort yet.
					</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr class="text-[11px] text-base-content/50">
									<th class="pl-5">Module</th>
									<th>Curator</th>
									<th>Kept</th>
									<th class="text-right">Cost</th>
									<th class="text-right">Took</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{#each runs as run (run.jobId)}
									<tr class="hover:bg-base-200/40">
										<td class="min-w-0 py-2.5 pl-5">
											{#if run.moduleClassId}
												<a
													class="font-medium hover:text-primary"
													href={resolve('/admin/[classId]/module/[moduleId]', {
														classId: String(run.moduleClassId),
														moduleId: String(run.moduleId)
													})}>{run.moduleTitle ?? 'Deleted module'}</a
												>
											{:else}
												<span class="font-medium">{run.moduleTitle ?? 'Deleted module'}</span>
											{/if}
											<span class="block max-w-72 truncate text-[11px] text-base-content/50">
												{day.format(run.createdAt)}{run.documentTitle
													? ` · ${run.documentTitle}`
													: ''}
											</span>
										</td>
										<td class="max-w-32 truncate text-xs text-base-content/65"
											>{run.curatorName ?? '—'}</td
										>
										<td>
											<span class="flex items-center gap-2">
												<span class="whitespace-nowrap text-xs tabular-nums"
													><span class="font-semibold">{run.savedCount}</span><span
														class="text-base-content/45"
														>/{run.deliveredCount} of {run.requestedCount}</span
													></span
												>
											</span>
										</td>
										<td class="text-right text-xs tabular-nums">
											{run.costKnownCalls > 0
												? `${run.costEstimated ? '~' : ''}${formatUsd(run.costUsd)}`
												: '—'}
										</td>
										<td class="text-right text-xs tabular-nums text-base-content/60">
											{run.completedAt ? formatDuration(run.completedAt - run.createdAt) : '—'}
										</td>
										<td
											><span
												class="badge badge-soft badge-sm capitalize {statusBadge[run.status] ??
													'badge-ghost'}">{run.status}</span
											></td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>

			<section class="card card-border bg-base-100 p-5">
				<h2 class="text-base font-semibold">Curators</h2>
				<p class="text-xs text-base-content/55">Across the runs listed here</p>
				{#if history.isLoading}<div class="skeleton mt-4 h-32"></div>{:else}
					<ul class="mt-4 space-y-2.5">
						{#each curators as curator, i (i)}
							<li>
								<span class="flex items-center gap-2 text-sm">
									<UserRound size={14} class="text-base-content/45" />
									<span class="min-w-0 flex-1 truncate font-medium">{curator.name}</span>
									<span class="text-xs tabular-nums text-base-content/55"
										><span class="font-semibold text-base-content">{curator.kept}</span> kept · {curator.runs}
										{curator.runs === 1 ? 'run' : 'runs'} · {formatUsd(curator.spend)}</span
									>
								</span>
							</li>
						{:else}
							<li class="py-6 text-center text-sm text-base-content/55">No runs yet.</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>
	</div>
{/if}
