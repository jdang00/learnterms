import { expect, test } from 'bun:test';
import {
	agreement,
	cohenKappa,
	confusion,
	normalizeCriteria,
	scoreCriteria,
	CRITERIA,
	type Criteria,
	type Labeled
} from '../scripts/ai-eval/judge/criteria';
import { judgePrompt, parseJudgeOutput, shuffled } from '../scripts/ai-eval/judge/judge';
import {
	presentOptions,
	seedFor,
	unshuffle,
	type ProbeResult
} from '../scripts/ai-eval/judge/probes';
import {
	configFromEvalFile,
	evidenceFromPages,
	parseCandidatesMarkdown
} from '../scripts/ai-eval/judge/items';
import { expandLabel } from '../scripts/ai-eval/judge/anchors';
import { parseSpend, summarizeConfig, summarizeProbes } from '../scripts/ai-eval/judge/summary';

const allPass = (): Criteria =>
	Object.fromEntries(CRITERIA.map((key) => [key, 'pass'])) as Criteria;

test('normalizeCriteria forces type-scoped criteria to na and fills gaps', () => {
	const learn = normalizeCriteria(
		{ accurate: 'fail', twoRelationships: 'pass', bogus: 'x' },
		'learn'
	);
	expect(learn.accurate).toBe('fail');
	expect(learn.twoRelationships).toBe('na');
	expect(learn.necessaryDetail).toBe('na');
	expect(learn.coverTest).toBe('na');
	const ct = normalizeCriteria({ twoRelationships: 'fail' }, 'criticalThinking');
	expect(ct.twoRelationships).toBe('fail');
});

test('scoreCriteria weights gate criteria and caps inaccurate items', () => {
	expect(scoreCriteria(allPass())).toBe(1);
	const register = { ...allPass(), plainRegister: 'fail' as const };
	const conceded = { ...allPass(), noConcededAlternatives: 'fail' as const };
	expect(scoreCriteria(register)).toBeGreaterThan(scoreCriteria(conceded));
	expect(scoreCriteria({ ...allPass(), accurate: 'fail' })).toBeLessThanOrEqual(0.5);
	const allNa = Object.fromEntries(CRITERIA.map((k) => [k, 'na'])) as Criteria;
	expect(scoreCriteria(allNa)).toBe(0);
});

test('cohenKappa matches hand-computed values', () => {
	// 20 items: 7 agree yes, 8 agree no, 5 split; po = 0.75, pe = 0.5 → kappa 0.5.
	const m = confusion(['yes', 'no'] as const, [
		...Array(7).fill(['yes', 'yes']),
		...Array(3).fill(['yes', 'no']),
		...Array(2).fill(['no', 'yes']),
		...Array(8).fill(['no', 'no'])
	]);
	expect(m.counts).toEqual([
		[7, 3],
		[2, 8]
	]);
	expect(cohenKappa(m)).toBeCloseTo(0.5, 5);
	const perfect = confusion(['a', 'b'] as const, [
		['a', 'a'],
		['b', 'b']
	]);
	expect(cohenKappa(perfect)).toBe(1);
	expect(Number.isNaN(cohenKappa(confusion(['a'] as const, [])))).toBe(true);
});

test('agreement reports overall, good-decision and per-criterion numbers', () => {
	const label = (id: string, overall: Labeled['overall'], fails: string[] = []): Labeled => ({
		id,
		overall,
		criteria: { ...allPass(), ...Object.fromEntries(fails.map((f) => [f, 'fail'])) } as Criteria
	});
	const anchors = [label('a', 'good'), label('b', 'poor', ['nearMiss']), label('c', 'acceptable')];
	const judged = [
		label('a', 'good'),
		label('b', 'acceptable'),
		label('c', 'good', ['nearMiss']),
		label('extra', 'poor')
	];
	const r = agreement(anchors, judged);
	expect(r.items).toBe(3);
	expect(r.overall.exact).toBeCloseTo(1 / 3);
	expect(r.overall.withinOne).toBe(1);
	expect(r.overall.matrix.counts).toEqual([
		[1, 0, 0],
		[1, 0, 0],
		[0, 1, 0]
	]);
	expect(r.overall.good.precision).toBe(0.5);
	expect(r.overall.good.recall).toBe(1);
	const nearMiss = r.criteria.find((c) => c.key === 'nearMiss')!;
	expect(nearMiss).toMatchObject({ applicable: 3, missedFails: 1, extraFails: 1 });
	expect(nearMiss.agreement).toBeCloseTo(1 / 3);
});

test('judgePrompt hides ids and parseJudgeOutput maps refs back', () => {
	const items = [
		{
			id: 'pipeline-x:q1',
			questionType: 'learn' as const,
			stem: 'S1?',
			options: ['a', 'b'],
			answerIndex: 1,
			rationale: 'R1'
		},
		{
			id: 'human:jx7',
			questionType: 'clinical' as const,
			stem: 'S2?',
			options: ['c', 'd'],
			answerIndex: 0,
			rationale: 'R2',
			evidence: 'E2'
		}
	];
	const prompt = judgePrompt(items);
	expect(prompt).not.toContain('pipeline-x');
	expect(prompt).not.toContain('human:jx7');
	expect(prompt).toContain('2. b   <- key');
	expect(prompt).toContain('Source excerpts:\nE2');
	const entry = (ref: string, overall: 'good' | 'poor') => ({
		ref,
		analysis: '',
		defensibleOptions: [1],
		criteria: allPass(),
		overall,
		reasons: ['x', 'y', 'z', 'w', 'v']
	});
	const parsed = parseJudgeOutput(
		items,
		{ items: [entry('B', 'poor'), entry(' A ', 'good')] },
		0.1
	);
	expect(parsed.map((r) => [r.id, r.overall])).toEqual([
		['pipeline-x:q1', 'good'],
		['human:jx7', 'poor']
	]);
	expect(parsed[0].criteria.withholdLabel).toBe('na');
	expect(parsed[1].criteria.withholdLabel).toBe('pass');
	expect(parsed[0].reasons).toHaveLength(4);
	expect(parsed[0].costUsd).toBeCloseTo(0.05);
	expect(parseJudgeOutput(items, { items: [entry('A', 'good')] }, 0)).toHaveLength(1);
});

test('shuffles are seeded permutations and picks map back', () => {
	const values = [0, 1, 2, 3, 4];
	expect(shuffled(values, 3)).toEqual(shuffled(values, 3));
	expect([...shuffled(values, 3)].sort()).toEqual(values);
	const { order, text } = presentOptions(['w', 'x', 'y', 'z'], seedFor('item', 0));
	const firstShown = text.split('\n')[0].slice(3);
	expect(unshuffle(order, 1)).toBe(['w', 'x', 'y', 'z'].indexOf(firstShown));
	expect(unshuffle(order, 9)).toBe(-1);
	expect(seedFor('item', 0)).not.toBe(seedFor('item', 1));
});

test('parseCandidatesMarkdown reads the live-run dump format', () => {
	const md = `## 1 (p.4,3)\nWhich one?\n* Key\n- Other\nRationale (3w): Because it is.\n\n## 2\nSecond\nstem?\n- A\n* B\n- C\nRationale: R2\ncontinued.\n\n## 3 (p.1)\nNo key\n- A\n- B\n`;
	const parsed = parseCandidatesMarkdown(md);
	expect(parsed).toHaveLength(2);
	expect(parsed[0]).toEqual({
		index: 1,
		pages: [4, 3],
		stem: 'Which one?',
		options: ['Key', 'Other'],
		answerIndex: 0,
		rationale: 'Because it is.'
	});
	expect(parsed[1]).toMatchObject({
		stem: 'Second stem?',
		answerIndex: 1,
		rationale: 'R2 continued.'
	});
	const pages = [
		{ pageNumber: 3, text: 'three' },
		{ pageNumber: 4, text: 'four' }
	];
	expect(evidenceFromPages(pages, [4, 3])).toBe('[p4] four\n\n[p3] three');
});

test('configFromEvalFile groups repeats by config and harness version', () => {
	expect(
		configFromEvalFile('tmp/ai-eval/abc.sonnet-default-r2.question-types-v29.json', {
			config: 'sonnet-default-r2'
		})
	).toBe('sonnet-default@v29');
});

test('expandLabel defaults applicable criteria to pass and numbers to na', () => {
	const c = expandLabel(
		{
			id: 'x',
			src: {},
			overall: 'good',
			fail: ['nearMiss'],
			na: ['pertinentNegatives'],
			reasons: []
		},
		'learn'
	);
	expect(c.nearMiss).toBe('fail');
	expect(c.pertinentNegatives).toBe('na');
	expect(c.numbersUnits).toBe('na');
	expect(c.withholdLabel).toBe('na');
	expect(c.accurate).toBe('pass');
	expect(
		expandLabel(
			{ id: 'y', src: {}, overall: 'good', pass: ['numbersUnits'], reasons: [] },
			'clinical'
		).withholdLabel
	).toBe('pass');
});

test('summaries compute probe rates and $ per good question', () => {
	const probe = (id: string, hits: number, cover: boolean, blind: boolean): ProbeResult => ({
		id,
		optionsOnly: { samples: 3, hits, rate: hits / 3, chance: 0.25 },
		cover: { answer: '', verdict: cover ? 'match' : 'partial', match: cover },
		blind: { picked: 0, match: blind },
		costUsd: 0.001
	});
	const probes = [probe('a', 3, true, true), probe('b', 1, false, true)];
	const s = summarizeProbes(probes);
	expect(s.optionsOnlyRate).toBeCloseTo(2 / 3);
	expect(s.optionsOnlyLift).toBeCloseTo(2 / 3 - 0.25);
	expect(s.strongCueShare).toBe(0.5);
	expect(s.coverMatch).toBe(0.5);
	expect(s.coverMatchOrPartial).toBe(1);
	expect(s.blindMatch).toBe(1);
	const judge = (id: string, overall: 'good' | 'acceptable' | 'poor') => ({
		id,
		criteria: allPass(),
		overall,
		score: overall === 'good' ? 1 : 0.5,
		reasons: [],
		costUsd: 0.02
	});
	const row = summarizeConfig(
		'cfg',
		[judge('a', 'good'), judge('b', 'acceptable'), judge('c', 'poor')],
		probes,
		{
			items: 4,
			slots: 6,
			spendUsd: 0.6
		}
	);
	expect(row).toMatchObject({ good: 1, acceptable: 1, poor: 1, judged: 3, items: 4, slots: 6 });
	expect(row.perGoodUsd).toBeCloseTo(0.6);
	expect(row.perUsableUsd).toBeCloseTo(0.3);
	expect(row.judgeCostUsd).toBeCloseTo(0.06);
	expect(
		summarizeConfig('none', [judge('p', 'poor')], [], { items: 1, spendUsd: 1 }).perGoodUsd
	).toBe(Infinity);
	expect(summarizeConfig('free', [], [], { items: 0 }).perGoodUsd).toBeUndefined();
});

test('parseSpend reads config=usd pairs and skips junk', () => {
	expect(parseSpend('a@v29=0.65, b=0.28,bad,c=x')).toEqual({ 'a@v29': 0.65, b: 0.28 });
	expect(parseSpend(undefined)).toEqual({});
});
