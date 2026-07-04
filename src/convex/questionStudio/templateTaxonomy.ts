export type TemplateReasoningOrder = 'first' | 'second' | 'third';

export type CognitiveTemplateId =
	| 'recall.definition'
	| 'recall.threshold'
	| 'recognition.feature'
	| 'recognition.feature_set'
	| 'discrimination.compare'
	| 'mechanism.causal'
	| 'diagnosis.case'
	| 'interpretation.test'
	| 'management.next_step'
	| 'safety.contraindication'
	| 'sequence.timeline'
	| 'negative.exception';

export type FormatTemplateId =
	| 'format.single_best'
	| 'format.select_all'
	| 'format.true_false'
	| 'format.matching'
	| 'format.fill_blank'
	| 'format.media_interpretation';

export type QuestionTemplateId = CognitiveTemplateId | FormatTemplateId;

export type QuestionTemplateKind = 'cognitive' | 'format';

export type QuestionTemplateDefinition = {
	id: QuestionTemplateId;
	slug: string;
	kind: QuestionTemplateKind;
	title: string;
	useWhen: string;
	doNotUseWhen: string;
	stemPatterns: readonly string[];
	keyParts: readonly string[];
	considerations: readonly string[];
	reasoningOrderFit: readonly string[];
};

export const cognitiveTemplateIds = [
	'recall.definition',
	'recall.threshold',
	'recognition.feature',
	'recognition.feature_set',
	'discrimination.compare',
	'mechanism.causal',
	'diagnosis.case',
	'interpretation.test',
	'management.next_step',
	'safety.contraindication',
	'sequence.timeline',
	'negative.exception'
] as const satisfies readonly CognitiveTemplateId[];

export const formatTemplateIds = [
	'format.single_best',
	'format.select_all',
	'format.true_false',
	'format.matching',
	'format.fill_blank',
	'format.media_interpretation'
] as const satisfies readonly FormatTemplateId[];

export const reasoningOrderTemplateMap = {
	first: [
		'recall.definition',
		'recall.threshold',
		'recognition.feature',
		'safety.contraindication',
		'negative.exception'
	],
	second: [
		'mechanism.causal',
		'interpretation.test',
		'recall.threshold',
		'discrimination.compare',
		'recognition.feature_set',
		'sequence.timeline',
		'safety.contraindication',
		'negative.exception'
	],
	third: [
		'diagnosis.case',
		'management.next_step',
		'interpretation.test',
		'discrimination.compare',
		'mechanism.causal',
		'safety.contraindication',
		'negative.exception'
	]
} as const satisfies Record<TemplateReasoningOrder, readonly CognitiveTemplateId[]>;

export const questionTemplateDefinitions = [
	{
		id: 'recall.definition',
		slug: 'recall-definition',
		kind: 'cognitive',
		title: 'Recall Definition',
		useWhen:
			'The learner needs to retrieve a named concept, definition, structure, abbreviation, or high-yield association.',
		doNotUseWhen: 'The source supports a richer decision, comparison, or management task.',
		stemPatterns: [
			'What is the name of [definition]?',
			'[Description] is known as which term?',
			'Which term refers to [definition]?'
		],
		keyParts: [
			'Stem gives a precise definition or description.',
			'Correct answer is the exact term or accepted synonym.',
			'Distractors belong to the same vocabulary family.',
			'Rationale adds a memory hook or explains the boundary.'
		],
		considerations: [
			'Do not overload the stem with case details.',
			'Use fill-in-the-blank when exact spelling, abbreviation, or synonym recognition matters.',
			'Use multiple choice when near-neighbor terms need to be contrasted.'
		],
		reasoningOrderFit: [
			'Usually `first` order.',
			'Use `second` only when the learner must apply the definition to a brief consequence or test result.'
		]
	},
	{
		id: 'recall.threshold',
		slug: 'recall-threshold',
		kind: 'cognitive',
		title: 'Recall Threshold',
		useWhen:
			'The learner needs a number, cutoff, range, timeline, dose, formula, or clinical threshold.',
		doNotUseWhen: 'The real skill is deciding what to do with the number.',
		stemPatterns: [
			'What is the threshold for [criterion]?',
			'What range is expected for [measurement]?',
			'Which value best represents [cutoff]?'
		],
		keyParts: [
			'Stem names the measurement and clinical context.',
			'Options include units and plausible nearby values.',
			'Correct answer is exact enough for grading.',
			'Rationale ties the number to interpretation or use.'
		],
		considerations: [
			'Always include units.',
			'Do not mix percentages, ratios, and raw values unless the source does.',
			'Prefer fill-in-the-blank only when accepted variants are enumerable.'
		],
		reasoningOrderFit: [
			'Usually `first` order when asking directly for a number, range, dose, or cutoff.',
			'Use `second` when the learner must apply the threshold to decide whether a result is abnormal or meaningful.'
		]
	},
	{
		id: 'recognition.feature',
		slug: 'recognition-feature',
		kind: 'cognitive',
		title: 'Recognition Feature',
		useWhen:
			'The learner needs to identify one correct sign, feature, finding, property, or association.',
		doNotUseWhen: 'Several features are correct or the target is a management decision.',
		stemPatterns: [
			'Which finding is associated with [condition]?',
			'Which statement correctly describes [topic]?',
			'Which feature best identifies [entity]?'
		],
		keyParts: [
			'Stem names the category or entity.',
			'Correct option is a defining feature.',
			'Distractors are plausible features of adjacent topics.',
			'Rationale explains why the feature belongs.'
		],
		considerations: [
			'Keep options parallel.',
			'Avoid vague "which is true" stems when a more specific feature can be named.',
			'Use one best answer unless the stem explicitly asks for all true statements.'
		],
		reasoningOrderFit: [
			'Usually `first` order when the learner recognizes one directly supported feature.',
			'Use `second` if the feature must be inferred from brief data rather than named directly.'
		]
	},
	{
		id: 'recognition.feature_set',
		slug: 'recognition-feature-set',
		kind: 'cognitive',
		title: 'Recognition Feature Set',
		useWhen: 'The learner should identify all true features in a category or shared property set.',
		doNotUseWhen: 'The options are not independently judgeable.',
		stemPatterns: [
			'Which of the following are associated with [topic]?',
			'Which statements are true regarding [topic]?',
			'Which of these do [items] have in common?'
		],
		keyParts: [
			'Stem signals that multiple answers may be correct.',
			'Every option can be judged independently.',
			'Correct answers define the category boundary.',
			'Rationale groups the true features by principle.'
		],
		considerations: [
			'Do not hide multi-select behavior.',
			'Do not include partially true options unless the course expects nuance and the rationale handles it.',
			'Use this for category mastery, not random fact bundling.'
		],
		reasoningOrderFit: [
			'Usually `second` order because the learner evaluates several independent claims.',
			'Can be `first` if the set is direct recall of a short list.'
		]
	},
	{
		id: 'discrimination.compare',
		slug: 'discrimination-compare',
		kind: 'cognitive',
		title: 'Discrimination Compare',
		useWhen:
			'The learner must separate similar concepts, tests, diseases, pathways, treatments, or categories.',
		doNotUseWhen:
			'The question only asks for a standalone feature with no meaningful near-neighbor.',
		stemPatterns: [
			'Which finding best differentiates [A] from [B]?',
			'Which test distinguishes [A] from [B]?',
			'Classify each item as [A] or [B].'
		],
		keyParts: [
			'Stem names the comparison or classification axis.',
			'Options represent near-neighbor confusions.',
			'Correct answer marks the distinguishing feature.',
			'Rationale draws the boundary explicitly.'
		],
		considerations: [
			'Near-miss distractors are the point.',
			'Do not ask for "the difference" without saying what kind of difference matters.',
			'Matching works well for repeated classification boundaries.'
		],
		reasoningOrderFit: [
			'Usually `second` order when separating near-neighbor concepts.',
			'Can be `third` when the comparison is embedded in diagnosis or management.'
		]
	},
	{
		id: 'mechanism.causal',
		slug: 'mechanism-causal',
		kind: 'cognitive',
		title: 'Mechanism Causal',
		useWhen:
			'The learner must know why a finding, drug effect, experiment, or clinical outcome happens.',
		doNotUseWhen: 'The source only supports a surface association.',
		stemPatterns: [
			'Which mechanism explains [phenomenon]?',
			'Why does [cause] lead to [outcome]?',
			'Which pathway is responsible for [effect]?'
		],
		keyParts: [
			'Stem asks for why or how, not just what.',
			'Correct answer contains a causal link.',
			'Distractors are wrong causal stories.',
			'Rationale traces cause -> intermediate -> outcome.'
		],
		considerations: [
			'Mechanism rationales should be longer than recall rationales.',
			'Make the intermediate step explicit.',
			'Do not invent causal detail beyond the source.'
		],
		reasoningOrderFit: [
			'Usually `second` order.',
			'Use `third` only when the mechanism must be integrated with diagnosis or management in a case.'
		]
	},
	{
		id: 'diagnosis.case',
		slug: 'diagnosis-case',
		kind: 'cognitive',
		title: 'Diagnosis Case',
		useWhen: 'The learner must infer a diagnosis from a compact clinical presentation.',
		doNotUseWhen: 'The item is only asking for a memorized diagnostic feature.',
		stemPatterns: [
			'A patient presents with [findings]. What is the most likely diagnosis?',
			'Given this history and exam, which condition best explains the presentation?'
		],
		keyParts: [
			'Stem includes signal findings and relevant negatives.',
			'Correct answer is the best diagnosis.',
			'Distractors are common look-alikes.',
			'Rationale maps clues to diagnosis.'
		],
		considerations: [
			'Every case detail should earn its place.',
			'Use age, timeline, symptoms, and exam data only when they change the diagnosis.',
			'If management is included, make sure the diagnosis is still clear.'
		],
		reasoningOrderFit: [
			'Usually `third` order.',
			'Use `second` only for very brief test interpretation without a full patient-case frame.'
		]
	},
	{
		id: 'interpretation.test',
		slug: 'interpretation-test',
		kind: 'cognitive',
		title: 'Interpretation Test',
		useWhen:
			'The learner must interpret an image, field, graph, lab, measurement, printout, appearance, or exam result.',
		doNotUseWhen: 'No data or visual cue is present to interpret.',
		stemPatterns: [
			'What does this result suggest?',
			'Analyze the following [test]. What do you suspect?',
			'Which interpretation is most consistent with the data?'
		],
		keyParts: [
			'Stem points to the data source.',
			'Correct answer is the interpretation, not a raw observation.',
			'Distractors are plausible alternative interpretations.',
			'Rationale names the cue that supports the answer.'
		],
		considerations: [
			'Use media when the skill is visual.',
			'Do not replace visual recognition with generic prose.',
			'If media is absent, include enough measured data in the stem.'
		],
		reasoningOrderFit: [
			'Usually `second` order for one-step interpretation of a test, image, graph, or measurement.',
			'Use `third` when interpretation must be integrated with diagnosis or management.'
		]
	},
	{
		id: 'management.next_step',
		slug: 'management-next-step',
		kind: 'cognitive',
		title: 'Management Next Step',
		useWhen:
			'The learner must choose treatment, adjustment, referral, monitoring, counseling, or follow-up.',
		doNotUseWhen: 'The item only asks for a diagnosis or isolated fact.',
		stemPatterns: [
			'What is the most appropriate next step?',
			'Which treatment would be most effective?',
			'What adjustment should be made?'
		],
		keyParts: [
			'Stem includes the decision context.',
			'Correct answer is actionable.',
			'Distractors are actions that would be reasonable if a detail changed.',
			'Rationale explains why the action fits the constraints.'
		],
		considerations: [
			'Include allergies, severity, age, pregnancy, stage, or prior treatment when relevant.',
			'Do not ask unsafe management without source support.',
			'Use multi-select when diagnosis and treatment are both expected.'
		],
		reasoningOrderFit: [
			'Usually `third` order.',
			'Use `second` only for a direct one-step action after a simple finding.'
		]
	},
	{
		id: 'safety.contraindication',
		slug: 'safety-contraindication',
		kind: 'cognitive',
		title: 'Safety Contraindication',
		useWhen:
			'The learner must identify what to avoid, a contraindication, adverse effect, risk, or major complication.',
		doNotUseWhen: 'The risk detail is not source-supported or clinically meaningful.',
		stemPatterns: [
			'Which condition is a contraindication to [action]?',
			'What is the main concern with [presentation]?',
			'Which adverse effect matters most?'
		],
		keyParts: [
			'Stem makes the safety frame clear.',
			'Correct answer identifies the risk or avoid condition.',
			'Distractors are less urgent or wrong-context risks.',
			'Rationale explains the harm being avoided.'
		],
		considerations: [
			'Be precise with contraindication versus caution.',
			'Do not overstate risk.',
			'Use accepted synonyms for fill-in safety answers.'
		],
		reasoningOrderFit: [
			'Can be `first` when asking for a named contraindication.',
			'Use `second` for mechanism of harm and `third` when safety changes case management.'
		]
	},
	{
		id: 'sequence.timeline',
		slug: 'sequence-timeline',
		kind: 'cognitive',
		title: 'Sequence Timeline',
		useWhen: 'The learner must order stages, development, workflow steps, pathways, or timelines.',
		doNotUseWhen: 'Order does not affect meaning.',
		stemPatterns: [
			'Match each stage with its timing.',
			'Which event occurs first?',
			'What is the correct sequence for [process]?'
		],
		keyParts: [
			'Stem names the process or timeline.',
			'Options are stages, times, or ordered events.',
			'Correct answer preserves order or pairing.',
			'Rationale explains why the order matters.'
		],
		considerations: [
			'Matching is strong when several stages map to times.',
			'Single-best is strong when one step is a decision point.',
			'Do not make arbitrary chronology questions.'
		],
		reasoningOrderFit: [
			'Usually `second` order when the learner must place stages, steps, or development in order.',
			'Can be `first` when asking for one memorized stage or age.'
		]
	},
	{
		id: 'negative.exception',
		slug: 'negative-exception',
		kind: 'cognitive',
		title: 'Negative Exception',
		useWhen:
			'The learner must identify a false, NOT, EXCEPT, least likely, or not indicated option.',
		doNotUseWhen: 'A positive framing would test the same skill more cleanly.',
		stemPatterns: [
			'Which is NOT [true/indicated]?',
			'All are true EXCEPT...',
			'Which is least likely?'
		],
		keyParts: [
			'Stem highlights the negative task.',
			'Correct answer is the exception.',
			'Distractors are true members of the category.',
			'Rationale states the positive rule and why the exception is outside it.'
		],
		considerations: [
			'Avoid double negatives.',
			'Use negative questions only when the boundary is educationally meaningful.',
			'Capitalize NOT or EXCEPT in final generated stems.'
		],
		reasoningOrderFit: [
			'Order depends on the underlying cognitive task.',
			'Use `first` for simple false/NOT recall, `second` for concept boundaries, and `third` for case-based exceptions.'
		]
	},
	{
		id: 'format.single_best',
		slug: 'format-single-best',
		kind: 'format',
		title: 'Format Single Best',
		useWhen: 'One answer is best and the options are mutually exclusive enough for fair grading.',
		doNotUseWhen: 'Several options are independently true.',
		stemPatterns: [
			'Which option is best?',
			'What is the most likely [answer]?',
			'Which value is correct?'
		],
		keyParts: [
			'Stem asks for one best answer.',
			'Options are parallel and mutually exclusive.',
			'Correct answer is the best-supported option.',
			'Rationale explains why the distractors lose.'
		],
		considerations: [
			'Single-best does not mean all other options are impossible.',
			'Use "most likely" or "best" when distractors could be conditionally true.',
			'Do not use for feature sets.'
		],
		reasoningOrderFit: [
			'Format does not determine order.',
			'Use the cognitive task to choose `first`, `second`, or `third`.'
		]
	},
	{
		id: 'format.select_all',
		slug: 'format-select-all',
		kind: 'format',
		title: 'Format Select All',
		useWhen:
			'The learner should identify multiple true options from an independently judgeable set.',
		doNotUseWhen: 'The question has only one supported answer.',
		stemPatterns: [
			'Which of the following are true?',
			'Select all that apply.',
			'Which options are recommended?'
		],
		keyParts: [
			'Stem makes multiple correct answers expected.',
			'Options are independently true or false.',
			'Correct answer set is complete.',
			'Rationale groups why each correct answer belongs.'
		],
		considerations: [
			'Avoid hidden multi-select.',
			'Do not make one option a prerequisite for another unless the UI supports it.',
			'Use for category boundaries and management bundles.'
		],
		reasoningOrderFit: [
			'Format does not determine order.',
			'Often `second` because multiple claims are evaluated, but can be `first` for direct list recall or `third` for management bundles.'
		]
	},
	{
		id: 'format.true_false',
		slug: 'format-true-false',
		kind: 'format',
		title: 'Format True False',
		useWhen: 'One claim is worth evaluating directly.',
		doNotUseWhen: 'The claim is trivial or has unhandled exceptions.',
		stemPatterns: ['[Concept boundary claim].', '[Mechanism claim].', '[Comparison claim].'],
		keyParts: [
			'Stem is a single clear claim.',
			'Answer is true or false.',
			'Rationale explains the boundary.',
			'No hidden qualifiers are required.'
		],
		considerations: [
			'Avoid absolutes unless they are true.',
			'True/false is strong for misconception correction.',
			'The rationale carries most of the teaching value.'
		],
		reasoningOrderFit: [
			'Format does not determine order.',
			'Use `first` for a direct fact claim and `second` for a mechanism or distinction claim.'
		]
	},
	{
		id: 'format.matching',
		slug: 'format-matching',
		kind: 'format',
		title: 'Format Matching',
		useWhen: 'Several prompts map cleanly to answers in the same family.',
		doNotUseWhen: 'The pairings are unrelated trivia.',
		stemPatterns: [
			'Match each [prompt family] with its [answer family].',
			'Classify each prompt as [category A] or [category B].'
		],
		keyParts: [
			'Stem defines the mapping task.',
			'Prompts are homogeneous.',
			'Answers are homogeneous.',
			'Rationale explains the organizing principle.'
		],
		considerations: [
			'Use 3-7 prompts for most generated questions.',
			'Reused answers are fine if classification is the goal.',
			'Keep prompt and answer labels clean.'
		],
		reasoningOrderFit: [
			'Format does not determine order.',
			'Use `first` for direct associations, `second` for classification or sequencing, and `third` only if the matching depends on case integration.'
		]
	},
	{
		id: 'format.fill_blank',
		slug: 'format-fill-blank',
		kind: 'format',
		title: 'Format Fill Blank',
		useWhen: 'Exact text, accepted synonyms, abbreviation variants, or numeric entry matters.',
		doNotUseWhen: 'The correct answer has too many valid phrasings to enumerate.',
		stemPatterns: [
			'What is the name of [concept]?',
			'What value/range is expected?',
			'You should avoid [action] when the patient has _____.'
		],
		keyParts: [
			'Stem asks for an exact response.',
			'Accepted answers include spelling, abbreviation, unit, and synonym variants.',
			'Rationale explains why the answer matters.',
			'Grading mode is explicit through exact or contains prefixes.'
		],
		considerations: [
			'Use exact when precision matters.',
			'Use contains when the expected answer may appear inside a longer phrase.',
			'Add unit variants for numeric answers.'
		],
		reasoningOrderFit: [
			'Format does not determine order.',
			'Usually `first` for exact term or number recall; can be `second` for applied threshold entry.'
		]
	},
	{
		id: 'format.media_interpretation',
		slug: 'format-media-interpretation',
		kind: 'format',
		title: 'Format Media Interpretation',
		useWhen: 'The skill depends on an image, field, graph, appearance, or diagram.',
		doNotUseWhen: 'The media is decorative or unnecessary.',
		stemPatterns: [
			'Analyze the following image.',
			'What does this appearance suggest?',
			'Which diagnosis matches this field/graph?'
		],
		keyParts: [
			'Stem directs attention to the media.',
			'Media row has useful alt text or caption when available.',
			'Correct answer interprets the media.',
			'Rationale names the visible cue.'
		],
		considerations: [
			'Do not convert visual skills into generic prose.',
			'Generated media questions should require the media to answer.',
			'Use solution-only media intentionally, not by accident.'
		],
		reasoningOrderFit: [
			'Format does not determine order by itself.',
			'Usually `second` for image/test interpretation and `third` when the media drives diagnosis or management.'
		]
	}
] as const satisfies readonly QuestionTemplateDefinition[];

export const questionTemplateDefinitionsById = questionTemplateDefinitions.reduce(
	(definitionsById, definition) => {
		definitionsById[definition.id] = definition;
		return definitionsById;
	},
	{} as Record<QuestionTemplateId, QuestionTemplateDefinition>
);

export function getQuestionTemplateDefinition(templateId: QuestionTemplateId) {
	return questionTemplateDefinitionsById[templateId];
}

function findGuidance(
	definition: QuestionTemplateDefinition,
	terms: readonly string[],
	fallbackIndex: number
) {
	const match = definition.keyParts.find((part) => {
		const lower = part.toLowerCase();
		return terms.some((term) => lower.includes(term));
	});
	return match ?? definition.keyParts[fallbackIndex] ?? definition.keyParts[0];
}

function optionGuidanceFor(definition: QuestionTemplateDefinition) {
	const distractorGuidance = definition.keyParts.find((part) =>
		part.toLowerCase().includes('distractor')
	);
	if (distractorGuidance) return distractorGuidance;

	const optionGuidance = definition.keyParts.find((part) => {
		const lower = part.toLowerCase();
		return (
			(lower.includes('option') || lower.includes('accepted answers')) &&
			!lower.includes('correct option')
		);
	});
	if (optionGuidance) return optionGuidance;

	const hiddenQualifierGuidance = definition.keyParts.find((part) =>
		part.toLowerCase().includes('hidden qualifier')
	);
	return hiddenQualifierGuidance ?? definition.keyParts[2] ?? definition.keyParts[0];
}

function joinShort(items: readonly string[], maxItems: number) {
	return items.slice(0, maxItems).join(' | ');
}

export function questionTemplatePromptCardLines(templateId: QuestionTemplateId) {
	const definition = getQuestionTemplateDefinition(templateId);
	const answerGuidance = findGuidance(
		definition,
		['correct answer', 'correct option', 'answer is'],
		1
	);
	const optionGuidance = optionGuidanceFor(definition);
	const rationaleGuidance = findGuidance(definition, ['rationale'], definition.keyParts.length - 1);
	return [
		`Template: ${definition.id} (${definition.title})`,
		`Kind: ${definition.kind}`,
		`Reasoning-order fit: ${definition.reasoningOrderFit.join(' ')}`,
		`Use when: ${definition.useWhen}`,
		`Avoid when: ${definition.doNotUseWhen}`,
		`Stem patterns: ${joinShort(definition.stemPatterns, 3)}`,
		`Stem/anatomy: ${definition.keyParts[0]}`,
		`Answer contract: ${answerGuidance}`,
		`Distractors/options: ${optionGuidance}`,
		`Rationale: ${rationaleGuidance}`,
		`Watch for: ${joinShort(definition.considerations, 3)}`
	];
}

export function questionTemplatePromptCard(templateId: QuestionTemplateId) {
	return questionTemplatePromptCardLines(templateId).join('\n');
}

export function questionTemplatePromptCards(templateIds: readonly QuestionTemplateId[]) {
	return templateIds.map((templateId) => questionTemplatePromptCard(templateId)).join('\n\n');
}
