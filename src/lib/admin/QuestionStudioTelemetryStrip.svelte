<script lang="ts">
	import AdminStatStrip from './AdminStatStrip.svelte';
	import type { StatItem } from './adminStatStrip';
	import { formatDuration, formatTokens, formatUsd } from './questionStudioRun';
	import type { RunTelemetry } from './questionStudioRun';

	let { telemetry, running = false }: { telemetry: RunTelemetry; running?: boolean } = $props();

	const items = $derived.by<StatItem[]>(() => {
		const out: StatItem[] = [
			{
				label: running ? 'Running' : 'Took',
				value: formatDuration(telemetry.elapsedMs),
				note:
					running && telemetry.projectedRemainingMs
						? `~${formatDuration(telemetry.projectedRemainingMs)} left`
						: telemetry.queueWaitMs && telemetry.queueWaitMs > 2000
							? `${formatDuration(telemetry.queueWaitMs)} queued`
							: undefined
			},
			{
				label: 'Drafted',
				value: `${telemetry.drafted}/${telemetry.planned}`,
				fill: telemetry.planned > 0 ? telemetry.drafted / telemetry.planned : 0,
				note: telemetry.secondsPerQuestion
					? `${telemetry.secondsPerQuestion.toFixed(0)}s each`
					: undefined
			},
			{
				label: 'Kept',
				value: telemetry.kept === undefined ? '—' : String(telemetry.kept),
				note: telemetry.cut > 0 ? `${telemetry.cut} cut` : undefined
			},
			{
				label: 'Workers',
				value:
					telemetry.workersTotal === 0
						? '—'
						: telemetry.workersRunning > 0
							? `${telemetry.workersRunning} running`
							: `${telemetry.workersDone}/${telemetry.workersTotal} done`,
				note: telemetry.failedCalls > 0 ? `${telemetry.failedCalls} retried` : undefined
			},
			{
				label: 'Tokens',
				value: formatTokens(telemetry.totalTokens),
				note:
					telemetry.budgetRemainingPercent !== undefined
						? `${telemetry.budgetRemainingPercent}% budget left`
						: undefined,
				tone:
					telemetry.budgetRemainingPercent !== undefined && telemetry.budgetRemainingPercent < 15
						? 'warning'
						: undefined
			},
			{
				label: 'Spend',
				value: `${telemetry.costComplete ? '' : '≥'}${formatUsd(telemetry.costUsd)}`,
				note: telemetry.costPerKept ? `${formatUsd(telemetry.costPerKept)} per kept` : undefined
			}
		];
		if (telemetry.stalledForMs)
			out.push({
				label: 'Quiet for',
				value: formatDuration(telemetry.stalledForMs),
				note: 'no activity',
				tone: 'error'
			});
		return out;
	});
</script>

<AdminStatStrip {items} ariaLabel="Run telemetry" />
