import { encodeAnswer, encodePrompt, type MatchingQuestion } from '#lib/utils/matching.js';

function build(id: string, pairs: Array<[string, string]>, distractors: string[] = []) {
	const options = [
		...pairs.map(([prompt], i) => ({ id: `p${i}`, text: encodePrompt(prompt) })),
		...pairs.map(([, answer], i) => ({ id: `a${i}`, text: encodeAnswer(answer) })),
		...distractors.map((text, i) => ({ id: `d${i}`, text: encodeAnswer(text) }))
	];
	return {
		_id: id,
		options,
		correctAnswers: pairs.map((_, i) => `p${i}::a${i}`)
	} satisfies MatchingQuestion;
}

export const lowVision = build('demo-low-vision', [
	['Disease', 'An anatomical change in tissues (e.g. AMD)'],
	['Impairment', 'Loss of function (e.g. loss of VA, central scotoma)'],
	['Handicap', 'Inability to accomplish a task (e.g. inability to read)'],
	[
		'Disability',
		"The effect on one's life (e.g. loss of independence, financial independence, career etc.)"
	]
]);

export const cranialNerves = build(
	'demo-cranial-nerves',
	[
		['CN I (olfactory)', 'Smell; tested with a non-irritating odorant one nostril at a time'],
		[
			'CN II (optic)',
			'Visual acuity, visual fields, and the afferent limb of the pupillary light reflex'
		],
		[
			'CN III (oculomotor)',
			'Medial, superior and inferior recti, inferior oblique, levator palpebrae, and the efferent pupillary response'
		],
		['CN IV (trochlear)', 'Superior oblique: depression of the adducted eye and intorsion'],
		[
			'CN V (trigeminal)',
			'Facial sensation, the afferent limb of the corneal reflex, and the muscles of mastication'
		],
		['CN VI (abducens)', 'Lateral rectus: abduction'],
		[
			'CN VII (facial)',
			'Muscles of facial expression, orbicularis oculi, taste to the anterior two-thirds of the tongue, and lacrimation'
		],
		['CN VIII (vestibulocochlear)', 'Hearing and balance'],
		[
			'CN IX (glossopharyngeal)',
			'Taste to the posterior third of the tongue and the afferent limb of the gag reflex'
		],
		[
			'CN X (vagus)',
			'Palate elevation, phonation, and parasympathetic supply to thoracic and abdominal viscera'
		],
		['CN XI (accessory)', 'Sternocleidomastoid and trapezius'],
		['CN XII (hypoglossal)', 'Tongue movement; the tongue deviates toward the side of a lesion']
	],
	[
		'Ciliary muscle only',
		'Dilator pupillae via the sympathetic chain',
		'Taste to the entire tongue',
		'Corneal sensation without any motor function'
	]
);
