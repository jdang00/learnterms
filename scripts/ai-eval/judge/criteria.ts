// Rubric keys and pure scoring/agreement math for the quality judge. No provider calls here.
// Criteria follow dev/benchmarks/question-studio/2026-10-28-claude/human-exemplars.md, plus `accurate`.

export type QuestionType = 'learn' | 'clinical' | 'criticalThinking';
export type Mark = 'pass' | 'fail' | 'na';
export type Overall = 'good' | 'acceptable' | 'poor';

export const CRITERIA = [
	'accurate',
	'coverTest',
	'necessaryDetail',
	'withholdLabel',
	'pertinentNegatives',
	'homogeneousOptions',
	'nearMiss',
	'excludableDistractors',
	'rationale',
	'noConcededAlternatives',
	'numbersUnits',
	'twoRelationships',
	'plainRegister'
] as const;
export type CriterionKey = (typeof CRITERIA)[number];
export type Criteria = Record<CriterionKey, Mark>;

export const OVERALLS: readonly Overall[] = ['good', 'acceptable', 'poor'];

export type JudgeItem = {
	id: string;
	questionType: QuestionType;
	stem: string;
	options: string[];
	answerIndex: number;
	rationale: string;
	evidence?: string;
};

export type JudgeResult = {
	id: string;
	criteria: Criteria;
	overall: Overall;
	/** 0–1, weighted share of applicable criteria passed (see scoreCriteria). */
	score: number;
	reasons: string[];
	costUsd: number;
};

/** Criteria that only apply to some question types; the judge's mark is overridden to `na` elsewhere. */
const TYPE_SCOPE: Partial<Record<CriterionKey, QuestionType[]>> = {
	necessaryDetail: ['clinical', 'criticalThinking'],
	withholdLabel: ['clinical', 'criticalThinking'],
	twoRelationships: ['criticalThinking']
};

export function appliesTo(key: CriterionKey, type: QuestionType) {
	return TYPE_SCOPE[key]?.includes(type) ?? true;
}

/** Forces type-scoped criteria to `na` and fills any missing key with `na`. */
export function normalizeCriteria(raw: Partial<Record<string, string>>, type: QuestionType) {
	return Object.fromEntries(
		CRITERIA.map((key) => {
			const mark = raw[key];
			const valid = mark === 'pass' || mark === 'fail' || mark === 'na' ? mark : 'na';
			return [key, appliesTo(key, type) ? valid : 'na'];
		})
	) as Criteria;
}

// Gate criteria decide whether an item is usable at all, so they weigh more.
export const WEIGHTS: Record<CriterionKey, number> = {
	accurate: 3,
	coverTest: 1.5,
	necessaryDetail: 1,
	withholdLabel: 1,
	pertinentNegatives: 1,
	homogeneousOptions: 1.5,
	nearMiss: 1.5,
	excludableDistractors: 2,
	rationale: 1,
	noConcededAlternatives: 2,
	numbersUnits: 1,
	twoRelationships: 1,
	plainRegister: 0.5
};

/** Weighted pass share over applicable criteria; an inaccurate item is capped at half. */
export function scoreCriteria(criteria: Criteria) {
	let total = 0;
	let passed = 0;
	for (const key of CRITERIA) {
		if (criteria[key] === 'na') continue;
		total += WEIGHTS[key];
		if (criteria[key] === 'pass') passed += WEIGHTS[key];
	}
	const share = total ? passed / total : 0;
	return criteria.accurate === 'fail' ? Math.min(share, 0.5) : share;
}

// ---------- Agreement ----------

export type Confusion<T extends string> = { labels: readonly T[]; counts: number[][] };

export function confusion<T extends string>(
	labels: readonly T[],
	pairs: Array<[expected: T, actual: T]>
): Confusion<T> {
	const counts = labels.map(() => labels.map(() => 0));
	for (const [expected, actual] of pairs) {
		const row = labels.indexOf(expected);
		const col = labels.indexOf(actual);
		if (row >= 0 && col >= 0) counts[row][col]++;
	}
	return { labels, counts };
}

/** Cohen's kappa; `weighted` uses linear weights for ordinal labels. Returns NaN with no pairs. */
export function cohenKappa<T extends string>(matrix: Confusion<T>, weighted = false) {
	const k = matrix.labels.length;
	const n = matrix.counts.flat().reduce((a, b) => a + b, 0);
	if (!n) return Number.NaN;
	const rows = matrix.counts.map((row) => row.reduce((a, b) => a + b, 0));
	const cols = matrix.labels.map((_, j) => matrix.counts.reduce((s, row) => s + row[j], 0));
	const weight = (i: number, j: number) =>
		weighted ? 1 - Math.abs(i - j) / Math.max(1, k - 1) : i === j ? 1 : 0;
	let observed = 0;
	let expected = 0;
	for (let i = 0; i < k; i++)
		for (let j = 0; j < k; j++) {
			observed += (weight(i, j) * matrix.counts[i][j]) / n;
			expected += (weight(i, j) * rows[i] * cols[j]) / (n * n);
		}
	return expected === 1 ? (observed === 1 ? 1 : 0) : (observed - expected) / (1 - expected);
}

export function accuracyOf<T extends string>(matrix: Confusion<T>) {
	const n = matrix.counts.flat().reduce((a, b) => a + b, 0);
	return n ? matrix.labels.reduce((s, _, i) => s + matrix.counts[i][i], 0) / n : Number.NaN;
}

export type Labeled = { id: string; criteria: Criteria; overall: Overall };

export type CriterionAgreement = {
	key: CriterionKey;
	/** Items where both sides marked pass/fail. */
	applicable: number;
	agreement: number;
	kappa: number;
	/** Items where exactly one side said `na`. */
	naMismatch: number;
	/** Anchor said fail, judge said pass: the judge is too lenient here. */
	missedFails: number;
	/** Anchor said pass, judge said fail. */
	extraFails: number;
};

export type AgreementReport = {
	items: number;
	overall: {
		exact: number;
		withinOne: number;
		kappa: number;
		weightedKappa: number;
		matrix: Confusion<Overall>;
		/** Binary "good" decision, which drives $ per good question. */
		good: { agreement: number; precision: number; recall: number; kappa: number };
	};
	criteria: CriterionAgreement[];
};

export function agreement(anchors: Labeled[], results: Labeled[]): AgreementReport {
	const byId = new Map(results.map((r) => [r.id, r]));
	const pairs = anchors.flatMap((a) => {
		const r = byId.get(a.id);
		return r ? [[a, r] as const] : [];
	});
	const matrix = confusion(
		OVERALLS,
		pairs.map(([a, r]) => [a.overall, r.overall])
	);
	const withinOne =
		pairs.filter(
			([a, r]) => Math.abs(OVERALLS.indexOf(a.overall) - OVERALLS.indexOf(r.overall)) <= 1
		).length / Math.max(1, pairs.length);
	const goodPairs = pairs.map(
		([a, r]) =>
			[a.overall === 'good' ? 'good' : 'other', r.overall === 'good' ? 'good' : 'other'] as [
				'good' | 'other',
				'good' | 'other'
			]
	);
	const goodMatrix = confusion(['good', 'other'] as const, goodPairs);
	const [[tp, fn], [fp]] = goodMatrix.counts;
	const criteria = CRITERIA.map((key): CriterionAgreement => {
		const both = pairs.filter(([a, r]) => a.criteria[key] !== 'na' && r.criteria[key] !== 'na');
		const m = confusion(
			['pass', 'fail'] as const,
			both.map(([a, r]) => [a.criteria[key], r.criteria[key]] as ['pass' | 'fail', 'pass' | 'fail'])
		);
		return {
			key,
			applicable: both.length,
			agreement: accuracyOf(m),
			kappa: cohenKappa(m),
			naMismatch: pairs.filter(
				([a, r]) => (a.criteria[key] === 'na') !== (r.criteria[key] === 'na')
			).length,
			missedFails: m.counts[1][0],
			extraFails: m.counts[0][1]
		};
	});
	return {
		items: pairs.length,
		overall: {
			exact: accuracyOf(matrix),
			withinOne,
			kappa: cohenKappa(matrix),
			weightedKappa: cohenKappa(matrix, true),
			matrix,
			good: {
				agreement: accuracyOf(goodMatrix),
				precision: tp + fp ? tp / (tp + fp) : Number.NaN,
				recall: tp + fn ? tp / (tp + fn) : Number.NaN,
				kappa: cohenKappa(goodMatrix)
			}
		},
		criteria
	};
}

const pct = (value: number) => (Number.isNaN(value) ? '–' : `${(value * 100).toFixed(0)}%`);
const fixed = (value: number) => (Number.isNaN(value) ? '–' : value.toFixed(2));

export function formatAgreement(report: AgreementReport) {
	const { overall } = report;
	const lines = [
		`Items: ${report.items}`,
		`Overall exact ${pct(overall.exact)}, within one ${pct(overall.withinOne)}, kappa ${fixed(overall.kappa)}, weighted kappa ${fixed(overall.weightedKappa)}`,
		`"Good" decision: agreement ${pct(overall.good.agreement)}, precision ${pct(overall.good.precision)}, recall ${pct(overall.good.recall)}, kappa ${fixed(overall.good.kappa)}`,
		'',
		'| Anchor \\ Judge | good | acceptable | poor |',
		'| --- | --- | --- | --- |',
		...overall.matrix.labels.map(
			(label, i) => `| ${label} | ${overall.matrix.counts[i].join(' | ')} |`
		),
		'',
		'| Criterion | Both applicable | Agreement | Kappa | Missed fails | Extra fails | na mismatch |',
		'| --- | --- | --- | --- | --- | --- | --- |',
		...report.criteria.map(
			(c) =>
				`| ${c.key} | ${c.applicable} | ${pct(c.agreement)} | ${fixed(c.kappa)} | ${c.missedFails} | ${c.extraFails} | ${c.naMismatch} |`
		)
	];
	return lines.join('\n');
}
