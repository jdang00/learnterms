// Content-addressed verdict caches, so rescoring the same item text never pays twice.
import { createHash } from 'node:crypto';
import { JUDGE_ROOT } from './claude';
import type { JudgeItem, JudgeResult } from './criteria';
import { JUDGE_VERSION } from './judge';
import { PROBE_VERSION, type ProbeResult } from './probes';

export function contentHash(item: JudgeItem, version: string) {
	return createHash('sha256')
		.update(
			JSON.stringify([
				version,
				item.questionType,
				item.stem,
				item.options,
				item.answerIndex,
				item.rationale,
				item.evidence ?? ''
			])
		)
		.digest('hex')
		.slice(0, 24);
}

export const judgeKey = (item: JudgeItem, effort = 'medium') =>
	contentHash(item, `${JUDGE_VERSION}/${effort}`);
export const probeKey = (item: JudgeItem, samples = 3) =>
	contentHash(item, `${PROBE_VERSION}/${samples}`);

export type JudgeCache = Record<string, Omit<JudgeResult, 'id'>>;
export type ProbeCache = Record<string, Omit<ProbeResult, 'id'>>;

export async function readCache<T>(name: 'cache-judge.json' | 'cache-probes.json'): Promise<T> {
	const file = Bun.file(`${JUDGE_ROOT}/${name}`);
	return (await file.exists()) ? file.json() : ({} as T);
}

export async function writeCache(name: 'cache-judge.json' | 'cache-probes.json', cache: object) {
	await Bun.write(`${JUDGE_ROOT}/${name}`, JSON.stringify(cache));
}

/** Stores results under their item's content key, dropping the per-run id. */
export function remember<I extends JudgeItem, R extends { id: string }>(
	cache: Record<string, object>,
	items: I[],
	results: R[],
	key: (item: I) => string
) {
	for (const { id, ...rest } of results) {
		const item = items.find((i) => i.id === id);
		if (item) cache[key(item)] = rest;
	}
}
