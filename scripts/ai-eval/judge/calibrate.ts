// Paid: judges (and optionally probes) the anchor set and reports agreement with the labels.
// Usage: bun scripts/ai-eval/judge/calibrate.ts [--tag=v1] [--effort=medium] [--batch=4]
//   [--probes] [--no-judge] [--ids=H-L1,V28-05] [--ceiling=8]
// Free re-report from saved results: --report-only. --seed-cache copies verdicts into the score-run cache. --seed reorders batches for a retest.
import { agreement, formatAgreement, type Labeled } from './criteria';
import { JUDGE_ROOT, judgeSpend, startJudgeSession } from './claude';
import { judgeItems, JUDGE_VERSION, type DetailedJudgeResult } from './judge';
import { probeItems, type ProbeResult } from './probes';
import { summarizeProbes } from './summary';
import { loadAnchors, type Anchor } from './anchors';
import {
	judgeKey,
	probeKey,
	readCache,
	remember,
	writeCache,
	type JudgeCache,
	type ProbeCache
} from './cache';

const flag = (name: string) =>
	process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];
const has = (name: string) => process.argv.includes(`--${name}`);
const tag = flag('tag') ?? JUDGE_VERSION;
const outPath = `${JUDGE_ROOT}/calibration-${tag}.json`;

const all = await loadAnchors();
const ids = flag('ids')?.split(',');
const anchors = ids ? all.filter((a) => ids.includes(a.id)) : all;

type Saved = { tag: string; judge?: DetailedJudgeResult[]; probes?: ProbeResult[] };
const saved: Saved = (await Bun.file(outPath).exists()) ? await Bun.file(outPath).json() : { tag };

if (!has('report-only')) {
	await startJudgeSession({ totalUsd: Number(flag('ceiling') ?? 8), runUsd: 3 });
	const before = judgeSpend();
	if (!has('no-judge')) {
		saved.judge = await judgeItems(anchors, {
			effort: (flag('effort') as 'low' | 'medium' | 'high') ?? 'medium',
			batchSize: Number(flag('batch') ?? 4),
			seed: Number(flag('seed') ?? 7)
		});
	}
	if (has('probes')) saved.probes = await probeItems(anchors);
	await Bun.write(outPath, JSON.stringify(saved, null, 2));
	console.log(
		`Spent this run $${(judgeSpend() - before).toFixed(4)}; judge ledger total $${judgeSpend().toFixed(4)}`
	);
}

// Seed the score-run caches so anchor items (e.g. the live runs) are never paid for twice.
if (has('seed-cache') && saved.judge?.length && saved.tag === JUDGE_VERSION) {
	const cache = await readCache<JudgeCache>('cache-judge.json');
	remember(cache, anchors, saved.judge, (item) => judgeKey(item, flag('effort') ?? 'medium'));
	await writeCache('cache-judge.json', cache);
}
if (has('seed-cache') && saved.probes?.length) {
	const cache = await readCache<ProbeCache>('cache-probes.json');
	remember(cache, anchors, saved.probes, (item) => probeKey(item));
	await writeCache('cache-probes.json', cache);
}

console.log(report(anchors, saved));

function report(anchors: Anchor[], saved: Saved) {
	const lines: string[] = [];
	if (saved.judge?.length) {
		const labels: Labeled[] = anchors.map((a) => ({ id: a.id, ...a.label }));
		lines.push(
			`## Judge agreement (${saved.tag})`,
			'',
			formatAgreement(agreement(labels, saved.judge))
		);
		const certain = labels.filter((l) => !anchors.find((a) => a.id === l.id)!.label.uncertain);
		const sure = agreement(certain, saved.judge);
		lines.push(
			'',
			`Excluding uncertain labels (${sure.items} items): overall exact ${(sure.overall.exact * 100).toFixed(0)}%, good-decision agreement ${(sure.overall.good.agreement * 100).toFixed(0)}%`
		);
		for (const origin of ['human', 'generated'] as const) {
			const part = agreement(
				labels.filter((l) => anchors.find((a) => a.id === l.id)!.origin === origin),
				saved.judge
			);
			lines.push(
				`${origin} (${part.items}): overall exact ${(part.overall.exact * 100).toFixed(0)}%, within one ${(part.overall.withinOne * 100).toFixed(0)}%, good-decision ${(part.overall.good.agreement * 100).toFixed(0)}% (precision ${(part.overall.good.precision * 100).toFixed(0)}%, recall ${(part.overall.good.recall * 100).toFixed(0)}%)`
			);
		}
		const cost = saved.judge.reduce((s, r) => s + r.costUsd, 0);
		lines.push(
			`Judge cost $${cost.toFixed(4)} for ${saved.judge.length} items ($${(cost / saved.judge.length).toFixed(4)} each)`
		);
		lines.push('', '### Disagreements on overall', '');
		for (const r of saved.judge) {
			const a = anchors.find((x) => x.id === r.id);
			if (a && a.label.overall !== r.overall)
				lines.push(
					`- ${r.id}: anchor ${a.label.overall}${a.label.uncertain ? '?' : ''}, judge ${r.overall} — ${r.reasons.join(' / ')}`
				);
		}
	}
	if (saved.probes?.length) {
		lines.push(
			'',
			'## Probes on anchors',
			'',
			'| Group | Items | Options-only hit | Chance | Lift | Strong cue (≥2/3) | Cover match | Cover match+partial | Blind solve | Cost |',
			'| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
		);
		const groups: Array<[string, (a: Anchor) => boolean]> = [
			['human', (a) => a.origin === 'human'],
			['generated', (a) => a.origin === 'generated'],
			['label good', (a) => a.label.overall === 'good'],
			['label acceptable', (a) => a.label.overall === 'acceptable'],
			['label poor', (a) => a.label.overall === 'poor']
		];
		for (const [name, test] of groups) {
			const ids = new Set(anchors.filter(test).map((a) => a.id));
			const s = summarizeProbes(saved.probes.filter((p) => ids.has(p.id)));
			const p = (v: number) => (Number.isNaN(v) ? '–' : `${(v * 100).toFixed(0)}%`);
			lines.push(
				`| ${name} | ${s.items} | ${p(s.optionsOnlyRate)} | ${p(s.chance)} | ${p(s.optionsOnlyLift)} | ${p(s.strongCueShare)} | ${p(s.coverMatch)} | ${p(s.coverMatchOrPartial)} | ${p(s.blindMatch)} | $${s.costUsd.toFixed(4)} |`
			);
		}
	}
	return lines.join('\n');
}
