// Pure aggregation of judge and probe results per configuration.
import type { JudgeResult } from './criteria';
import type { ProbeResult } from './probes';

const mean = (values: number[]) =>
	values.length ? values.reduce((a, b) => a + b, 0) / values.length : Number.NaN;

export type ProbeSummary = {
	items: number;
	optionsOnlyRate: number;
	chance: number;
	/** Hit rate minus chance; above 0 means the options alone leak the key. */
	optionsOnlyLift: number;
	/** Items where at least 2 of 3 options-only samples hit. */
	strongCueShare: number;
	coverMatch: number;
	coverMatchOrPartial: number;
	blindMatch: number;
	costUsd: number;
};

export function summarizeProbes(results: ProbeResult[]): ProbeSummary {
	const sampled = results.filter((r) => r.optionsOnly.samples > 0);
	const covered = results.flatMap((r) => (r.cover ? [r.cover] : []));
	const blinds = results.flatMap((r) => (r.blind ? [r.blind] : []));
	const rate = mean(sampled.map((r) => r.optionsOnly.rate));
	const chance = mean(sampled.map((r) => r.optionsOnly.chance));
	return {
		items: results.length,
		optionsOnlyRate: rate,
		chance,
		optionsOnlyLift: rate - chance,
		strongCueShare: mean(
			sampled.map((r) => (r.optionsOnly.hits / r.optionsOnly.samples >= 2 / 3 ? 1 : 0))
		),
		coverMatch: mean(covered.map((c) => (c.match ? 1 : 0))),
		coverMatchOrPartial: mean(covered.map((c) => (c.verdict === 'no' ? 0 : 1))),
		blindMatch: mean(blinds.map((b) => (b.match ? 1 : 0))),
		costUsd: results.reduce((s, r) => s + r.costUsd, 0)
	};
}

export type ConfigSummary = {
	config: string;
	items: number;
	/** Slots requested, when the input records them. */
	slots?: number;
	judged: number;
	good: number;
	acceptable: number;
	poor: number;
	meanScore: number;
	probes: ProbeSummary;
	judgeCostUsd: number;
	generationSpendUsd?: number;
	perGoodUsd?: number;
	perUsableUsd?: number;
};

/** One row per config. `spend` is generation spend in USD; without it the $ columns are omitted. */
export function summarizeConfig(
	config: string,
	judge: JudgeResult[],
	probes: ProbeResult[],
	extra: { items: number; slots?: number; spendUsd?: number }
): ConfigSummary {
	const count = (o: JudgeResult['overall']) => judge.filter((r) => r.overall === o).length;
	const good = count('good');
	const acceptable = count('acceptable');
	const spend = extra.spendUsd;
	return {
		config,
		items: extra.items,
		slots: extra.slots,
		judged: judge.length,
		good,
		acceptable,
		poor: count('poor'),
		meanScore: mean(judge.map((r) => r.score)),
		probes: summarizeProbes(probes),
		judgeCostUsd: judge.reduce((s, r) => s + r.costUsd, 0),
		generationSpendUsd: spend,
		perGoodUsd: spend === undefined ? undefined : good ? spend / good : Infinity,
		perUsableUsd:
			spend === undefined ? undefined : good + acceptable ? spend / (good + acceptable) : Infinity
	};
}

const pct = (v: number) => (Number.isFinite(v) ? `${(v * 100).toFixed(0)}%` : '–');
const usd = (v?: number) => (v === undefined ? '–' : Number.isFinite(v) ? `$${v.toFixed(4)}` : '∞');

export function formatSummaries(rows: ConfigSummary[]) {
	return [
		'| Config | Items / slots | Good / acc / poor | Mean score | Options-only hit (chance) | Strong cue | Cover match | Blind solve | Judge+probe $ | Gen spend | $ per good | $ per good+acc |',
		'| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
		...rows.map(
			(r) =>
				`| ${r.config} | ${r.items}${r.slots === undefined ? '' : `/${r.slots}`} | ${r.good}/${r.acceptable}/${r.poor}${r.judged < r.items ? ` (${r.items - r.judged} unjudged)` : ''} | ${Number.isFinite(r.meanScore) ? r.meanScore.toFixed(2) : '–'} | ${pct(r.probes.optionsOnlyRate)} (${pct(r.probes.chance)}) | ${pct(r.probes.strongCueShare)} | ${pct(r.probes.coverMatch)} | ${pct(r.probes.blindMatch)} | ${usd(r.judgeCostUsd + r.probes.costUsd)} | ${usd(r.generationSpendUsd)} | ${usd(r.perGoodUsd)} | ${usd(r.perUsableUsd)} |`
		)
	].join('\n');
}

/** `a=0.65,b=0.28` → { a: 0.65, b: 0.28 }. */
export function parseSpend(text: string | undefined): Record<string, number> {
	if (!text) return {};
	return Object.fromEntries(
		text
			.split(',')
			.map((pair) => pair.split('='))
			.filter((parts) => parts.length === 2 && parts[0].trim() && Number.isFinite(Number(parts[1])))
			.map(([key, value]) => [key.trim(), Number(value)])
	);
}
