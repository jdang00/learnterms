import { describe, expect, test } from 'bun:test';
import {
	MIN_DISCRIMINATION_RESPONDERS,
	computeItemStats,
	earliestPerLearner,
	moduleTotals,
	pointBiserial,
	restScoresForModule,
	scoreExemplar,
	scoreQuality,
	selectDiverse,
	textFingerprint
} from '../src/convex/questionStudio/exemplarStats';
import {
	addressedDistractors,
	classifyQuestionType,
	classifyShape,
	exemplarRejection,
	scoreRubric,
	type RawQuestion
} from '../src/convex/questionStudio/exemplarText';
import { exemplarForTier, formatExemplar } from '../src/convex/questionStudio/exemplars';

function pearson(x: number[], y: number[]) {
	const mx = x.reduce((a, b) => a + b, 0) / x.length;
	const my = y.reduce((a, b) => a + b, 0) / y.length;
	let num = 0;
	let dx = 0;
	let dy = 0;
	for (let i = 0; i < x.length; i++) {
		num += (x[i] - mx) * (y[i] - my);
		dx += (x[i] - mx) ** 2;
		dy += (y[i] - my) ** 2;
	}
	return num / Math.sqrt(dx * dy);
}

describe('point-biserial', () => {
	test('matches the hand-computed value and Pearson r', () => {
		const item = [true, true, false, false];
		const score = [0.9, 0.8, 0.4, 0.2];
		const r = pointBiserial(item, score)!;
		expect(r).toBeCloseTo(0.9611, 4);
		expect(r).toBeCloseTo(pearson([1, 1, 0, 0], score), 10);
	});

	test('is undefined without variance in either variable', () => {
		expect(pointBiserial([true, true, true], [0.1, 0.5, 0.9])).toBeUndefined();
		expect(pointBiserial([true, false, true], [0.5, 0.5, 0.5])).toBeUndefined();
	});
});

describe('item statistics', () => {
	const optionIds = ['a', 'b', 'c', 'd'];

	test('difficulty and option shares come from responders', () => {
		const stats = computeItemStats({
			optionIds,
			correctId: 'a',
			responses: [
				{ userId: 'u1', selected: ['a'], correct: true },
				{ userId: 'u2', selected: ['a'], correct: true },
				{ userId: 'u3', selected: ['b'], correct: false },
				{ userId: 'u4', selected: ['c'], correct: false },
				{ userId: 'u5', selected: [], correct: false }
			]
		})!;
		expect(stats.responders).toBe(4);
		expect(stats.difficulty).toBe(0.5);
		expect(stats.optionShares).toEqual([0.5, 0.25, 0.25, 0]);
		expect(stats.functionalDistractors).toBe(2);
		expect(stats.discrimination).toBeUndefined();
	});

	test('discrimination correlates with accuracy on the rest of the module', () => {
		const responses = Array.from({ length: MIN_DISCRIMINATION_RESPONDERS + 1 }, (_, i) => ({
			userId: `u${i}`,
			selected: [i % 2 === 0 ? 'a' : 'b'],
			correct: i % 2 === 0
		}));
		const restScores = new Map(
			responses.map((response, i) => [
				response.userId,
				// Strong learners answered this item right; totals include this item.
				{ correct: (response.correct ? 8 : 3) + (response.correct ? 1 : 0) + (i % 3), total: 11 }
			])
		);
		const stats = computeItemStats({ optionIds, correctId: 'a', responses, restScores })!;
		const rest = responses.map((response, i) => {
			const total = restScores.get(response.userId)!;
			return (total.correct - (response.correct ? 1 : 0)) / (total.total - 1) + 0 * i;
		});
		expect(stats.discriminationResponders).toBe(responses.length);
		expect(stats.discrimination).toBeCloseTo(
			pearson(
				responses.map((response) => (response.correct ? 1 : 0)),
				rest
			),
			10
		);
		expect(stats.discrimination!).toBeGreaterThan(0.8);
	});

	test('discrimination needs enough responders with a rest score', () => {
		const responses = Array.from({ length: MIN_DISCRIMINATION_RESPONDERS - 1 }, (_, i) => ({
			userId: `u${i}`,
			selected: ['a'],
			correct: i % 2 === 0
		}));
		const restScores = new Map(responses.map((r) => [r.userId, { correct: 5, total: 10 }]));
		expect(
			computeItemStats({ optionIds, correctId: 'a', responses, restScores })!.discrimination
		).toBeUndefined();
	});

	test('first attempts and module totals', () => {
		const first = earliestPerLearner([
			{ userId: 'u1', questionId: 'q1', moduleId: 'm', at: 5, correct: true },
			{ userId: 'u1', questionId: 'q1', moduleId: 'm', at: 2, correct: false },
			{ userId: 'u1', questionId: 'q2', moduleId: 'm', at: 3, correct: true },
			{ userId: 'u2', questionId: 'q1', moduleId: 'n', at: 1, correct: true }
		]);
		expect(first.get('u1:q1')!.correct).toBe(false);
		const totals = moduleTotals(first.values());
		expect(totals.get('m:u1')).toEqual({ correct: 1, total: 2 });
		expect(restScoresForModule(totals, 'n')).toEqual(new Map([['u2', { correct: 1, total: 1 }]]));
	});
});

describe('classifier heuristics', () => {
	test('question type', () => {
		expect(classifyQuestionType('Which receptor does phenylephrine target in the eye?')).toBe(
			'learn'
		);
		expect(
			classifyQuestionType(
				'A 43-year-old man presents with a red eye along the temporal bulbar conjunctiva for 3 days with no discharge. What is your diagnosis?'
			)
		).toBe('clinical');
		expect(
			classifyQuestionType(
				'A 44-year-old nurse presents with a swollen red eyelid that worsened over two days. No fever, no pain on eye movement. She reports a sulfa allergy. Which oral medication would be the best choice to treat her?'
			)
		).toBe('criticalThinking');
	});

	test('shape', () => {
		expect(
			classifyShape(
				'Which of the following medications should you avoid in this patient?',
				['a', 'b', 'c', 'd'],
				'clinical'
			)
		).toBe('contraindication');
		expect(
			classifyShape(
				'Which test would differentiate a ptosis from a pseudoptosis?',
				['MRD-1', 'MRD-2', 'Levator function', 'Palpebral fissure'],
				'learn'
			)
		).toBe('test-purpose');
		expect(
			classifyShape(
				'Which central corneal thickness should flag glaucoma suspicion?',
				['480 µm', '530 µm', '580 µm', '620 µm'],
				'learn'
			)
		).toBe('threshold-use');
		expect(
			classifyShape(
				'A 10-year-old boy presents with bilateral anterior uveitis. What is the most likely diagnosis?',
				['JIA', 'AS', 'Behcet', 'Reactive arthritis'],
				'clinical'
			)
		).toBe('diagnosis-from-findings');
		expect(
			classifyShape(
				'Stimulation of which receptor lowers IOP by decreasing aqueous production?',
				['alpha-1', 'alpha-2', 'beta-1', 'beta-2'],
				'learn'
			)
		).toBe('mechanism-effect');
	});
});

describe('rubric and gates', () => {
	const item = {
		stem: 'Stimulation of what receptor in the eye is most likely to lower IOP by decreasing aqueous production?',
		options: ['alpha-2', 'beta-1 and 2', 'alpha-1', 'muscarinic M3'],
		correctIndex: 0,
		rationale:
			'Stimulation of alpha-2 receptors decreases aqueous production, as with brimonidine. Alpha-1 stimulation contracts the radial iris dilator. Beta-1 and 2 stimulation increases aqueous production, which is why beta-blockers such as timolol lower IOP. Muscarinic M3 agonists increase outflow rather than reduce production.',
		questionType: 'learn' as const
	};

	test('counts distractors the rationale answers', () => {
		expect(addressedDistractors(item.rationale, item.options, 0)).toBe(3);
		expect(addressedDistractors('Alpha-2 agonists reduce production.', item.options, 0)).toBe(0);
	});

	test('a strong item passes every gate; letters, all-of-the-above and incomplete stems fail', () => {
		const rubric = scoreRubric(item);
		expect(rubric).toMatchObject({
			completeQuestion: true,
			parallelOptions: true,
			noAllNone: true,
			noLetters: true,
			plainRegister: true
		});
		expect(scoreQuality({ rubric, firstAttempt: null }).gatesPassed).toBe(true);
		const weak = scoreRubric({
			...item,
			stem: 'Which of the following is true?',
			options: ['A. alpha-2', 'B. beta-1', 'C. alpha-1', 'All of the above']
		});
		expect(weak.completeQuestion).toBe(false);
		expect(weak.noLetters).toBe(false);
		expect(weak.noAllNone).toBe(false);
	});

	test('measured items outrank unmeasured ones; negative discrimination fails', () => {
		const rubric = scoreRubric(item);
		const measured = {
			responders: 20,
			difficulty: 0.6,
			optionShares: [0.6, 0.2, 0.15, 0.05],
			functionalDistractors: 3,
			discrimination: 0.3,
			discriminationResponders: 20
		};
		const unmeasured = scoreQuality({ rubric, firstAttempt: null });
		const good = scoreQuality({ rubric, firstAttempt: measured });
		expect(good.score).toBeGreaterThan(unmeasured.score);
		const bad = scoreQuality({ rubric, firstAttempt: { ...measured, discrimination: -0.2 } });
		expect(bad.failedGates).toContain('negative-discrimination');
	});

	test('screen rejects AI, image-dependent and multi-select questions', () => {
		const base: RawQuestion = {
			_id: 'q',
			type: 'multiple_choice',
			status: 'published',
			stem: '<p>Which receptor lowers IOP by decreasing aqueous production?</p>',
			options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: id.toUpperCase() })),
			correctAnswers: ['a'],
			rationale:
				'Alpha-2 stimulation reduces aqueous production while beta stimulation increases it.',
			aiGenerated: false,
			metadata: {}
		};
		expect(exemplarRejection(base, { className: 'Glaucoma' })).toBeNull();
		expect(exemplarRejection({ ...base, aiGenerated: true }, {})).toBe('ai-generated');
		expect(exemplarRejection({ ...base, metadata: { generation: {} } }, {})).toBe('ai-generated');
		expect(exemplarRejection({ ...base, correctAnswers: ['a', 'b'] }, {})).toBe('multi-select');
		expect(
			exemplarRejection({ ...base, stem: 'What is shown in the following picture?' }, {})
		).toBe('media');
		expect(exemplarRejection(base, { className: 'Low Vision' })).toBe('provenance');
	});
});

test('diversity selection spreads subjects and shapes', () => {
	const candidates = [
		{ id: '1', subject: 'A', shape: 'x', similarity: 0.9, quality: 0.8 },
		{ id: '2', subject: 'A', shape: 'x', similarity: 0.89, quality: 0.8 },
		{ id: '3', subject: 'B', shape: 'y', similarity: 0.86, quality: 0.8 }
	];
	expect(selectDiverse(candidates, 2).map((c) => c.id)).toEqual(['1', '3']);
	expect(textFingerprint('abc')).toBe(textFingerprint('abc'));
	expect(textFingerprint('abc')).not.toBe(textFingerprint('abd'));
});

test('selection anchors on the best top-tier candidate first', () => {
	const candidates = [
		{ id: '1', subject: 'A', shape: 'x', similarity: 0.95, quality: 0.6, tier: 'design' },
		{ id: '2', subject: 'B', shape: 'y', similarity: 0.9, quality: 0.6, tier: 'design' },
		{ id: '3', subject: 'C', shape: 'z', similarity: 0.7, quality: 0.8, tier: 'top' }
	];
	const top = (c: { tier: string }) => c.tier === 'top';
	expect(selectDiverse(candidates, 2, top).map((c) => c.id)).toEqual(['3', '1']);
	expect(selectDiverse(candidates.slice(0, 2), 2, top).map((c) => c.id)).toEqual(['1', '2']);
});

test('items failing only the rationale gate become design exemplars without a rationale', () => {
	const text = {
		stem: 'Which type of acuity uses a thin wire in order to test contrast threshold?',
		options: ['Resolution', 'Detection', 'Vernier', 'Gross'],
		correctIndex: 1,
		rationale:
			'Detection acuity is concerned with the smallest object visible. Against a uniform background a wire is easily seen, but as the subject moves away its spatial frequency rises, contrast falls past the MTF cutoff and it disappears.'
	};
	const scored = scoreExemplar(text, { questionType: 'learn' }, null);
	expect(scored.quality.failedGates).toEqual(['rationale-skips-distractors']);
	expect(scored.tier).toBe('design');
	expect(scored.notes).not.toContain('rationale');
	const shown = exemplarForTier(
		{
			id: 'q',
			questionType: 'learn' as const,
			shape: 'test-purpose',
			subject: 'Vision Science',
			...text
		},
		scored.tier
	);
	expect(formatExemplar(shown)).not.toContain('Rationale:');
	expect(formatExemplar({ ...shown, rationale: text.rationale })).toContain('Rationale:');
});
