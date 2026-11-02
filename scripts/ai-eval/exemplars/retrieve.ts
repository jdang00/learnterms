// Offline exemplar retrieval over tmp/exemplar-bank/bank.json.
// import { createOfflineExemplarSource } from './exemplars/retrieve';
// const findExemplars = createOfflineExemplarSource(); await findExemplars({ questionType, objective });
import { readFileSync } from 'node:fs';
import {
	exemplarForTier,
	exemplarTiers,
	type Exemplar,
	type ExemplarSource
} from '../../../src/convex/questionStudio/exemplars';
import { cosine, queryText, selectDiverse } from '../../../src/convex/questionStudio/exemplarStats';
import { embedTexts } from './embeddings';
import { type BankEntry, DEFAULT_BANK_PATH } from './types';

export const DEFAULT_EXEMPLAR_LIMIT = 3;
/** Nearest neighbours considered before diversity selection. */
const CANDIDATE_POOL = 40;

type Options = {
	/** Tiers to retrieve from; `live` follows the production policy per question type. */
	tiers?: BankEntry['tier'][] | 'live';
};

export function toExemplar(entry: BankEntry): Exemplar {
	return {
		id: entry.id,
		questionType: entry.questionType,
		shape: entry.shape,
		subject: entry.subject,
		stem: entry.stem,
		options: entry.options,
		correctIndex: entry.correctIndex,
		rationale: exemplarForTier(entry, entry.tier).rationale,
		...(entry.stats ? { stats: entry.stats } : {}),
		...(entry.notes ? { notes: entry.notes } : {})
	};
}

export function createOfflineExemplarSource(
	bankPath = DEFAULT_BANK_PATH,
	options: Options = {}
): ExemplarSource {
	const live = options.tiers === 'live';
	const tiers = new Set(live ? ['top', 'design', 'standard'] : (options.tiers ?? ['top']));
	let loaded: Promise<{ entries: BankEntry[]; vectors: Float32Array[] }> | undefined;
	const load = () =>
		(loaded ??= (async () => {
			const entries = (JSON.parse(readFileSync(bankPath, 'utf8')) as BankEntry[]).filter((entry) =>
				tiers.has(entry.tier)
			);
			const vectors = await embedTexts(
				entries.map((entry) => entry.embedText),
				'bank'
			);
			return { entries, vectors };
		})());

	return async (query) => {
		const { entries, vectors } = await load();
		const [queryVector] = await embedTexts([queryText(query)], 'query');
		const exclude = new Set(query.exclude ?? []);
		const pool = entries
			.map((entry, index) => ({ entry, index }))
			.filter(
				({ entry }) =>
					entry.questionType === query.questionType &&
					!exclude.has(entry.id) &&
					(!live || exemplarTiers(query.questionType).includes(entry.tier))
			)
			.map(({ entry, index }) => ({
				entry,
				id: entry.id,
				subject: entry.subject,
				shape: entry.shape,
				quality: entry.quality,
				tier: entry.tier,
				similarity: cosine(queryVector, vectors[index])
			}))
			.sort((a, b) => b.similarity - a.similarity)
			.slice(0, CANDIDATE_POOL);
		return selectDiverse(
			pool,
			query.limit ?? DEFAULT_EXEMPLAR_LIMIT,
			live ? (item) => item.tier === 'top' : undefined
		).map(({ entry }) => toExemplar(entry));
	};
}

if (import.meta.main) {
	const [questionType = 'clinical', ...words] = process.argv.slice(2);
	const objective =
		words.join(' ') || 'Recognize acute angle-closure glaucoma from presenting signs';
	const source = createOfflineExemplarSource();
	const { formatExemplar } = await import('../../../src/convex/questionStudio/exemplars');
	for (const exemplar of await source({
		questionType: questionType as Exemplar['questionType'],
		objective
	})) {
		console.log(`${exemplar.id}\n${formatExemplar(exemplar)}\n`);
	}
}
