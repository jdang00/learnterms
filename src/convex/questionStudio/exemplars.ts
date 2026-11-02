import type { QuestionType } from './questionTypes';

/** A curator-written question with the student response statistics that make it worth imitating. */
export type Exemplar = {
	id: string;
	questionType: QuestionType;
	/** e.g. mechanism-effect, test-purpose, threshold-use, diagnosis-from-findings,
	 * contraindication, constraint-application, parallel-causes. */
	shape: string;
	subject: string;
	stem: string;
	options: string[];
	correctIndex: number;
	rationale: string;
	stats?: {
		responders: number;
		/** Share of first attempts that were correct. */
		difficulty: number;
		/** Point-biserial against each learner's module accuracy. */
		discrimination?: number;
		/** Share of first attempts choosing each option, in option order. */
		optionShares?: number[];
	};
	/** Why this item is a good model, in one or two short clauses. */
	notes?: string;
};

export type ExemplarQuery = {
	questionType: QuestionType;
	objective: string;
	/** Short evidence text, used only for subject similarity. */
	context?: string;
	limit?: number;
	/** Exclude these exemplar ids, e.g. ones already shown in this run. */
	exclude?: string[];
};

export type ExemplarSource = (query: ExemplarQuery) => Promise<Exemplar[]>;

export type ExemplarTier = 'top' | 'design' | 'standard';

/**
 * Tiers to retrieve per type. Critical thinking has few top items, so it also draws on the rest.
 * Design rows for Learn and Clinical were no better than top-only in the v36 eval.
 */
export function exemplarTiers(questionType: QuestionType): ExemplarTier[] {
	return questionType === 'criticalThinking' ? ['top', 'design', 'standard'] : ['top'];
}

/** Design-tier rows fail only the rationale gate, so the drafter sees their stem and options alone. */
export function exemplarForTier<T extends Exemplar>(exemplar: T, tier: ExemplarTier): T {
	return tier === 'design' ? { ...exemplar, rationale: '' } : exemplar;
}

/** Compact rendering for prompts and tool results: structure and statistics, not a template to copy. */
export function formatExemplar(exemplar: Exemplar) {
	const shares = exemplar.stats?.optionShares;
	const options = exemplar.options
		.map((option, index) => {
			const mark = index === exemplar.correctIndex ? '*' : '-';
			const share = shares?.[index] !== undefined ? ` (${Math.round(shares[index] * 100)}%)` : '';
			return `${mark} ${option}${share}`;
		})
		.join('\n');
	const stats = exemplar.stats
		? `Students: ${exemplar.stats.responders}, ${Math.round(exemplar.stats.difficulty * 100)}% correct${
				exemplar.stats.discrimination !== undefined
					? `, discrimination ${exemplar.stats.discrimination.toFixed(2)}`
					: ''
			}.`
		: '';
	const rationale = exemplar.rationale ? `\nRationale: ${exemplar.rationale}` : '';
	return `[${exemplar.questionType} · ${exemplar.shape} · ${exemplar.subject}] ${stats}\n${exemplar.stem}\n${options}${rationale}${exemplar.notes ? `\nWhy it works: ${exemplar.notes}` : ''}`;
}
