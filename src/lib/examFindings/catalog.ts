// Exam findings are built from three pieces:
// - a Field is one value (`20/` prefix, `mm` suffix, …)
// - a Layout is the arrangement of fields (an OD/OS grid, a list, a note)
// - a Test is a titled box that uses a layout
// Tests that record the same findings share a layout, so renaming or adding one is a single line.

export type ExamField = {
	key: string;
	label: string;
	prefix?: string;
	suffix?: string;
	wide?: boolean;
	input?:
		| 'axis'
		| 'power'
		| 'prism'
		| 'acuity'
		| 'number'
		| 'integer'
		| 'cupDisc'
		| 'time'
		| 'bp'
		| 'check'
		| 'coverDeviation'
		| 'phoria'
		| 'coverCorrection';
	min?: number;
	max?: number;
	decimals?: number;
	default?: string;
	choices?: string[];
	// Shown in the Add findings preview and as input hints.
	sample?: string;
	// Filled by the Normal button.
	normal?: string;
};

// A row's sample and normal win over its columns' (slit lamp rows describe different structures).
// `columns` limits a row to some columns (an OU row that only records VA).
export type ExamRow = {
	key: string;
	label: string;
	sample?: string;
	normal?: string;
	input?: ExamField['input'];
	min?: number;
	max?: number;
	suffix?: string;
	choices?: string[];
	columns?: string[];
};

export type ExamSection =
	| { kind: 'grid'; key?: string; label?: string; rows: ExamRow[]; columns: ExamField[] }
	| { kind: 'fields'; key?: string; label?: string; fields: ExamField[] }
	| { kind: 'note'; key: string; label: string; sample?: string; normal?: string };

export type ExamLayout = ExamSection[];

export type ExamTestGroup = 'entrance' | 'binocular' | 'refraction' | 'health' | 'general';

export type ExamTest = {
	id: string;
	title: string;
	group: ExamTestGroup;
	layout: ExamLayout;
};

export const EXAM_TEST_GROUPS: Record<ExamTestGroup, string> = {
	entrance: 'Entrance',
	binocular: 'Binocular vision',
	refraction: 'Refraction',
	health: 'Ocular health',
	general: 'Vitals & notes'
};

type FieldOptions = Omit<ExamField, 'key' | 'label'>;

const field = (key: string, label: string, extra: FieldOptions = {}): ExamField => ({
	key,
	label,
	...extra
});
// A field whose normal is also its sample (PERRLA, FTFC, Ortho).
const normalField = (key: string, label: string, normal: string, extra: FieldOptions = {}) =>
	field(key, label, { sample: normal, normal, ...extra });

const OD: ExamRow = { key: 'od', label: 'OD' };
const OS: ExamRow = { key: 'os', label: 'OS' };
const OU: ExamRow = { key: 'ou', label: 'OU' };
const EYES = [OD, OS];
const ouOnly = (...columns: string[]): ExamRow => ({ ...OU, columns });
const rows = (list: Array<[key: string, label: string]>): ExamRow[] =>
	list.map(([key, label]) => ({ key, label }));

const eyeGrid = (columns: ExamField[], rows = EYES, extra: { key?: string; label?: string } = {}) =>
	({ kind: 'grid', rows, columns, ...extra }) as const;
const fields = (list: ExamField[], extra: { key?: string; label?: string } = {}) =>
	({ kind: 'fields', fields: list, ...extra }) as const;
const note = (key: string, label: string, sample?: string) =>
	({ kind: 'note', key, label, sample }) as const;
// Structures down the side, one column per eye (slit lamp, fundus).
// The third entry is the normal finding; pass a fourth to use a different preview sample.
const structureGrid = (
	structures: Array<
		[
			key: string,
			label: string,
			normal: string,
			sample?: string,
			input?: ExamField['input'],
			choices?: string[]
		]
	>
): ExamSection => ({
	kind: 'grid',
	rows: structures.map(([key, label, normal, sample, input, choices]) => ({
		key,
		label,
		normal: normal || undefined,
		sample: sample ?? (normal || undefined),
		input,
		choices
	})),
	columns: [field('od', 'OD', { wide: true }), field('os', 'OS', { wide: true })]
});

const sphere = field('sphere', 'Sphere', { input: 'power', sample: '-2.25' });
const cyl = field('cyl', 'Cyl', { input: 'power', sample: '-0.75' });
const axis = field('axis', 'Axis', { input: 'axis', prefix: '×', sample: '180' });
const add = field('add', 'Add', { input: 'power', sample: '+1.50' });
const acuity = (key: string, label: string) =>
	field(key, label, {
		input: 'acuity',
		prefix: '20/',
		sample: '20',
		normal: '20',
		choices: [
			'10',
			'15',
			'20',
			'25',
			'30',
			'40',
			'50',
			'60',
			'70',
			'80',
			'100',
			'150',
			'200',
			'250',
			'300',
			'350',
			'400',
			'800',
			'CF',
			'HM',
			'LP',
			'NLP'
		]
	});
const time = field('time', 'Time', { input: 'time', sample: '9:30 AM' });
const method = (sample: string, normal?: string, choices?: string[]) =>
	field('method', 'Method', {
		wide: true,
		sample,
		normal,
		default: normal,
		choices: choices ? [sample, ...choices] : undefined
	});
const resultWithLimitation = (normal: string) => [
	eyeGrid([
		normalField('result', 'Result', normal, { input: 'check' }),
		field('limit', 'Limitation', { wide: true })
	])
];

export const EXAM_LAYOUTS = {
	unaidedVa: [
		eyeGrid([acuity('distance', 'Distance'), acuity('near', 'Near')], [OD, OS, OU]),
		fields([
			method('Snellen', 'Snellen', ['Snellen w/crowding bars', 'HOTV', 'Lea', 'Tumbling E']),
			field('nearAt', 'Near @', { sample: '40 cm' })
		])
	],
	aidedVa: [
		eyeGrid([acuity('distance', 'Distance'), acuity('near', 'Near')], [OD, OS, OU]),
		fields([
			method('Snellen', 'Snellen', ['Snellen w/crowding bars', 'HOTV', 'Lea', 'Tumbling E']),
			field('rxWorn', 'Rx worn', {
				wide: true,
				sample: 'Glasses',
				choices: ['Glasses', 'Contact lenses', 'Both']
			}),
			field('nearAt', 'Near @', { sample: '40 cm' })
		])
	],
	pinhole: [eyeGrid([acuity('distance', 'Distance')])],
	pupils: [
		eyeGrid([
			field('dim', 'Dim', { input: 'number', min: 0, suffix: 'mm', sample: '6' }),
			field('bright', 'Bright', { input: 'number', min: 0, suffix: 'mm', sample: '3' }),
			normalField('response', 'Direct', 'Brisk', { choices: ['Brisk', 'Sluggish', 'Absent'] }),
			field('monoPd', 'Mono PD', { input: 'number', min: 0, suffix: 'mm', sample: '31' })
		]),
		fields([
			normalField('perrla', 'Summary', 'PERRLA', { input: 'check', wide: true }),
			normalField('apd', 'APD', 'Negative', { choices: ['Negative', 'OD', 'OS'] }),
			field('pdDistance', 'Binoc. dist PD', {
				input: 'number',
				min: 0,
				suffix: 'mm',
				sample: '62'
			}),
			field('pdNear', 'Binoc. near PD', { input: 'number', min: 0, suffix: 'mm', sample: '59' })
		])
	],
	motility: resultWithLimitation('FROM'),
	confrontation: resultWithLimitation('FTFC'),
	automatedFields: [...resultWithLimitation('Full'), fields([method('24-2 SITA Fast')])],
	colorVision: [
		eyeGrid([normalField('result', 'Result', 'Normal', { wide: true })]),
		fields([method('Ishihara', undefined, ['HRR', 'D-15', 'Farnsworth 100 Hue'])])
	],
	coverTest: [
		eyeGrid(
			[field('distance', 'Distance', { wide: true }), field('near', 'Near', { wide: true })],
			[
				{
					key: 'uct',
					label: 'UCT',
					sample: 'No Motion',
					normal: 'No Motion',
					choices: ['RET', 'RXT', 'LET', 'LXT', 'RHyperT', 'LHyperT', 'Alt. ET', 'Alt. XT']
				},
				{
					key: 'act',
					label: 'ACT',
					sample: 'Ortho',
					normal: 'Ortho',
					input: 'coverDeviation',
					choices: ['Esoph', 'Exoph', 'Rhyper', 'Lhyper']
				}
			],
			{ label: 'Cover test' }
		),
		fields(
			[
				field('correction', 'Correction', {
					sample: 'With correction',
					input: 'coverCorrection',
					wide: true,
					choices: ['With correction', 'Without correction']
				}),
				field('impression', 'Impression', { wide: true, sample: 'Orthophoric' })
			],
			{ label: 'Conditions and impression' }
		)
	],
	phorias: [
		eyeGrid(
			[
				normalField('lateral', 'Lateral', 'Ortho', {
					input: 'phoria',
					wide: true,
					choices: ['BI', 'BO']
				}),
				normalField('vertical', 'Vertical', 'Ortho', {
					input: 'phoria',
					wide: true,
					choices: ['BUOD', 'BDOD', 'BUOS', 'BDOS']
				})
			],
			rows([
				['distance', 'Distance'],
				['near', 'Near']
			])
		)
	],
	vergences: [
		eyeGrid(
			[
				field('blur', 'Blur', { input: 'number', min: 0, sample: 'X' }),
				field('break', 'Break', { input: 'number', min: 0, sample: '12' }),
				field('recovery', 'Recovery', { input: 'number', min: 0, sample: '8' })
			],
			rows([
				['biDist', 'BI distance'],
				['boDist', 'BO distance'],
				['boNear', 'BO near'],
				['biNear', 'BI near']
			])
		)
	],
	accommodation: [
		fields([
			field('amplitude', 'Push-up amp', {
				input: 'number',
				min: 0,
				decimals: 2,
				suffix: 'D',
				sample: '8.00'
			}),
			field('nearAdd', 'PBU near add', { input: 'power', sample: '+1.25' }),
			field('nra', 'NRA', { input: 'power', sample: '+2.00' }),
			field('pra', 'PRA', { input: 'power', sample: '-2.25' }),
			field('bxcyl', 'Bin. X-cyl', { input: 'power', sample: '+0.75' }),
			acuity('va', 'OU VA'),
			field('distance', 'Test distance', { sample: '40 cm' })
		])
	],
	npc: [
		fields([
			normalField('npc', 'NPC', 'To nose', { input: 'check' }),
			field('blur', 'Blur', { input: 'number', min: 0, suffix: 'cm', sample: '4' }),
			field('break', 'Break', { input: 'number', min: 0, suffix: 'cm', sample: '6' }),
			field('recovery', 'Recovery', { input: 'number', min: 0, suffix: 'cm', sample: '9' }),
			field('observations', 'Observations', { wide: true })
		])
	],
	stereo: [
		fields([
			normalField('randot', 'Randot', '10', { input: 'integer', min: 0, max: 10, suffix: '/ 10' }),
			normalField('randomDot', 'Random dot', 'Seen', { choices: ['Not seen'] }),
			normalField('secArc', 'Stereo', '20', { input: 'integer', min: 0, suffix: 'sec arc' }),
			normalField('wirt', 'Wirt circles', '9', { input: 'integer', min: 0, max: 9, suffix: '/ 9' }),
			normalField('picture', 'Stereo picture', 'Seen', { choices: ['Not seen'] }),
			field('other', 'Other', { wide: true })
		])
	],
	visuoscopy: [
		{
			kind: 'grid',
			rows: [
				{
					key: 'location',
					label: 'Location',
					sample: 'Central',
					normal: 'Central',
					choices: ['Nasal', 'Temporal', 'Superior', 'Inferior']
				},
				{
					key: 'amount',
					label: 'Amount (psm diop)',
					input: 'number',
					min: 0,
					max: 999,
					suffix: 'Δ',
					sample: '2'
				},
				{
					key: 'stability',
					label: 'Stability',
					sample: 'Steady',
					normal: 'Steady',
					choices: ['Unsteady']
				}
			],
			columns: [field('od', 'OD'), field('os', 'OS')]
		},
		note('comments', 'Comments')
	],
	autorefraction: [
		eyeGrid([sphere, cyl, axis]),
		fields([
			field('confidence', 'Validity / confidence #', { input: 'integer', min: 0, sample: '9' })
		])
	],
	retinoscopy: [
		eyeGrid([sphere, cyl, axis]),
		fields([
			normalField('reflex', 'Reflex quality', 'Normal', {
				choices: ['Fluctuating', 'Dim', 'Opacity', 'Scissors', 'Bullseye']
			}),
			method('Distance', 'Distance', ['Dynamic Near', 'Mohindra', 'MEM', 'Book', 'Bell'])
		])
	],
	nearRetinoscopy: [
		eyeGrid([normalField('finding', 'Finding', '+0.50', { input: 'power', wide: true })]),
		fields([method('MEM', undefined, ['Book', 'Nott', 'Bell', 'Mohindra'])])
	],
	refraction: [
		eyeGrid([sphere, cyl, axis, acuity('va', 'VA')], [OD, OS, ouOnly('va')]),
		fields([method('Phoropter', 'Phoropter', ['Trial frame', 'Subjective'])])
	],
	nearRefraction: [
		eyeGrid([sphere, cyl, axis, acuity('va', 'VA')], [OD, OS, ouOnly('va')]),
		fields([field('distance', 'Test distance', { sample: '40 cm' })])
	],
	spectacleRx: [
		eyeGrid([
			sphere,
			cyl,
			axis,
			add,
			field('intAdd', 'Int add', { input: 'power', sample: '+0.75' }),
			field('hPrism', 'H prism', { input: 'prism', sample: '1Δ BI', choices: ['BI', 'BO'] }),
			field('vPrism', 'V prism', { input: 'prism', sample: '0.5Δ BU', choices: ['BU', 'BD'] })
		]),
		note('instructions', 'Special instructions', 'Progressive, anti-reflective')
	],
	keratometry: [
		eyeGrid([
			field('flat', 'H power', {
				input: 'number',
				min: 0,
				decimals: 2,
				suffix: 'D',
				sample: '43.25'
			}),
			field('flatAxis', 'H meridian', { input: 'axis', prefix: '@', sample: '180' }),
			field('steep', 'V power', {
				input: 'number',
				min: 0,
				decimals: 2,
				suffix: 'D',
				sample: '44.00'
			}),
			field('steepAxis', 'V meridian', { input: 'axis', prefix: '@', sample: '090' })
		]),
		fields([
			normalField('mires', 'Mire quality', 'Clear and regular', { wide: true }),
			method('Manual', undefined, ['Automated'])
		])
	],
	slitLamp: [
		structureGrid([
			['adnexa', 'Adnexa', 'Clean', undefined, undefined, ['Lesion', 'Edema', 'Ptosis']],
			[
				'palpConj',
				'Palp. conj.',
				'Clear',
				undefined,
				undefined,
				['Papillae', 'Follicles', 'Injection']
			],
			['sclera', 'Sclera', 'White & quiet', undefined, undefined, ['Icteric', 'Injection']],
			['episclera', 'Episclera', 'White & quiet', undefined, undefined, ['Injection', 'Nodule']],
			[
				'bulbConj',
				'Bulb. conj.',
				'Clear',
				undefined,
				undefined,
				['Injection', 'Chemosis', 'Pinguecula', 'Pterygium']
			],
			[
				'cornea',
				'Cornea',
				'Clear',
				undefined,
				undefined,
				['SPK', 'Abrasion', 'Edema', 'Scar', 'Neovascularization', 'Guttata']
			],
			['chamber', 'A/C', 'Deep & quiet', undefined, undefined, ['Shallow', 'Cells', 'Flare']],
			[
				'iris',
				'Iris',
				'Flat, no pathology',
				undefined,
				undefined,
				['Neovascularization', 'Atrophy', 'Synechiae']
			],
			['irisColor', 'Iris color', '', 'Brown'],
			[
				'lens',
				'Lens',
				'Clear',
				undefined,
				undefined,
				['Trace NS', '1+ NS', '2+ NS', '3+ NS', 'PSC', 'PCIOL']
			]
		]),
		note('comments', 'Additional comments')
	],
	tearFilm: [
		structureGrid([
			['volume', 'Volume', 'Normal', undefined, undefined, ['Reduced', 'Increased']],
			['quality', 'Quality', 'Good', undefined, undefined, ['Poor', 'Debris']],
			['tbut', 'Tear break-up', '', '10 sec'],
			[
				'fluorescein',
				'Fluorescein stain',
				'None',
				undefined,
				undefined,
				['Trace', '1+', '2+', '3+']
			],
			['lissamine', 'Lissamine green', 'None', undefined, undefined, ['Trace', '1+', '2+', '3+']],
			['roseBengal', 'Rose bengal', 'None', undefined, undefined, ['Trace', '1+', '2+', '3+']]
		]),
		note('comments', 'Additional comments')
	],
	dilation: [
		fields([
			field('drops', 'Drops', {
				wide: true,
				sample: '1% tropicamide, 2.5% phenylephrine',
				choices: ['1% tropicamide', '2.5% phenylephrine', '1% tropicamide, 2.5% phenylephrine']
			}),
			time
		])
	],
	iop: [
		eyeGrid([field('pressure', 'IOP', { input: 'number', min: 0, suffix: 'mmHg', sample: '16' })]),
		fields([
			field('method', 'Method', {
				sample: 'Goldmann',
				choices: ['Goldmann', 'iCare', 'Tono-Pen', 'Non-contact']
			}),
			time
		])
	],
	tonometry: [
		eyeGrid([field('pressure', 'IOP', { input: 'number', min: 0, suffix: 'mmHg', sample: '16' })]),
		fields([time])
	],
	pachymetry: [
		eyeGrid([field('cct', 'CCT', { input: 'integer', min: 0, suffix: 'µm', sample: '545' })])
	],
	opticalPachymetry: [
		eyeGrid([
			field('central', 'Central', { input: 'integer', min: 0, suffix: 'µm', sample: '545' }),
			field('max', 'Max', { input: 'integer', min: 0, suffix: 'µm', sample: '612' }),
			field('min', 'Min', { input: 'integer', min: 0, suffix: 'µm', sample: '538' }),
			field('average', 'Average', { input: 'integer', min: 0, suffix: 'µm', sample: '571' }),
			field('comments', 'Comments', { wide: true })
		])
	],
	fundus: [
		structureGrid([
			['macula', 'Macula', 'Flat, even', undefined, undefined, ['Drusen', 'Edema', 'Scar']],
			['fovealReflex', 'Foveal reflex', 'Present', undefined, undefined, ['Absent', 'Diminished']],
			['postPole', 'Post. pole', 'Flat', undefined, undefined, ['Drusen', 'Hemorrhage']],
			[
				'periphery',
				'Periphery',
				'Flat 360°',
				undefined,
				undefined,
				['Lattice', 'Hole', 'Tear', 'Detachment']
			],
			['vitreous', 'Vitreous', 'Clear', undefined, undefined, ['Floaters', 'PVD', 'Hemorrhage']],
			['avRatio', 'A/V ratio', '2/3'],
			['arteriolarReflex', 'Arteriolar reflex', 'Normal'],
			['avCrossings', 'A/V crossings', 'Unremarkable'],
			[
				'drGrade',
				'Diabetic retinopathy',
				'None',
				undefined,
				undefined,
				['Mild NPDR', 'Moderate NPDR', 'Severe NPDR', 'PDR']
			],
			['dme', 'DME', 'N', undefined, undefined, ['Y']],
			['nve', 'NVE', 'N', undefined, undefined, ['Y']]
		])
	],
	opticNerve: [
		structureGrid([
			['discType', 'Disc type', '', 'Round'],
			['horizontalCd', 'Horiz. C/D', '', '0.30', 'cupDisc'],
			['verticalCd', 'Vert. C/D', '', '0.35', 'cupDisc'],
			['rim', 'NR rim', 'Healthy', undefined, undefined, ['Thin', 'Notching', 'Pallor']],
			['color', 'Color', 'Pink', undefined, undefined, ['Pale', 'Hyperemic']],
			['margins', 'Margins', 'Distinct', undefined, undefined, ['Blurred', 'Elevated']],
			['cupDepth', 'Cup depth', '', 'Shallow'],
			['svp', '(+) SVP', 'Yes', undefined, undefined, ['No']],
			['isnt', 'Follows ISNT', 'Yes', undefined, undefined, ['No']],
			['nvd', 'NVD', 'N', undefined, undefined, ['Y']]
		])
	],
	techniques: [
		eyeGrid([normalField('technique', 'Technique', 'Dilated BIO, 90D', { wide: true })])
	],
	vitals: [
		fields([
			field('bp', 'BP', { input: 'bp', suffix: 'mmHg', sample: '118/76' }),
			field('pulse', 'Pulse', { input: 'integer', min: 0, suffix: 'bpm', sample: '72' }),
			field('resp', 'Resp', { input: 'integer', min: 0, suffix: '/min', sample: '14' }),
			field('temp', 'Temp', { input: 'number', decimals: 1, suffix: '°F', sample: '98.6' }),
			field('height', 'Height', { sample: `5'8"` }),
			field('weight', 'Weight', { input: 'number', min: 0, suffix: 'lb', sample: '165' })
		])
	],
	notes: [note('text', 'Notes', 'Patient reports intermittent blur at near.')]
} satisfies Record<string, ExamLayout>;

const test = (
	id: string,
	title: string,
	group: ExamTestGroup,
	layout: keyof typeof EXAM_LAYOUTS
): ExamTest => ({ id, title, group, layout: EXAM_LAYOUTS[layout] });

// Test ids are stored on questions: add freely, but never rename or remove an id.
export const EXAM_TESTS: ExamTest[] = [
	test('unaidedVa', 'Unaided visual acuity', 'entrance', 'unaidedVa'),
	test('aidedVa', 'Aided visual acuity', 'entrance', 'aidedVa'),
	test('pinholeVa', 'Pinhole visual acuity', 'entrance', 'pinhole'),
	test('pupils', 'Pupils', 'entrance', 'pupils'),
	test('eom', 'EOM (motility)', 'entrance', 'motility'),
	test('confrontation', 'Confrontation fields', 'entrance', 'confrontation'),
	test('automatedFields', 'Automated fields', 'entrance', 'automatedFields'),
	test('colorVision', 'Color vision', 'entrance', 'colorVision'),
	test('coverTest', 'Cover test', 'binocular', 'coverTest'),
	test('phorias', 'Phorias', 'binocular', 'phorias'),
	test('vergences', 'Vergences', 'binocular', 'vergences'),
	test('accommodation', 'Accommodation / near add', 'binocular', 'accommodation'),
	test('npc', 'NPC', 'binocular', 'npc'),
	test('stereo', 'Stereo', 'binocular', 'stereo'),
	test('visuoscopy', 'Visuoscopy/Eccentric Fixation', 'binocular', 'visuoscopy'),
	test('habitualRx', 'Habitual Rx', 'refraction', 'spectacleRx'),
	test('autorefraction', 'Autorefraction', 'refraction', 'autorefraction'),
	test('retinoscopy', 'Retinoscopy', 'refraction', 'retinoscopy'),
	test('nearRetinoscopy', 'Near retinoscopy', 'refraction', 'nearRetinoscopy'),
	test('keratometry', 'Keratometry', 'refraction', 'keratometry'),
	test('manifest', 'Refraction · distance', 'refraction', 'refraction'),
	test('nearRefraction', 'Refraction · nearpoint', 'refraction', 'nearRefraction'),
	test('cycloplegic', 'Cycloplegic refraction', 'refraction', 'refraction'),
	test('finalRx', 'Final Rx', 'refraction', 'spectacleRx'),
	test('anteriorSegment', 'Slit lamp', 'health', 'slitLamp'),
	test('tearFilm', 'Tear film', 'health', 'tearFilm'),
	test('dilation', 'DPAs used', 'health', 'dilation'),
	test('iop', 'IOP', 'health', 'iop'),
	test('gat', 'GAT', 'health', 'tonometry'),
	test('icare', 'iCare tonometry', 'health', 'tonometry'),
	test('tonopen', 'Tonopen tonometry', 'health', 'tonometry'),
	test('pachymetry', 'Ultrasonic pachymetry', 'health', 'pachymetry'),
	test('opticalPachymetry', 'Optical pachymetry', 'health', 'opticalPachymetry'),
	test('posteriorSegment', 'Fundus', 'health', 'fundus'),
	test('opticNerve', 'Optic nerve', 'health', 'opticNerve'),
	test('examTechniques', 'Examining techniques', 'health', 'techniques'),
	test('vitals', 'Vital signs', 'general', 'vitals'),
	test('notes', 'Notes', 'general', 'notes')
];

const testsById = new Map(EXAM_TESTS.map((entry) => [entry.id, entry]));

export function getExamTest(id: string): ExamTest | undefined {
	return testsById.get(id);
}

export function sectionValueKey(section: ExamSection, ...parts: string[]) {
	return [section.key, ...parts].filter(Boolean).join('.');
}

export function rowHasColumn(row: ExamRow, column: ExamField) {
	return !row.columns || row.columns.includes(column.key);
}

// Every value a layout can hold, keyed the way it is stored (`od.sphere`, `uct.near`, `apd`).
export function layoutKeys(layout: ExamLayout): string[] {
	return layout.flatMap((section) => {
		if (section.kind === 'note') return [section.key];
		if (section.kind === 'fields')
			return section.fields.map((f) => sectionValueKey(section, f.key));
		return section.rows.flatMap((row) =>
			section.columns
				.filter((column) => rowHasColumn(row, column))
				.map((column) => sectionValueKey(section, row.key, column.key))
		);
	});
}
