// Free: aggregates cached Claude eval runs and the Anthropic ledger. Makes no provider calls.
// Usage: bun scripts/ai-eval/claude-report.ts question-types-v27 [out.md]
import { readdir, stat } from 'node:fs/promises';

type Call = {
	stage: string;
	model?: string;
	inputTokens: number;
	outputTokens: number;
	reasoningTokens: number;
	cachedInputTokens?: number;
	cacheWriteTokens?: number;
	costUsd?: number;
	latencyMs: number;
	finishReason: string;
};
type Run = {
	doc: string;
	config: string;
	slots: Array<{ slotId: string; questionType: string }>;
	elapsedMs: number;
	slotElapsedMs: number[];
	accepted: Array<{
		slot: { slotId: string; questionType: string; objective: string };
		draft: {
			stem: string;
			options: string[];
			answerIndex: number;
			rationale: string;
		};
	}>;
	rejected: Array<{ slotId: string; reasons: string[] }>;
	corrections: Array<{ slotId: string }>;
	calls: Call[];
};

const root = 'tmp/ai-eval';
const version = process.argv[2] ?? 'question-types-v27';
const files = (await readdir(root)).filter((name) => name.endsWith(`.${version}.json`));
const runs: Array<Run & { endedAt: number }> = await Promise.all(
	files.map(async (name) => {
		const file = Bun.file(`${root}/${name}`);
		return { ...(await file.json()), endedAt: (await stat(file.name!)).mtimeMs };
	})
);
// Ledger `config` labels from the first sweep are unreliable, so assign each paid call to the run
// whose doc matches and whose wall-clock window contains it. Configs and docs run sequentially.
const ledger: Array<{ doc: string; at: string; actualUsd?: number; reservedUsd: number }> =
	await Bun.file(`${root}/anthropic-ledger.json`).json();
const runSpend = (run: (typeof runs)[number]) =>
	ledger
		.filter((entry) => {
			const at = Date.parse(entry.at);
			return entry.doc === run.doc && at >= run.endedAt - run.elapsedMs - 1000 && at <= run.endedAt;
		})
		.reduce((sum, entry) => sum + (entry.actualUsd ?? entry.reservedUsd), 0);
const configs = [...new Set(runs.map((run) => run.config))].sort();
const median = (values: number[]) => {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : 0;
};
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

const rows = configs.map((config) => {
	const set = runs.filter((run) => run.config === config);
	// The ledger also records failed calls, which runQualityBatch does not return.
	const spend = set.reduce((sum, run) => sum + runSpend(run), 0);
	const calls = set.flatMap((run) => run.calls);
	const accepted = set.flatMap((run) => run.accepted);
	const rejected = set.flatMap((run) => run.rejected);
	const input = calls.reduce((s, c) => s + c.inputTokens, 0);
	const cacheRead = calls.reduce((s, c) => s + (c.cachedInputTokens ?? 0), 0);
	const byType = (type: string) => accepted.filter((a) => a.slot.questionType === type).length;
	return {
		config,
		slots: set.reduce((n, run) => n + run.slots.length, 0),
		accepted: accepted.length,
		learn: byType('learn'),
		clinical: byType('clinical'),
		critical: byType('criticalThinking'),
		corrections: set.reduce((n, run) => n + run.corrections.length, 0),
		formatFailures: rejected.filter((r) =>
			r.reasons.some((x) => x.startsWith('Provider or format'))
		).length,
		spend,
		perAccepted: accepted.length ? spend / accepted.length : Infinity,
		medianSlotSeconds: median(set.flatMap((run) => run.slotElapsedMs)) / 1000,
		maxSlotSeconds: Math.max(...set.flatMap((run) => run.slotElapsedMs)) / 1000,
		calls: calls.length,
		cacheHitRate: input ? cacheRead / input : 0,
		thinkingShare:
			calls.reduce((s, c) => s + c.reasoningTokens, 0) /
			Math.max(
				1,
				calls.reduce((s, c) => s + c.outputTokens, 0)
			),
		medianRationaleWords: median(accepted.map((a) => words(a.draft.rationale)))
	};
});

const table = [
	'| Config (draft-review) | Accepted / slots | L / C / CT | Corrected | Format fails | Spend | $ per accepted | Median slot s | Max slot s | Calls | Cache hit | Thinking share | Rationale words |',
	'| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
	...rows.map(
		(r) =>
			`| ${r.config} | ${r.accepted}/${r.slots} | ${r.learn}/${r.clinical}/${r.critical} | ${r.corrections} | ${r.formatFailures} | $${r.spend.toFixed(4)} | $${r.perAccepted.toFixed(4)} | ${r.medianSlotSeconds.toFixed(1)} | ${r.maxSlotSeconds.toFixed(1)} | ${r.calls} | ${(r.cacheHitRate * 100).toFixed(0)}% | ${(r.thinkingShare * 100).toFixed(0)}% | ${r.medianRationaleWords} |`
	)
].join('\n');
console.log(table);

// Full question text for manual reading stays in ignored tmp/.
let questions = '';
for (const config of configs) {
	questions += `# ${config}\n\n`;
	for (const run of runs.filter((r) => r.config === config)) {
		for (const slot of run.slots) {
			const hit = run.accepted.find((a) => a.slot.slotId === slot.slotId);
			questions += `## ${run.doc.slice(0, 28)} · ${slot.slotId} ${slot.questionType}\n`;
			if (!hit) {
				const reasons = run.rejected.find((r) => r.slotId === slot.slotId)?.reasons ?? [];
				questions += `REJECTED: ${reasons.join(' | ').slice(0, 600)}\n\n`;
				continue;
			}
			const { draft } = hit;
			questions += `${draft.stem}\n${draft.options
				.map((o, i) => `${i === draft.answerIndex ? '*' : '-'} ${o}`)
				.join('\n')}\nRationale (${words(draft.rationale)}w): ${draft.rationale}\n\n`;
		}
	}
}
await Bun.write(`${root}/claude-questions-${version}.md`, questions);
if (process.argv[3]) await Bun.write(process.argv[3], `${table}\n`);
