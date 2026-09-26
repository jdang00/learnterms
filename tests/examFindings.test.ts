import { expect, test } from 'bun:test';
import { EXAM_LAYOUTS, EXAM_TESTS, layoutKeys } from '../src/lib/examFindings/catalog';
import {
	applyNormalValues,
	defaultExamValues,
	mirrorOdToOs,
	mirrorPairs,
	normalExamValues,
	normalizeExamFindings,
	sampleExamFinding,
	type ExamFinding
} from '../src/lib/examFindings/findings';
import {
	combineCoverDeviation,
	combinePrism,
	coverCorrectionValues,
	coverDeviationParts,
	effectiveField,
	fieldChoices,
	formatExamValue,
	prismParts,
	toggleCoverCorrection
} from '../src/lib/examFindings/input';
import { buildExamFindingView } from '../src/lib/examFindings/view';

test('test ids are unique and every layout has unique, storable keys', () => {
	expect(new Set(EXAM_TESTS.map((entry) => entry.id)).size).toBe(EXAM_TESTS.length);
	for (const [name, layout] of Object.entries(EXAM_LAYOUTS)) {
		const keys = layoutKeys(layout);
		expect(keys.length, name).toBeGreaterThan(0);
		expect(new Set(keys).size, name).toBe(keys.length);
		for (const key of keys) expect(key, name).toMatch(/^[a-zA-Z][\w.]*$/);
	}
});

test('an OU row can be limited to the columns it records', () => {
	const manifest = EXAM_TESTS.find((entry) => entry.id === 'manifest')!;
	const keys = layoutKeys(manifest.layout);
	expect(keys).toContain('ou.va');
	expect(keys).not.toContain('ou.sphere');
	const view = buildExamFindingView({
		test: 'manifest',
		values: { 'od.sphere': '-1.00', 'ou.va': '20', 'ou.sphere': 'ignored' }
	})!;
	const grid = view.sections[0];
	if (grid.kind !== 'grid') throw new Error('expected grid');
	expect(grid.rows.find((row) => row.label === 'OU')?.cells[0]).toEqual({ value: '' });
});

test('tests that share a layout share their value keys', () => {
	const manifest = EXAM_TESTS.find((entry) => entry.id === 'manifest')!;
	const cycloplegic = EXAM_TESTS.find((entry) => entry.id === 'cycloplegic')!;
	expect(layoutKeys(manifest.layout)).toEqual(layoutKeys(cycloplegic.layout));
	const tonometers = EXAM_TESTS.filter((entry) => ['gat', 'icare', 'tonopen'].includes(entry.id));
	expect(new Set(tonometers.map((entry) => entry.layout)).size).toBe(1);
});

test('every test has a sample preview', () => {
	for (const entry of EXAM_TESTS)
		expect(buildExamFindingView(sampleExamFinding(entry)), entry.id).not.toBeNull();
});

test('normalizing trims values, drops unknown keys and empty boxes, and keeps real renames', () => {
	expect(normalizeExamFindings(undefined)).toBeUndefined();
	expect(normalizeExamFindings([{ test: 'npc', values: { break: '  ' } }])).toBeUndefined();
	expect(
		normalizeExamFindings([
			{ test: 'npc', title: 'NPC', values: { break: ' 6 ', bogus: '1' } },
			{ test: 'retinoscopy', title: ' Ret (dry) ', values: { 'od.sphere': '-1.00' } }
		])
	).toEqual([
		{ test: 'npc', values: { break: '6' } },
		{ test: 'retinoscopy', title: 'Ret (dry)', values: { 'od.sphere': '-1.00' } }
	]);
	expect(() => normalizeExamFindings([{ test: 'nope', values: {} }])).toThrow('Unknown');
	expect(() =>
		normalizeExamFindings(Array.from({ length: 13 }, () => ({ test: 'npc', values: {} })))
	).toThrow('up to 12');
});

test('views show only recorded rows and columns', () => {
	const view = buildExamFindingView({
		test: 'unaidedVa',
		values: { 'od.distance': '20', 'os.distance': '400', method: 'Snellen' }
	})!;
	expect(view.title).toBe('Unaided visual acuity');
	const grid = view.sections[0];
	if (grid.kind !== 'grid') throw new Error('expected grid');
	expect(grid.columns.map((column) => column.key)).toEqual(['distance']);
	expect(grid.rows.map((row) => row.label)).toEqual(['OD', 'OS']);
	expect(grid.rows[1].cells[0]).toMatchObject({ value: '400', prefix: '20/' });
	expect(view.sections[1]).toMatchObject({ kind: 'fields', items: [{ value: 'Snellen' }] });
	expect(buildExamFindingView({ test: 'iop', values: {} })).toBeNull();
});

const testById = (id: string) => EXAM_TESTS.find((entry) => entry.id === id)!;

test("Normal fills only empty slots with that test's normal findings", () => {
	const slitLamp = testById('anteriorSegment');
	const finding: ExamFinding = { test: 'anteriorSegment', values: { 'cornea.os': 'Edema' } };
	const filled = applyNormalValues(finding, slitLamp);
	expect(finding.values['cornea.os']).toBe('Edema');
	expect(finding.values['cornea.od']).toBe('Clear');
	expect(finding.values['chamber.os']).toBe('Deep & quiet');
	expect(finding.values['irisColor.od']).toBeUndefined();
	expect(filled).toBe(Object.keys(normalExamValues(slitLamp)).length - 1);
	expect(normalExamValues(testById('confrontation'))['od.result']).toBe('FTFC');
	expect(normalExamValues(testById('eom'))['od.result']).toBe('FROM');
	expect(normalExamValues(testById('manifest'))['ou.va']).toBe('20');
});

test('every normal value lands in a slot the layout stores', () => {
	for (const entry of EXAM_TESTS) {
		const keys = new Set(layoutKeys(entry.layout));
		for (const key of Object.keys(normalExamValues(entry))) expect(keys.has(key), key).toBe(true);
	}
});

test('OS = OD copies eye rows and eye columns, blanks included', () => {
	const refraction: ExamFinding = {
		test: 'manifest',
		values: { 'od.sphere': '-1.00', 'od.axis': '180', 'os.cyl': '-0.50', 'ou.va': '20' }
	};
	mirrorOdToOs(refraction, testById('manifest'));
	expect(refraction.values).toEqual({
		'od.sphere': '-1.00',
		'od.axis': '180',
		'os.sphere': '-1.00',
		'os.axis': '180',
		'ou.va': '20'
	});
	const slitLamp: ExamFinding = { test: 'anteriorSegment', values: { 'lens.od': '2+ NS' } };
	mirrorOdToOs(slitLamp, testById('anteriorSegment'));
	expect(slitLamp.values['lens.os']).toBe('2+ NS');
	expect(mirrorPairs(testById('vitals'))).toEqual([]);
	expect(mirrorPairs(testById('coverTest'))).toEqual([]);
});

test('notes keep an otherwise empty box and are trimmed', () => {
	expect(
		normalizeExamFindings([{ test: 'iop', values: {}, note: '  Patient squeezing  ' }])
	).toEqual([{ test: 'iop', values: {}, note: 'Patient squeezing' }]);
	const view = buildExamFindingView({ test: 'iop', values: {}, note: 'Recheck in 1 hr' })!;
	expect(view.sections).toEqual([]);
	expect(view.note).toBe('Recheck in 1 hr');
});

test('near retinoscopy is one finding per eye plus a method', () => {
	const near = testById('nearRetinoscopy');
	expect(layoutKeys(near.layout)).toEqual(['od.finding', 'os.finding', 'method']);
	expect(normalExamValues(near)).toEqual({ 'od.finding': '+0.50', 'os.finding': '+0.50' });
	expect(mirrorPairs(near)).toEqual([['od.finding', 'os.finding']]);
});

test('new boxes default workflow details without inventing measurements', () => {
	expect(defaultExamValues(testById('unaidedVa'))).toEqual({ method: 'Snellen' });
	expect(defaultExamValues(testById('manifest'))).toEqual({ method: 'Phoropter' });
	expect(defaultExamValues(testById('iop'))).toEqual({});
	expect(defaultExamValues(testById('opticNerve'))).toEqual({});
	expect(buildExamFindingView({ test: 'manifest', values: { method: 'Phoropter' } })).toBeNull();
	expect(
		normalizeExamFindings([{ test: 'manifest', values: { method: 'Phoropter' } }])
	).toBeUndefined();
});

test('clinical entry caps axes and scores, formats pasted values, and preserves descriptive findings', () => {
	const axis = EXAM_LAYOUTS.refraction[0];
	if (axis.kind !== 'grid') throw new Error('expected grid');
	expect(formatExamValue('190', axis.columns[2])).toBe('180');
	expect(formatExamValue('0', axis.columns[2])).toBe('180');
	expect(formatExamValue('5', axis.columns[2])).toBe('005');
	expect(formatExamValue('−1.5 D', axis.columns[0])).toBe('-1.50');
	expect(formatExamValue('1.25', axis.columns[0])).toBe('+1.25');
	expect(formatExamValue('20/25+2', axis.columns[3])).toBe('25+2');
	expect(formatExamValue('CF', axis.columns[3])).toBe('CF');
	expect(
		normalizeExamFindings([
			{ test: 'manifest', values: { 'od.axis': '190', 'od.sphere': '1.5', 'od.va': '20/20-1' } },
			{ test: 'opticNerve', values: { 'horizontalCd.od': '1.4', 'verticalCd.os': '0.35' } },
			{ test: 'iop', values: { 'od.pressure': 'Unable' } }
		])
	).toMatchObject([
		{ values: { 'od.axis': '180', 'od.sphere': '+1.50', 'od.va': '20-1' } },
		{ values: { 'horizontalCd.od': '1.00', 'verticalCd.os': '0.35' } },
		{ values: { 'od.pressure': 'Unable' } }
	]);
	const stereo = EXAM_LAYOUTS.stereo[0];
	if (stereo.kind !== 'fields') throw new Error('expected fields');
	expect(formatExamValue('12/10', stereo.fields[0])).toBe('10');
	expect(formatExamValue('11', stereo.fields[3])).toBe('9');
	const vitals = EXAM_LAYOUTS.vitals[0];
	if (vitals.kind !== 'fields') throw new Error('expected fields');
	expect(formatExamValue('118-76', vitals.fields[0])).toBe('118/76');
	const iopDetails = EXAM_LAYOUTS.iop[1];
	if (iopDetails.kind !== 'fields') throw new Error('expected fields');
	expect(formatExamValue('9:30am', iopDetails.fields[1])).toBe('9:30 AM');
	expect(formatExamValue('930', iopDetails.fields[1])).toBe('9:30');
});

test('EHR choices match the type of finding while retaining custom entries', () => {
	const eom = EXAM_LAYOUTS.motility[0];
	if (eom.kind !== 'grid') throw new Error('expected grid');
	expect(eom.columns[0].input).toBe('check');
	const pupils = EXAM_LAYOUTS.pupils[1];
	if (pupils.kind !== 'fields') throw new Error('expected fields');
	expect(pupils.fields[0].input).toBe('check');
	const cover = testById('coverTest');
	expect(normalExamValues(cover)).toMatchObject({
		'uct.distance': 'No Motion',
		'act.near': 'Ortho'
	});
	const slitLamp = EXAM_LAYOUTS.slitLamp[0];
	if (slitLamp.kind !== 'grid') throw new Error('expected grid');
	const cornea = slitLamp.rows.find((row) => row.key === 'cornea')!;
	expect(fieldChoices(slitLamp.columns[0], cornea)).toEqual(
		expect.arrayContaining(['Clear', 'SPK', 'Abrasion', 'Edema'])
	);
	expect(effectiveField(slitLamp.columns[0], cornea).normal).toBe('Clear');
	expect(
		normalizeExamFindings([{ test: 'anteriorSegment', values: { 'cornea.od': 'Trace SPK' } }])?.[0]
			.values['cornea.od']
	).toBe('Trace SPK');
});

test('cover test keeps UCT choices, ACT amount and direction, and both correction flags', () => {
	const cover = testById('coverTest');
	const grid = cover.layout[0];
	const details = cover.layout[1];
	if (grid.kind !== 'grid' || details.kind !== 'fields') throw new Error('expected cover test');
	expect(grid.rows.map((row) => row.label)).toEqual(['UCT', 'ACT']);
	expect(fieldChoices(grid.columns[0], grid.rows[0])).toContain('No Motion');
	expect(effectiveField(grid.columns[0], grid.rows[1]).input).toBe('coverDeviation');
	expect(coverDeviationParts('8 Exoph')).toEqual({ magnitude: '8', direction: 'Exoph' });
	expect(coverDeviationParts('Esophoria')).toEqual({ magnitude: '', direction: 'Esoph' });
	expect(combineCoverDeviation('8', 'Exoph')).toBe('8 Exoph');
	expect(formatExamValue('1200 exoph', effectiveField(grid.columns[0], grid.rows[1]))).toBe(
		'999 Exoph'
	);
	expect(details.fields[0].input).toBe('coverCorrection');
	const both = toggleCoverCorrection('With correction', 'Without correction', true);
	expect(coverCorrectionValues(both)).toEqual(['With correction', 'Without correction']);
	expect(toggleCoverCorrection(both, 'With correction', false)).toBe('Without correction');
	expect(
		buildExamFindingView({
			test: 'coverTest',
			values: { 'act.distance': '8 Exoph', correction: both }
		})?.sections[0]
	).toMatchObject({ kind: 'grid', rows: [{ label: 'ACT' }] });
});

test('prism amount and direction stay separately editable and save as one finding', () => {
	expect(prismParts('1.5Δ BI')).toEqual({ magnitude: '1.5', direction: 'BI' });
	expect(combinePrism('2', 'BO')).toBe('2Δ BO');
	expect(combinePrism('Unable', '')).toBe('Unable');
	const spectacle = EXAM_LAYOUTS.spectacleRx[0];
	if (spectacle.kind !== 'grid') throw new Error('expected grid');
	expect(formatExamValue('1.5dBI', spectacle.columns[5])).toBe('1.5Δ BI');
});
