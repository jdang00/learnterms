// Seeds a deployment's questionExemplars table from tmp/exemplar-bank/bank.json (model labels),
// then prunes rows from earlier builds. migrations/exemplars:rebuildExemplarBank is the
// heuristic-label fallback that needs no local export.
// Usage: bun scripts/ai-eval/exemplars/push.ts [bankPath] [--prod --yes-production]
import { readFileSync } from 'node:fs';
import { textFingerprint } from '../../../src/convex/questionStudio/exemplarStats';
import { embedTexts } from './embeddings';
import { type BankEntry, DEFAULT_BANK_PATH } from './types';

const prod = process.argv.includes('--prod');
if (prod && !process.argv.includes('--yes-production'))
	throw new Error('Pass --yes-production with --prod to write the production bank');
const bankPath = process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? DEFAULT_BANK_PATH;
const entries = JSON.parse(readFileSync(bankPath, 'utf8')) as BankEntry[];
const vectors = await embedTexts(
	entries.map((entry) => entry.embedText),
	'bank'
);
const buildId = `offline-${Date.now()}`;
// `convex run` takes args on the command line, so batches stay well under ARG_MAX.
const BATCH = 10;

function run(fn: string, args: unknown) {
	const command = ['bunx', 'convex', 'run', ...(prod ? ['--prod'] : []), fn, JSON.stringify(args)];
	const result = Bun.spawnSync(command, {
		stdout: 'pipe',
		stderr: 'pipe'
	});
	if (result.exitCode !== 0) throw new Error(`${fn} failed: ${result.stderr.toString()}`);
	return result.stdout.toString();
}

for (let start = 0; start < entries.length; start += BATCH) {
	const exemplars = entries.slice(start, start + BATCH).map((entry, offset) => ({
		questionType: entry.questionType,
		shape: entry.shape,
		subject: entry.subject,
		stem: entry.stem,
		options: entry.options,
		correctIndex: entry.correctIndex,
		rationale: entry.rationale,
		...(entry.stats ? { stats: entry.stats } : {}),
		...(entry.notes ? { notes: entry.notes } : {}),
		sourceQuestionId: entry.id,
		tier: entry.tier,
		quality: entry.quality,
		labelSource: entry.labelSource,
		embedTextHash: textFingerprint(entry.embedText),
		embedding: Array.from(vectors[start + offset], (value) => Number(value.toPrecision(7)))
	}));
	run('questionStudio/exemplarBank:upsertExemplars', { buildId, exemplars });
	process.stdout.write(`\rupserted ${Math.min(start + BATCH, entries.length)}/${entries.length}`);
}
console.log(`\n${run('questionStudio/exemplarBank:pruneExemplars', { buildId })}`);
