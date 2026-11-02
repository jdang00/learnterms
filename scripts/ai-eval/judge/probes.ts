// Cheap objective cue probes with Haiku: options-only, cover test, blind solve.
import { z } from 'zod/v4';
import { callClaude, PROBE_MODEL, pool } from './claude';
import type { JudgeItem } from './criteria';
import { shuffled } from './judge';

export const PROBE_VERSION = 'probes-v1';

export type CoverVerdict = 'match' | 'partial' | 'no';
export type ProbeResult = {
	id: string;
	optionsOnly: { samples: number; hits: number; rate: number; chance: number };
	cover: { answer: string; verdict: CoverVerdict; match: boolean } | null;
	blind: { picked: number; match: boolean } | null;
	costUsd: number;
};

const SYSTEM =
	'You are a strong health-professions student taking a practice exam. Answer exactly as asked.';
const choiceSchema = z.object({ choice: z.number().int() });
const answerSchema = z.object({ answer: z.string() });
const gradeSchema = z.object({ verdict: z.enum(['match', 'partial', 'no']) });

const listed = (options: string[]) => options.map((o, i) => `${i + 1}. ${o}`).join('\n');

/** Presents options in a seeded order; returns the order so a pick maps back to the original index. */
export function presentOptions(options: string[], seed: number) {
	const order = shuffled(
		options.map((_, i) => i),
		seed
	);
	return { order, text: listed(order.map((i) => options[i])) };
}

/** Maps a 1-based pick in the shuffled list back to an original index (-1 when out of range). */
export function unshuffle(order: number[], choice: number) {
	return order[choice - 1] ?? -1;
}

export function optionsOnlyPrompt(text: string) {
	return `The question stem of this multiple-choice item is hidden. Using only the answer options below, pick the one most likely to be the keyed correct answer. Use any cue you notice: wording, length, specificity, how the options relate to each other, or your own knowledge.\n\nOptions:\n${text}\n\nReturn the option number.`;
}

export function coverPrompt(stem: string) {
	return `Answer this exam question in at most 15 words. The answer options are hidden, so give the specific answer itself, not an explanation.\n\nQuestion: ${stem}`;
}

export function gradePrompt(item: JudgeItem, answer: string) {
	return `A student answered an exam question without seeing the options. Decide whether their answer names the same thing as the keyed option.\n\nQuestion: ${item.stem}\nOptions:\n${listed(item.options)}\nKeyed option: ${item.answerIndex + 1}. ${item.options[item.answerIndex]}\nStudent answer: ${answer}\n\nReply match if the answer clearly corresponds to the keyed option rather than any other option, partial if it overlaps the key but is incomplete or also fits another option, and no otherwise.`;
}

export function blindPrompt(stem: string, text: string) {
	return `Answer this multiple-choice question.\n\nQuestion: ${stem}\nOptions:\n${text}\n\nReturn the number of the single best answer.`;
}

/** Hash-derived seed so every item and sample gets its own stable option order. */
export function seedFor(id: string, sample: number) {
	let h = 2166136261;
	for (const ch of `${id}#${sample}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
	return h >>> 0;
}

export type ProbeOptions = {
	samples?: number;
	concurrency?: number;
	cover?: boolean;
	blind?: boolean;
};

export async function probeItems(
	items: JudgeItem[],
	opts: ProbeOptions = {}
): Promise<ProbeResult[]> {
	const samples = opts.samples ?? 3;
	const ask = <T extends z.ZodType>(stage: string, prompt: string, schema: T) =>
		callClaude({
			stage,
			model: PROBE_MODEL,
			effort: 'low',
			system: SYSTEM,
			prompt,
			schema,
			maxOutputTokens: 2000,
			timeoutMs: 90_000
		});
	const results = await pool(items, opts.concurrency ?? 8, async (item) => {
		let costUsd = 0;
		let hits = 0;
		let done = 0;
		for (let s = 0; s < samples; s++) {
			const { order, text } = presentOptions(item.options, seedFor(item.id, s));
			try {
				const r = await ask('probe-options', optionsOnlyPrompt(text), choiceSchema);
				costUsd += r.costUsd;
				done++;
				if (unshuffle(order, r.object.choice) === item.answerIndex) hits++;
			} catch (error) {
				console.error(`  options-only ${item.id}: ${(error as Error).message}`);
			}
		}
		let cover: ProbeResult['cover'] = null;
		if (opts.cover !== false) {
			try {
				const a = await ask('probe-cover', coverPrompt(item.stem), answerSchema);
				const g = await ask('probe-grade', gradePrompt(item, a.object.answer), gradeSchema);
				costUsd += a.costUsd + g.costUsd;
				cover = {
					answer: a.object.answer,
					verdict: g.object.verdict,
					match: g.object.verdict === 'match'
				};
			} catch (error) {
				console.error(`  cover ${item.id}: ${(error as Error).message}`);
			}
		}
		let blind: ProbeResult['blind'] = null;
		if (opts.blind !== false) {
			const { order, text } = presentOptions(item.options, seedFor(item.id, 99));
			try {
				const r = await ask('probe-blind', blindPrompt(item.stem, text), choiceSchema);
				costUsd += r.costUsd;
				const picked = unshuffle(order, r.object.choice);
				blind = { picked, match: picked === item.answerIndex };
			} catch (error) {
				console.error(`  blind ${item.id}: ${(error as Error).message}`);
			}
		}
		return {
			id: item.id,
			optionsOnly: {
				samples: done,
				hits,
				rate: done ? hits / done : Number.NaN,
				chance: 1 / item.options.length
			},
			cover,
			blind,
			costUsd
		} satisfies ProbeResult;
	});
	return results.flatMap((r) => (r ? [r] : []));
}
