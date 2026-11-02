// Paid: scores generated questions by quality, not acceptance. Judge (Opus) + cue probes (Haiku).
// Usage:
//   bun scripts/ai-eval/judge/score-run.ts --label=v28-v29 'tmp/ai-eval/*.question-types-v29.json' \
//     tmp/live-v28-sonnet-opus.md=live-v28 --pages=tmp/ai-eval/<hash>.pages.json \
//     --spend=live-v28=0.65,sonnet-default@v29=1.20
// Inputs are eval result JSON files (accepted drafts; config `<config>@vNN`, repeats grouped) or
// candidate markdown (`path.md=config`, default config = file name). `--spend` (or `--spend-file`
// with a {config: usd} JSON) sets generation spend; eval JSON falls back to its recorded call costs.
// Flags: --no-probes, --no-judge, --samples=3, --batch=4 (items per judge call), --async (Message
//   Batches at half price), --effort=medium, --ceiling=5 (per-run $),
//   --type=learn (markdown question type). Cached verdicts are reused, so reruns only pay for new items.
import { JUDGE_ROOT, judgeSpend, startJudgeSession } from './claude';
import { judgeItems, JUDGE_VERSION } from './judge';
import { probeItems, PROBE_VERSION } from './probes';
import {
	judgeKey as judgeKeyFor,
	probeKey as probeKeyFor,
	readCache,
	remember,
	writeCache,
	type JudgeCache,
	type ProbeCache
} from './cache';
import {
	itemsFromEvalRun,
	itemsFromMarkdown,
	loadEvalRun,
	runStats,
	type SourcedItem
} from './items';
import { formatSummaries, parseSpend, summarizeConfig } from './summary';

const flag = (name: string) =>
	process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = (name: string) => process.argv.includes(`--${name}`);
const label = flag('label') ?? 'run';
const samples = Number(flag('samples') ?? 3);
const inputs = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
if (!inputs.length) throw new Error('Pass eval result files, globs, or candidate markdown');

const items: SourcedItem[] = [];
const stats = new Map<string, { slots: number; callSpendUsd: number }>();
const pages = flag('pages') ? await Bun.file(flag('pages')!).json() : undefined;
for (const input of inputs) {
	const [pattern, configOverride] = input.split('=');
	const paths = pattern.includes('*') ? [...new Bun.Glob(pattern).scanSync('.')].sort() : [pattern];
	if (!paths.length) console.warn(`No files match ${pattern}`);
	for (const path of paths) {
		if (path.endsWith('.md')) {
			const config = configOverride ?? path.split('/').pop()!.replace(/\.md$/, '');
			const type = flag('type') as SourcedItem['questionType'] | undefined;
			items.push(
				...itemsFromMarkdown(path, await Bun.file(path).text(), {
					config,
					questionType: type,
					pages
				})
			);
			continue;
		}
		const run = await loadEvalRun(path);
		const runItems = itemsFromEvalRun(path, run).map((item) =>
			configOverride ? { ...item, config: configOverride } : item
		);
		items.push(...runItems);
		const config = configOverride ?? runItems[0]?.config;
		if (config) {
			const s = runStats(run);
			const prev = stats.get(config) ?? { slots: 0, callSpendUsd: 0 };
			stats.set(config, {
				slots: prev.slots + s.slots,
				callSpendUsd: prev.callSpendUsd + s.callSpendUsd
			});
		}
	}
}
const seen = new Set<string>();
for (const item of items) {
	if (seen.has(item.id)) throw new Error(`Duplicate item id ${item.id}; pass each file once`);
	seen.add(item.id);
}

const effort = (flag('effort') as 'low' | 'medium' | 'high') ?? 'medium';
const judgeCache = await readCache<JudgeCache>('cache-judge.json');
const probeCache = await readCache<ProbeCache>('cache-probes.json');
const judgeKey = (item: SourcedItem) => judgeKeyFor(item, effort);
const probeKey = (item: SourcedItem) => probeKeyFor(item, samples);

const needJudge = has('no-judge') ? [] : items.filter((i) => !judgeCache[judgeKey(i)]);
const needProbes = has('no-probes') ? [] : items.filter((i) => !probeCache[probeKey(i)]);
console.log(
	`${items.length} items in ${new Set(items.map((i) => i.config)).size} configs; judging ${needJudge.length} new, probing ${needProbes.length} new`
);
if (needJudge.length || needProbes.length) {
	await startJudgeSession({ runUsd: Number(flag('ceiling') ?? 5) });
	const before = judgeSpend();
	const judged = await judgeItems(needJudge, {
		effort,
		batchSize: Number(flag('batch') ?? 4),
		async: has('async')
	});
	remember(judgeCache, needJudge, judged, judgeKey);
	await writeCache('cache-judge.json', judgeCache);
	const probed = await probeItems(needProbes, { samples });
	remember(probeCache, needProbes, probed, probeKey);
	await writeCache('cache-probes.json', probeCache);
	console.log(`Spent $${(judgeSpend() - before).toFixed(4)} this run`);
}

const spendFile = flag('spend-file') ? await Bun.file(flag('spend-file')!).json() : {};
const spend: Record<string, number> = { ...spendFile, ...parseSpend(flag('spend')) };
const scored = items.map((item) => {
	const judge = judgeCache[judgeKey(item)];
	const probe = probeCache[probeKey(item)];
	return {
		...item,
		judge: judge ? { id: item.id, ...judge } : undefined,
		probes: probe ? { id: item.id, ...probe } : undefined
	};
});
const configs = [...new Set(items.map((i) => i.config))].sort();
const rows = configs.map((config) => {
	const set = scored.filter((s) => s.config === config);
	const s = stats.get(config);
	return summarizeConfig(
		config,
		set.flatMap((x) => (x.judge ? [x.judge] : [])),
		set.flatMap((x) => (x.probes ? [x.probes] : [])),
		{
			items: set.length,
			slots: s?.slots,
			spendUsd: spend[config] ?? (s?.callSpendUsd || undefined)
		}
	);
});
const table = formatSummaries(rows);
console.log(table);
const missingSpend = configs.filter((c) => spend[c] === undefined);
if (missingSpend.length)
	console.log(
		`Spend from recorded call costs (a lower bound) or missing for: ${missingSpend.join(', ')}. Pass --spend=config=usd for ledger totals.`
	);
await Bun.write(
	`${JUDGE_ROOT}/scores-${label}.json`,
	JSON.stringify(
		{
			label,
			judgeVersion: JUDGE_VERSION,
			probeVersion: PROBE_VERSION,
			createdAt: new Date().toISOString(),
			configs: rows,
			table,
			items: scored.map(({ evidence: _evidence, ...rest }) => rest)
		},
		null,
		2
	)
);
console.log(`Wrote ${JUDGE_ROOT}/scores-${label}.json`);
