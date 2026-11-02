// Fixture notebook for the Study Space mock: one class topic, its sources, a conversation that
// cites them, and practice questions drawn from them. Nothing here talks to Convex.

export type Source = {
	id: string;
	title: string;
	kind: 'pdf' | 'slides' | 'notes';
	pages: number;
	added: string;
	processing?: boolean;
};

export const sources: Source[] = [
	{ id: 'ch12', title: 'Ch. 12 · Cardiac Physiology', kind: 'pdf', pages: 28, added: '2 days ago' },
	{
		id: 'lec14',
		title: 'Lecture 14 · Pressure–volume loops',
		kind: 'slides',
		pages: 34,
		added: 'Yesterday'
	},
	{ id: 'pharm', title: 'Cardiac drugs review sheet', kind: 'pdf', pages: 12, added: '3 days ago' },
	{ id: 'notes', title: 'My notes · Week 6', kind: 'notes', pages: 2, added: 'Today' },
	{
		id: 'path',
		title: 'Heart failure case studies',
		kind: 'pdf',
		pages: 18,
		added: 'Just now',
		processing: true
	}
];

export type Citation = { n: number; sourceId: string; page: number; quote: string };

/** Inline pieces of an answer: plain text, a numbered citation, or a glossary term. */
export type Part = string | { cite: number } | { term: string };

export type Turn =
	| { id: string; role: 'user'; text: string }
	| {
			id: string;
			role: 'assistant';
			parts: Part[];
			citations?: Citation[];
			searched?: { sources: number; passages: number; queries: string[] };
	  };

export const glossary: Record<string, { meaning: string; parts?: string[] }> = {
	'Frank–Starling mechanism': {
		meaning:
			'Stroke volume rises with end-diastolic volume, because stretched fibres contract harder.',
		parts: ['Eponym · Otto Frank, Ernest Starling']
	},
	preload: {
		meaning:
			'The stretch on ventricular muscle at the end of diastole, set by end-diastolic volume.',
		parts: ['pre- · before', 'load · the stretch before contraction']
	},
	'stroke volume': {
		meaning: 'Blood ejected by one ventricle in one beat: end-diastolic minus end-systolic volume.'
	},
	'isovolumetric contraction': {
		meaning:
			'The moment the ventricle contracts with every valve closed, so pressure rises at a fixed volume.',
		parts: ['iso- · equal', 'volumetric · volume']
	}
};

export const citations: Citation[] = [
	{
		n: 1,
		sourceId: 'ch12',
		page: 8,
		quote:
			'An increase in end-diastolic volume stretches the myocardium and increases the force of the next contraction.'
	},
	{
		n: 2,
		sourceId: 'lec14',
		page: 11,
		quote:
			'A larger preload widens the PV loop to the right: the same end-systolic point, a larger stroke volume.'
	}
];

export const openingTurns: Turn[] = [
	{
		id: 't1',
		role: 'assistant',
		parts: [
			'Your notebook has 5 sources on the cardiovascular system. Ask about any of them, or start a practice set from the studio.'
		]
	},
	{ id: 't2', role: 'user', text: 'Explain the Frank–Starling mechanism simply.' },
	{
		id: 't3',
		role: 'assistant',
		searched: {
			sources: 2,
			passages: 4,
			queries: ['Frank-Starling', 'preload stroke volume', 'PV loop preload']
		},
		citations,
		parts: [
			'The ',
			{ term: 'Frank–Starling mechanism' },
			' is the heart matching its output to what comes in. More blood returning in diastole raises ',
			{ term: 'preload' },
			', the fibres stretch, and the next beat contracts harder',
			{ cite: 1 },
			'.\n\nOn a pressure–volume loop that shows up as a wider loop: a bigger ',
			{ term: 'stroke volume' },
			' from the same end-systolic point',
			{ cite: 2 },
			'.'
		]
	}
];

export const suggestions = [
	'Compare systolic and diastolic failure',
	'Quiz me on cardiac drugs',
	'Summarize Lecture 14'
];

export const cannedReply: Extract<Turn, { role: 'assistant' }> = {
	id: 'reply',
	role: 'assistant',
	searched: {
		sources: 3,
		passages: 6,
		queries: ['heart failure ejection fraction', 'diastolic dysfunction']
	},
	citations: [
		{
			n: 1,
			sourceId: 'path',
			page: 4,
			quote: 'HFrEF: ejection fraction at or below 40%, a dilated, weak ventricle.'
		},
		{
			n: 2,
			sourceId: 'ch12',
			page: 22,
			quote:
				'In diastolic failure the stiff ventricle fills poorly despite a normal ejection fraction.'
		}
	],
	parts: [
		'Systolic failure is a pump that can’t squeeze: ejection fraction falls',
		{ cite: 1 },
		'. Diastolic failure is a pump that can’t fill: the wall is stiff, so ',
		{ term: 'preload' },
		' is limited even though ejection fraction looks normal',
		{ cite: 2 },
		'.'
	]
};

export type Question = {
	id: string;
	stem: Part[];
	options: { id: string; text: string; why: string }[];
	answer: string;
	sourceId: string;
	page: number;
};

export const questions: Question[] = [
	{
		id: 'q1',
		stem: ['The ', { term: 'Frank–Starling mechanism' }, ' relates which two quantities?'],
		options: [
			{
				id: 'a',
				text: 'Heart rate and blood pressure',
				why: 'That is the baroreflex, not an intrinsic property of the muscle.'
			},
			{
				id: 'b',
				text: 'End-diastolic volume and stroke volume',
				why: 'More filling stretches the fibres, so the next beat ejects more.'
			},
			{
				id: 'c',
				text: 'Cardiac output and vascular resistance',
				why: 'Together they set blood pressure; they are not the Starling relationship.'
			},
			{
				id: 'd',
				text: 'Preload and afterload',
				why: 'Both affect stroke volume, but the law is about filling, not the load against ejection.'
			}
		],
		answer: 'b',
		sourceId: 'ch12',
		page: 8
	},
	{
		id: 'q2',
		stem: ['Which phase of the ventricular action potential is the rapid sodium influx?'],
		options: [
			{
				id: 'a',
				text: 'Phase 0',
				why: 'Fast Na⁺ channels open and the membrane depolarises from about −90 mV.'
			},
			{ id: 'b', text: 'Phase 1', why: 'Early repolarisation, from transient K⁺ outflow.' },
			{ id: 'c', text: 'Phase 2', why: 'The plateau: Ca²⁺ in, K⁺ out, roughly balanced.' },
			{ id: 'd', text: 'Phase 4', why: 'Resting potential in ventricular muscle.' }
		],
		answer: 'a',
		sourceId: 'ch12',
		page: 14
	},
	{
		id: 'q3',
		stem: ['During ', { term: 'isovolumetric contraction' }, ', which valves are open?'],
		options: [
			{
				id: 'a',
				text: 'Mitral and aortic',
				why: 'Both open at once would mean no pressure difference to drive flow.'
			},
			{
				id: 'b',
				text: 'Mitral only',
				why: 'The mitral valve has just closed; that closure starts this phase.'
			},
			{
				id: 'c',
				text: 'None',
				why: 'Every valve is closed, so pressure rises while volume stays the same.'
			},
			{
				id: 'd',
				text: 'Aortic only',
				why: 'The aortic valve opens when this phase ends and ejection begins.'
			}
		],
		answer: 'c',
		sourceId: 'lec14',
		page: 6
	},
	{
		id: 'q4',
		stem: ['Ejection fraction is 35% and output has fallen. Which response comes first?'],
		options: [
			{ id: 'a', text: 'Myocardial hypertrophy', why: 'Remodelling takes weeks to months.' },
			{
				id: 'b',
				text: 'Renin–angiotensin activation',
				why: 'Real, but slower than the reflex: minutes to hours.'
			},
			{
				id: 'c',
				text: 'Baroreceptor sympathetic activation',
				why: 'Within seconds, the carotid and aortic baroreceptors raise rate and contractility.'
			},
			{
				id: 'd',
				text: 'More erythropoietin',
				why: 'A response to hypoxia over days, not to a pressure drop.'
			}
		],
		answer: 'c',
		sourceId: 'path',
		page: 3
	}
];

export const sourceTitle = (id: string) => sources.find((s) => s.id === id)?.title ?? 'Source';
