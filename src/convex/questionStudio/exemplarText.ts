/** Text side of the exemplar bank: HTML stripping, the candidate screen, type/shape heuristics and the rubric. */
import type { QuestionType } from './questionTypes';

/** Classes whose human-looking rows were bulk-imported and machine-polished (human-exemplars.md). */
export const EXCLUDED_EXEMPLAR_CLASSES = ['Clinical Immunology and Microbiology', 'Low Vision'];
/** Bulk-imported faculty sets whose rationales were later revised: rows edited after this are skipped. */
export const REVISED_CLASS_CUTOFFS: Record<string, number> = {
	'Systemic Disease': Date.UTC(2026, 9, 1)
};

export const EXEMPLAR_SHAPES = [
	'mechanism-effect',
	'test-purpose',
	'threshold-use',
	'diagnosis-from-findings',
	'contraindication',
	'constraint-application',
	'parallel-causes',
	'other'
] as const;
export type ExemplarShape = (typeof EXEMPLAR_SHAPES)[number];

export function plainText(html: string | undefined) {
	return (html ?? '')
		.replace(/<\s*br\s*\/?>/gi, ' ')
		.replace(/<\/(p|div|li|h\d)>/gi, ' ')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
		.replace(/\s+/g, ' ')
		.trim();
}

export function wordCount(text: string) {
	return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

// ---------------------------------------------------------------------------
// Candidate screen

export type RawQuestion = {
	_id: string;
	type: string;
	status: string;
	stem: string;
	options: { id: string; text: string }[];
	correctAnswers: string[];
	rationale?: string;
	explanation?: string;
	aiGenerated: boolean;
	updatedAt?: number;
	deletedAt?: number;
	metadata?: { generation?: unknown };
};

export const IMAGE_PATTERN =
	/\b(following|this|these|the above|the below)\s+(picture|image|figure|photo|photograph|diagram|graph|chart|table|scan|oct|fundus photo|topography|visual field)s?\b|\bshown\s+(here|below|above|in the)\b|\bpictured\b|\b(image|figure|photo)\s+(below|above)\b|\bsee (the )?(image|figure|photo)\b/i;

/** Human-written: no generation metadata and not flagged as AI-generated. */
export function isHumanWritten(question: Pick<RawQuestion, 'aiGenerated' | 'metadata'>) {
	return !question.metadata?.generation && question.aiGenerated !== true;
}

/** Returns why a question can't be an exemplar, or null when it qualifies. */
export function exemplarRejection(
	question: RawQuestion,
	context: { className?: string; hasMedia?: boolean }
): string | null {
	if (question.deletedAt) return 'deleted';
	if (!isHumanWritten(question)) return 'ai-generated';
	if (context.className && EXCLUDED_EXEMPLAR_CLASSES.includes(context.className))
		return 'provenance';
	const revisedCutoff = context.className ? REVISED_CLASS_CUTOFFS[context.className] : undefined;
	if (revisedCutoff && (question.updatedAt ?? 0) >= revisedCutoff) return 'revised-after-import';
	if (question.status !== 'published') return 'unpublished';
	if (question.type !== 'multiple_choice') return 'not-multiple-choice';
	if (question.correctAnswers.length !== 1) return 'multi-select';
	if (question.options.length < 4 || question.options.length > 6) return 'option-count';
	if (!question.options.some((option) => option.id === question.correctAnswers[0]))
		return 'broken-key';
	const stem = plainText(question.stem);
	const rationale = plainText(question.rationale ?? question.explanation);
	if (wordCount(rationale) < 8) return 'no-rationale';
	if (context.hasMedia || IMAGE_PATTERN.test(stem)) return 'media';
	if (wordCount(stem) < 4) return 'stem-too-short';
	if (question.options.some((option) => !plainText(option.text))) return 'empty-option';
	return null;
}

// ---------------------------------------------------------------------------
// Type and shape heuristics

const AGE_PATTERN = /\b\d{1,3}[- ](year|yr|month|week|day)s?[- ]old\b|\b\d{1,3}\s?(yo|y\/o)\b/i;
const VIGNETTE_PATTERN =
	/\b(patient|pt\.?|man|woman|male|female|boy|girl|child|infant|baby|mother|father|wife|husband|adult|teenager|student|nurse|athlete)\b[^.?]{0,80}\b(presents?|comes?|came|reports?|complains?|arrives?|is seen|visits?|returns?|walks in|notices?|has|had|was|is)\b|\byour (patient|\d{1,3}[- ]year[- ]old)\b|\b(presents?|presented) (to|with|for)\b|\bon (exam|examination|slit lamp|gonioscopy|dilated)\b|\bexam(ination)? (reveals|shows)\b|\bchief complaint\b|\bhistory of\b|\b(you|clinician) (diagnose|examine|notice|find|observe|see)\b/i;
const FINDING_PATTERN =
	/\b(\d{2}\/\d{2,3}|\d+\s?(mm ?hg|mmhg|µm|um|mm|d|pd|diopters?|degrees|°|mg|ml|%|bpm))\b|\b(VA|BCVA|IOP|C\/D|BP|OD|OS|OU)\b|\b(no|without|denies|negative for|normal|ruled out)\b/gi;
const CONSTRAINT_PATTERN =
	/\b(allerg(y|ic|ies)|pregnan(t|cy)|breastfeeding|nursing|already (taking|on)|currently (taking|on)|history of|ruled out|cannot|can't|unable to|contraindicat|renal|hepatic|asthma|copd|heart block|bradycardia|sulfa|penicillin|insurance|cost|compliance|adheren)/i;
const REASONING_PATTERN =
	/\b(most likely (explain|explanation|reason|cause|mechanism)|best explains?|would (most likely )?(result|happen|occur|change|explain)|what would happen|predict|if .{3,80}, (which|what|how)|assuming|why (would|might|is|does)|next (best )?step|most appropriate (next|management|treatment))\b/i;

export function isVignette(stem: string) {
	return AGE_PATTERN.test(stem) || VIGNETTE_PATTERN.test(stem);
}

function findingCount(stem: string) {
	return (stem.match(FINDING_PATTERN) ?? []).length;
}

/**
 * Learn: direct recall or a distinction, no vignette. Clinical: a patient scenario or finding.
 * Critical thinking: a scenario plus a second relationship (a constraint, competing explanation, or
 * a dense multi-finding case), or a non-clinical prediction/explanation item.
 */
export function classifyQuestionType(stem: string): QuestionType {
	const words = wordCount(stem);
	const vignette = isVignette(stem);
	const findings = findingCount(stem);
	const constraint = CONSTRAINT_PATTERN.test(stem);
	const reasoning = REASONING_PATTERN.test(stem);
	if (vignette) {
		const sentences = stem.split(/[.?!]\s/).length;
		if (
			(constraint &&
				words >= 30 &&
				/\b(which|what)\b.*\b(medication|drug|treatment|therapy|management|prescribe|avoid|choose|best)\b/i.test(
					stem
				)) ||
			(reasoning && words >= 30) ||
			(words >= 70 && findings >= 4 && sentences >= 4)
		)
			return 'criticalThinking';
		if (words >= 18 || AGE_PATTERN.test(stem)) return 'clinical';
	}
	if (!vignette && reasoning && words >= 18) return 'criticalThinking';
	return 'learn';
}

const NUMERIC_OPTION =
	/^[<>≤≥~]?\s*-?\d+(\.\d+)?\s*(-|–|to)?\s*(\d+(\.\d+)?)?\s*(%|[a-zµ/°]+.*)?$/i;

function commonPrefixWords(a: string, b: string) {
	const left = a.toLowerCase().split(/\s+/);
	const right = b.toLowerCase().split(/\s+/);
	let count = 0;
	while (count < left.length && count < right.length && left[count] === right[count]) count += 1;
	return count;
}

function sharesStructure(options: string[]) {
	for (let i = 0; i < options.length; i++) {
		for (let j = i + 1; j < options.length; j++) {
			if (commonPrefixWords(options[i], options[j]) >= 3) return true;
		}
	}
	return false;
}

export function classifyShape(
	stem: string,
	options: string[],
	questionType: QuestionType
): ExemplarShape {
	const s = stem.toLowerCase();
	const scenario = questionType !== 'learn';
	if (
		/\bcontraindicat|\bshould (you |be )?(avoid|not)|\bavoid(ed)?\b|\bnot (be )?(indicated|recommended|appropriate|prescribed|used|safe)\b|\bcaution\b|\bunsafe\b/.test(
			s
		)
	)
		return 'contraindication';
	if (
		/\b(which|what|best|appropriate|most useful|first)\b[^?]{0,40}\b(test|testing|exam|examination|measurement|procedure|imaging|study|technique|instrument|assessment|lens|stain)\b|\bused to (assess|measure|evaluate|differentiate|detect|diagnose|confirm|quantify)\b|\b(differentiate|distinguish|confirm|rule out)\b[^?]{0,60}\b(test|measure|exam)/.test(
			s
		)
	)
		return 'test-purpose';
	const numeric = options.filter((option) => NUMERIC_OPTION.test(option.trim())).length;
	if (
		numeric >= Math.ceil(options.length * 0.75) ||
		/\b(threshold|cut-?off|at what (level|value|age|pressure|dose)|how (many|much|long|often)|normal (range|value|limit)|upper limit|lower limit|what (value|level|dose|percentage))\b/.test(
			s
		)
	)
		return 'threshold-use';
	if (
		scenario &&
		/\b(cause|caused|explanation|explains|etiology|reason)\b/.test(s) &&
		sharesStructure(options)
	)
		return 'parallel-causes';
	if (
		scenario &&
		/\b(diagnosis|diagnose|most likely (has|have|condition|cause|etiology|explanation|disease|dx)|most consistent with|consistent with|what (condition|disease)|suspect|differential|what is (the|your) (most likely )?(diagnosis|dx|condition)|what does (the patient|he|she) (most likely )?have)\b/.test(
			s
		)
	)
		return 'diagnosis-from-findings';
	if (
		scenario &&
		/\b(treat|treatment|manage|management|prescribe|medication|drug|therapy|next step|best course|most appropriate|recommend|refer)\b/.test(
			s
		)
	)
		return 'constraint-application';
	if (
		/\bmechanism|\bmoa\b|\breceptors?\b|\b(stimulat|inhibit|block|antagoni|agoni|activat|bind)\w*|\b(leads? to|results? in|cause[sd]?|due to|effect of|responsible for|role of|function of|why|because|mediat|produc|secret|innervat|increase|decrease)\w*/.test(
			s
		)
	)
		return 'mechanism-effect';
	if (scenario && /\b(cause|why|explain)\b/.test(s)) return 'parallel-causes';
	return 'other';
}

// ---------------------------------------------------------------------------
// Rubric

const STOPWORDS = new Set(
	'the a an and or of to in on for with without by from at as is are was were be been being this that these those which what who whom whose it its into than then there their they them can could would should may might will shall not no both either neither each other more most less least very only also such any all some one two three four five six over under between about after before during while because'.split(
		' '
	)
);

function significantTokens(text: string) {
	return [
		...new Set(
			text
				.toLowerCase()
				.replace(/[^a-z0-9µ%\-/. ]+/g, ' ')
				.split(/[\s/]+/)
				.map((token) => token.replace(/^[-.]+|[-.]+$/g, ''))
				.filter(
					(token) =>
						(token.length >= 3 || (/\d/.test(token) && token.length >= 2)) && !STOPWORDS.has(token)
				)
		)
	];
}

/** Distractors the rationale engages with: the option text or most of its distinctive tokens appear. */
export function addressedDistractors(rationale: string, options: string[], correctIndex: number) {
	const r = rationale.toLowerCase();
	const rTokens = new Set(significantTokens(rationale));
	const correctTokens = new Set(significantTokens(options[correctIndex] ?? ''));
	let addressed = 0;
	options.forEach((option, index) => {
		if (index === correctIndex) return;
		const text = option.toLowerCase().trim();
		if (text.length >= 3 && r.includes(text)) {
			addressed += 1;
			return;
		}
		const tokens = significantTokens(option).filter((token) => !correctTokens.has(token));
		if (tokens.length === 0) return;
		// Substring hits catch plurals and suffixes; short tokens must match whole.
		const hits = tokens.filter(
			(token) => rTokens.has(token) || (token.length >= 5 && r.includes(token))
		).length;
		if (hits >= Math.max(1, Math.ceil(tokens.length / 2))) addressed += 1;
	});
	return addressed;
}

export type RubricResult = {
	score: number;
	distractorsAddressed: number;
	completeQuestion: boolean;
	parallelOptions: boolean;
	noAllNone: boolean;
	noLetters: boolean;
	lengthOk: boolean;
	plainRegister: boolean;
	positiveStem: boolean;
};

const ALL_NONE =
	/\b(all|none|both|neither) of (the )?(above|these|the following)\b|^(all|none|both) (of )?(the )?above$|^(a|b|c|d) (and|&) (b|c|d|e)$/i;
const LETTER_OPTION = /^\(?[a-fA-F][.)]\s+/;
const LETTER_REFERENCE = /\b(option|answer|choice)\s+[A-F]\b|\([A-F]\)|\b[A-F]\) /;
const LOCAL_VOICE =
	/\b(dr\.?\s+[A-Z][a-z]+|professor|prof\.|lecture|lectures|slides?|powerpoint|in class|on the (test|exam|quiz)|lol|haha)\b|!{2,}|:\)/;

export function scoreRubric(input: {
	stem: string;
	options: string[];
	correctIndex: number;
	rationale: string;
	questionType: QuestionType;
	/** A model judged the register informal (jokes, anecdotes, asides). */
	informal?: boolean;
}): RubricResult {
	const { stem, options, correctIndex, rationale, questionType } = input;
	const distractors = options.length - 1;
	const addressed = addressedDistractors(rationale, options, correctIndex);
	const lowered = stem.toLowerCase();
	const completeQuestion =
		(/\?\s*$/.test(stem) || /\b(which|what|how|why|when|where|who)\b/i.test(stem)) &&
		!/_{3,}|\.\.\.\s*$|:\s*$/.test(stem) &&
		!/which (of the following )?(statements? )?(is|are) (the )?((most|least) )?(true|correct|false|incorrect|accurate)\b/.test(
			lowered
		) &&
		!/\ball of the following\b/.test(lowered);
	const lengths = options.map((option) => Math.max(1, wordCount(option)));
	const distractorLengths = lengths.filter((_, index) => index !== correctIndex);
	const meanDistractor = distractorLengths.reduce((sum, value) => sum + value, 0) / distractors;
	const parallelOptions =
		Math.max(...lengths) / Math.min(...lengths) <= 4 &&
		lengths[correctIndex] <= Math.max(3, meanDistractor * 1.75);
	const noAllNone = !options.some((option) => ALL_NONE.test(option.trim()));
	const noLetters =
		!options.some((option) => LETTER_OPTION.test(option.trim())) &&
		!LETTER_REFERENCE.test(rationale);
	const stemWords = wordCount(stem);
	const rationaleWords = wordCount(rationale);
	const stemOk =
		questionType === 'learn'
			? stemWords >= 6 && stemWords <= 45
			: stemWords >= 18 && stemWords <= 160;
	const lengthOk = stemOk && rationaleWords >= 25 && rationaleWords <= 150;
	const plainRegister = !input.informal && !LOCAL_VOICE.test(stem) && !LOCAL_VOICE.test(rationale);
	// Negative stems are valid but over-represented among items whose rationale covers every option.
	const positiveStem = !/\b(NOT|EXCEPT|LEAST)\b/.test(stem);

	const distractorScore =
		addressed >= distractors ? 1 : addressed >= 2 ? 0.8 : addressed === 1 ? 0.35 : 0;
	const rationaleLengthScore =
		rationaleWords >= 25 && rationaleWords <= 150
			? 1
			: rationaleWords >= 15 && rationaleWords <= 220
				? 0.5
				: 0;
	const score =
		0.3 * distractorScore +
		0.15 * Number(completeQuestion) +
		0.15 * Number(parallelOptions) +
		0.1 * Number(noAllNone) +
		0.05 * Number(noLetters) +
		0.08 * Number(stemOk) +
		0.07 * rationaleLengthScore +
		0.1 * Number(plainRegister) -
		0.05 * Number(!positiveStem);
	return {
		score,
		distractorsAddressed: addressed,
		completeQuestion,
		parallelOptions,
		noAllNone,
		noLetters,
		lengthOk,
		plainRegister,
		positiveStem
	};
}

export type ExemplarText = {
	stem: string;
	options: string[];
	correctIndex: number;
	rationale: string;
};

/** Plain-text stem, options and rationale for a qualifying question. */
export function exemplarText(question: RawQuestion): ExemplarText {
	return {
		stem: plainText(question.stem),
		options: question.options.map((option) => plainText(option.text)),
		correctIndex: question.options.findIndex((option) => option.id === question.correctAnswers[0]),
		rationale: plainText(question.rationale ?? question.explanation)
	};
}
