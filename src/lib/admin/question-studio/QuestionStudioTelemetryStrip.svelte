<script lang="ts">
	import type { StatItem } from './adminStatStrip';
	import { formatDuration, formatTokens, formatUsd } from './questionStudioRun';
	import type { RunTelemetry } from './questionStudioRun';

	let { telemetry }: { telemetry: RunTelemetry } = $props();

	const items = $derived.by<StatItem[]>(() => {
		const out: StatItem[] = [
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
				note: telemetry.failedCalls > 0 ? `${telemetry.failedCalls} failed` : undefined
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
				value: `${telemetry.costComplete ? '' : '≥'}${telemetry.costEstimated ? '~' : ''}${formatUsd(telemetry.costUsd)}`,
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

<dl
	class="divide-y divide-base-300 overflow-hidden rounded-xl border border-base-300 bg-base-100"
	aria-label="Run telemetry"
>
	{#each items as item (item.label)}
		<div class="flex items-center justify-between gap-3 px-3 py-2">
			<dt class="text-xs text-base-content/55">{item.label}</dt>
			<dd class="min-w-0 text-right">
				<span
					class="text-xs font-semibold tabular-nums {item.tone === 'error'
						? 'text-error'
						: item.tone === 'warning'
							? 'text-warning'
							: ''}">{item.value}</span
				>
				{#if item.note}
					<span class="ml-2 text-[11px] text-base-content/45">{item.note}</span>
				{/if}
			</dd>
		</div>
	{/each}
</dl>
