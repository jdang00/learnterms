<script lang="ts">
	import { sectionValueKey, type ExamSection } from '$lib/examFindings/catalog';
	import type { ExamFinding } from '$lib/examFindings/findings';
	import {
		W4D_WHITE,
		diplopiaPattern,
		formatOffset,
		parseOffset,
		parseResponse,
		presetOffset,
		redEyeFor,
		worth4DotSummary,
		type DiplopiaPreset,
		type Offset,
		type W4dResponse
	} from '$lib/examFindings/worth4dot';
	import Worth4DotDiagram from '$lib/components/exam-findings/Worth4DotDiagram.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';

	let {
		finding,
		section,
		onChange,
		disabled = false
	}: {
		finding: ExamFinding;
		section: Extract<ExamSection, { kind: 'grid' }>;
		onChange: () => void;
		disabled?: boolean;
	} = $props();

	const RESPONSES: Array<{ value: W4dResponse; label: string }> = [
		{ value: 'Fusion', label: 'Fusion' },
		{ value: 'Suppression OD', label: 'Supp. OD' },
		{ value: 'Suppression OS', label: 'Supp. OS' },
		{ value: 'Alternating suppression', label: 'Alternating' },
		{ value: 'Diplopia', label: 'Diplopia' }
	];
	const PRESETS: Array<{ value: DiplopiaPreset; label: string }> = [
		{ value: 'uncrossed', label: 'Uncrossed' },
		{ value: 'crossed', label: 'Crossed' },
		{ value: 'rHyper', label: 'R hyper' },
		{ value: 'lHyper', label: 'L hyper' }
	];
	const CHIP = 'h-7 px-2.5 font-medium';

	const redEye = $derived(redEyeFor(finding.values.lenses));
	const key = (row: string, column: string) => sectionValueKey(section, row, column);

	function readRow(row: string) {
		const response = parseResponse(finding.values[key(row, 'response')]);
		return {
			response,
			white: finding.values[key(row, 'white')] || undefined,
			offset: parseOffset(finding.values[key(row, 'offset')])
		};
	}

	function write(row: string, values: { response?: W4dResponse; white?: string; offset?: Offset }) {
		const entries = [
			['response', values.response],
			['white', values.response === 'Fusion' ? values.white : undefined],
			['offset', values.response === 'Diplopia' && values.offset ? formatOffset(values.offset) : '']
		] as const;
		for (const [column, value] of entries) {
			if (value) finding.values[key(row, column)] = value;
			else delete finding.values[key(row, column)];
		}
		onChange();
	}

	function chooseResponse(row: string, response: W4dResponse) {
		const current = readRow(row);
		if (current.response === response) return write(row, {});
		write(row, {
			response,
			white: current.white,
			offset: current.offset ?? presetOffset('uncrossed', redEye)
		});
	}

	function moveRedImage(row: string, offset: Offset | null) {
		const current = readRow(row);
		write(
			row,
			offset ? { response: 'Diplopia', offset } : { response: 'Fusion', white: current.white }
		);
	}

	function presetActive(offset: Offset | null, preset: DiplopiaPreset) {
		if (!offset) return false;
		const { horizontal, hyperEye } = diplopiaPattern(offset, redEye);
		if (preset === 'uncrossed' || preset === 'crossed') return horizontal === preset && !hyperEye;
		return !horizontal && hyperEye === (preset === 'rHyper' ? 'OD' : 'OS');
	}
</script>

<div class="@container space-y-2">
	<label
		class="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-border/70 bg-background px-3 py-2"
	>
		<Switch
			size="sm"
			class="mt-0.5"
			checked={Boolean(finding.hideInterpretation)}
			onCheckedChange={(checked) => {
				finding.hideInterpretation = checked || undefined;
				onChange();
			}}
			{disabled}
		/>
		<span class="min-w-0 text-xs leading-snug">
			<span class="font-medium">Quiz on the pattern</span>
			<span class="block text-foreground/55">
				Students see only the dots until they answer; the interpretation shows with the solution.
			</span>
		</span>
	</label>
	<div class="grid grid-cols-1 gap-3 @lg:grid-cols-2">
		{#each section.rows as row (row.key)}
			{@const current = readRow(row.key)}
			{@const reading = { ...current, response: current.response ?? ('Fusion' as const) }}
			<div class="min-w-0 space-y-2 rounded-2xl border border-border/70 bg-muted/30 p-2.5">
				<div class="flex items-center justify-between gap-2">
					<span class="text-xs font-semibold text-foreground/70">{row.label}</span>
					{#if current.response}
						<span class="truncate text-[0.7rem] text-foreground/55">
							{worth4DotSummary(reading, redEye).dots}
						</span>
					{/if}
				</div>
				<div class="flex flex-wrap gap-1" role="radiogroup" aria-label="{row.label} response">
					{#each RESPONSES as option (option.value)}
						{@const active = current.response === option.value}
						<Button
							size="xs"
							variant={active ? 'solid' : 'ghost'}
							tone={active ? 'primary' : 'neutral'}
							type="button"
							role="radio"
							aria-checked={active}
							class="{CHIP} {active ? '' : 'border-border bg-background'}"
							onclick={() => chooseResponse(row.key, option.value)}
							{disabled}>{option.label}</Button
						>
					{/each}
				</div>
				<div class="relative">
					<Worth4DotDiagram
						{reading}
						{redEye}
						onMove={disabled ? undefined : (offset) => moveRedImage(row.key, offset)}
						ghost={!current.response}
						class="mx-auto max-w-64 rounded-xl"
					/>
					{#if !current.response}
						<p
							class="pointer-events-none absolute inset-x-0 top-2 text-center text-[0.7rem] text-white/60"
						>
							Pick a response or drag the red dot
						</p>
					{/if}
				</div>
				{#if current.response === 'Diplopia'}
					<div class="flex flex-wrap gap-1" aria-label="{row.label} diplopia presets">
						{#each PRESETS as preset (preset.value)}
							{@const active = presetActive(current.offset, preset.value)}
							<Button
								size="xs"
								variant={active ? 'solid' : 'ghost'}
								tone={active ? 'secondary' : 'neutral'}
								type="button"
								aria-pressed={active}
								class="{CHIP} {active ? '' : 'border-border bg-background'}"
								onclick={() =>
									write(row.key, {
										response: 'Diplopia',
										offset: presetOffset(preset.value, redEye)
									})}
								{disabled}>{preset.label}</Button
							>
						{/each}
					</div>
				{:else if current.response === 'Fusion'}
					<div class="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="White dot">
						<span class="mr-1 text-[0.7rem] text-foreground/50">White dot</span>
						{#each W4D_WHITE as option (option)}
							{@const active = current.white === option}
							<Button
								size="xs"
								variant={active ? 'solid' : 'ghost'}
								tone={active ? 'secondary' : 'neutral'}
								type="button"
								role="radio"
								aria-checked={active}
								class="{CHIP} {active ? '' : 'border-border bg-background'}"
								onclick={() =>
									write(row.key, { response: 'Fusion', white: active ? undefined : option })}
								{disabled}>{option}</Button
							>
						{/each}
					</div>
				{/if}
				{#if current.response}
					{@const summary = worth4DotSummary(reading, redEye)}
					<p class="text-xs leading-snug">
						<span class="font-medium">{summary.title}</span>
						{#if summary.detail}<span class="text-foreground/55"> · {summary.detail}</span>{/if}
					</p>
				{/if}
			</div>
		{/each}
	</div>
</div>
