<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { Sparkles } from 'lucide-svelte';
	import AdminStatStrip from './AdminStatStrip.svelte';
	import type { StatItem } from './adminStatStrip';
	import { resolve } from '$app/paths';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';
	import { formatDuration, formatTokens, formatUsd } from './questionStudioRun';

	let { cohortId }: { cohortId: Id<'cohort'> } = $props();

	const history = useQuery(api.questionStudio.listCohortGenerationJobs, () => ({
		cohortId,
		limit: 12
	}));

	const summary = $derived(history.data?.summary);
	const runs = $derived(history.data?.runs ?? []);

	const day = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});

	const statusTone: Record<string, string> = {
		ready: 'text-success',
		failed: 'text-error',
		running: 'text-primary',
		queued: 'text-base-content/50'
	};

	const stats = $derived.by<StatItem[]>(() => [
		{
			label: 'Runs this week',
			value: String(summary?.runsThisWeek ?? 0),
			note: summary?.failedThisWeek ? `${summary.failedThisWeek} failed` : 'None failed',
			tone: summary?.failedThisWeek ? 'warning' : undefined
		},
		{
			label: 'Questions kept',
			value: String(summary?.savedThisWeek ?? 0),
			note: 'Saved into modules'
		},
		{
			label: 'Spend',
			value: formatUsd(summary?.spendThisWeek ?? 0),
			note: summary?.costPerSavedQuestion
				? `${formatUsd(summary.costPerSavedQuestion)} per kept question`
				: `${formatTokens(summary?.tokensThisWeek ?? 0)} tokens`
		},
		{
			label: 'Typical run',
			value: summary?.medianDurationMs ? formatDuration(summary.medianDurationMs) : '—',
			note: 'Median start to finish'
		}
	]);
</script>

{#if history.error}
	<div class="alert alert-error rounded-2xl">
		Failed to load generation runs: {history.error.message}
	</div>
{:else}
	<div class="space-y-3">
		<AdminStatStrip items={stats} loading={history.isLoading} ariaLabel="Question Studio summary" />

		<div class="rounded-2xl border border-base-300 bg-base-100 shadow-xs">
			<div class="flex items-center gap-2 border-b border-base-300 px-4 py-2.5">
				<h2 class="flex items-center gap-2 text-sm font-semibold">
					<Sparkles size={15} />
					Question Studio runs
				</h2>
				<span class="text-xs text-base-content/50">Most recent first</span>
			</div>

			{#if runs.length === 0}
				<p class="p-8 text-center text-sm text-base-content/50">
					No questions have been generated for this cohort yet.
				</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr class="text-xs text-base-content/50">
								<th>When</th>
								<th>Module</th>
								<th>Curator</th>
								<th class="text-right">Drafted</th>
								<th class="text-right">Kept</th>
								<th class="text-right">Cost</th>
								<th class="text-right">Took</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{#each runs as run (run.jobId)}
								<tr class="hover:bg-base-200/40">
									<td class="whitespace-nowrap tabular-nums text-base-content/60">
										{day.format(run.createdAt)}
									</td>
									<td class="min-w-0">
										{#if run.moduleClassId}
											<a
												class="font-medium underline-offset-2 hover:text-primary hover:underline"
												href={resolve('/admin/[classId]/module/[moduleId]', {
													classId: String(run.moduleClassId),
													moduleId: String(run.moduleId)
												})}
											>
												{run.moduleTitle ?? 'Deleted module'}
											</a>
										{:else}
											<span class="font-medium">{run.moduleTitle ?? 'Deleted module'}</span>
										{/if}
										{#if run.documentTitle}
											<span class="block max-w-64 truncate text-xs text-base-content/45">
												from {run.documentTitle}
											</span>
										{/if}
									</td>
									<td class="max-w-32 truncate text-base-content/60">{run.curatorName ?? '—'}</td>
									<td class="text-right tabular-nums">
										{run.deliveredCount}<span class="text-base-content/40"
											>/{run.requestedCount}</span
										>
									</td>
									<td class="text-right tabular-nums">{run.savedCount}</td>
									<td class="text-right tabular-nums">
										{run.costKnownCalls > 0 ? formatUsd(run.costUsd) : '—'}
									</td>
									<td class="text-right tabular-nums text-base-content/60">
										{run.completedAt ? formatDuration(run.completedAt - run.createdAt) : '—'}
									</td>
									<td class="capitalize {statusTone[run.status] ?? ''}">{run.status}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
{/if}
