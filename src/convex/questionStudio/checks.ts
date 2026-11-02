/** Deterministic item-writing checks. Failures go back to the model through the repair or
 * replacement loop, so they cost a retry rather than a curator's time. */

type Item = { stem: string; options: string[]; answerIndex: number; rationale: string };

const plain = (text: string) =>
	text
		.normalize('NFKC')
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
const wordCount = (text: string) => plain(text).split(' ').filter(Boolean).length;

/** Writer and reviewer vocabulary that should never reach students. */
export function hasRubricVocabulary(text: string) {
	return /\b(?:near[- ]miss(?:es)?|distractors?|closest\s+(?:wrong|incorrect|alternative|miss|error|choice|option|competitor|confusion)|tempting\s+(?:choice|option|answer|pick)|(?:likely|common|tempting)\s+wrong\s+(?:pick|choice|answer|option)|wrong\s+pick)\b/i.test(
		plain(text)
	);
}

const CONNECTORS = [' whereas ', ' while ', ' with ', ' but ', '; '];

/** Options built by crossing two features (A+X, A+Y, B+X, B+Y) or by "both"/"neither" variants. */
export function isFeatureGrid(options: string[]) {
	const normalized = options.map((option) => plain(option).toLowerCase());
	if (normalized.filter((option) => /^(?:both|neither)\b/.test(option)).length >= 2) return true;
	return CONNECTORS.some((connector) => {
		const parts = normalized.map((option) => option.split(connector));
		if (parts.some((split) => split.length !== 2)) return false;
		return (
			new Set(parts.map(([first]) => first)).size <= 2 &&
			new Set(parts.map(([, second]) => second)).size <= 2
		);
	});
}

const PERSON =
	/\b(?:patients?|\d{1,3}[- ](?:year|month|week)[- ]old|man|woman|child|boy|girl|infant|adult|newborn|student)\b/i;
const CLINICAL_DETAIL =
	/\b(?:presents?|presenting|reports?|complains?|history|exam(?:ination)?|shows?|finds?|found|symptoms?|signs?|findings?|diagnos\w*|acuity|vision|pain|tests?|testing|measured|retinoscopy|fundus|labs?|treat\w*|prescri\w*)\b/i;

/** Cheap type screens; the type contracts themselves are judged by the writer and the eval. */
export function typeIssues(stem: string, questionType: 'learn' | 'clinical' | 'criticalThinking') {
	const text = plain(stem);
	if (questionType === 'learn' && /\b\d{1,3}[- ]year[- ]old\b/i.test(text))
		return ['Learn stems test the concept directly, without a patient vignette.'];
	if (questionType === 'clinical' && !(PERSON.test(text) && CLINICAL_DETAIL.test(text)))
		return ['A Clinical stem needs a patient with findings, history or a clinical decision.'];
	return [];
}

const ECHO_STOPWORDS = new Set(
	'which what where while these those their there about after before other following usually typically typical common commonly characteristic patient patients cause causes caused finding findings would could should most likely between during within without'.split(
		' '
	)
);
const roots = (text: string) =>
	new Set(
		(
			plain(text)
				.toLowerCase()
				.match(/[a-z]{5,}/g) ?? []
		)
			.filter((word) => !ECHO_STOPWORDS.has(word))
			.map((word) => word.slice(0, 6))
	);

/** Stem words whose root reappears in the key and in no wrong option, e.g. "calcified valve" →
 * "calcific". A reader can match the key to the stem without knowing the concept. */
export function stemEchoes(item: Item) {
	const stem = roots(item.stem);
	const others = item.options.filter((_, index) => index !== item.answerIndex).map(roots);
	return [...roots(item.options[item.answerIndex] ?? '')].filter(
		(root) => stem.has(root) && others.every((option) => !option.has(root))
	);
}

export const CUE_FEEDBACK =
	'A test-wise reader picked the key from the options alone, twice. Remove the cue: make every wrong option as specific and plausible as the key, drop qualifiers such as alone or only, and do not let the key be the only option that shares the stem’s salient feature.';

export function itemWritingIssues(item: Item): string[] {
	const issues: string[] = [];
	if ([item.stem, item.rationale, ...item.options].some(hasRubricVocabulary))
		issues.push(
			'Refer to options by their content; never call one a distractor, near miss, closest, or tempting choice.'
		);
	if (
		/\b(?:is|are)\s+(?:classified|grouped|categorized|labeled)\s+(?:as|with|among|under)\b/i.test(
			plain(item.stem)
		)
	)
		issues.push(
			'The stem asks how items are classified or grouped. Ask about the concept that makes the answer true.'
		);
	if (isFeatureGrid(item.options))
		issues.push(
			'Options cross two features or use both/neither variants, so the key can be found by elimination. Write four distinct alternatives from one category.'
		);
	if (item.options.some((option) => /\b(?:all|none) of the (?:above|options)\b/i.test(option)))
		issues.push('Replace all-of-the-above or none-of-the-above options.');
	const lengths = item.options.map((option) => plain(option).length);
	const others = lengths.filter((_, index) => index !== item.answerIndex);
	const meanOther = others.reduce((sum, length) => sum + length, 0) / others.length;
	const key = lengths[item.answerIndex] ?? 0;
	if (key >= meanOther * 1.5 && key - meanOther >= 25)
		issues.push(
			'The correct option is conspicuously longer than the others; make lengths parallel.'
		);
	// One shared root is often a legitimate topic word; two rarely are (3% of judged good items).
	const echoes = stemEchoes(item);
	if (echoes.length >= 2)
		issues.push(
			`Only the key repeats the stem's wording (${echoes.join(', ')}…), so it can be matched without the concept. Reword the stem or give a wrong option the same term.`
		);
	const absolute = /\b(?:only|always|never)\b/i;
	if (
		absolute.test(plain(item.options[item.answerIndex] ?? '')) &&
		!item.options.some(
			(option, index) => index !== item.answerIndex && absolute.test(plain(option))
		)
	)
		issues.push(
			'Only the key uses an absolute word such as only; rephrase so wording gives nothing away.'
		);
	const words = wordCount(item.rationale);
	if (words < 20 || words > 130)
		issues.push(
			`Rationale is ${words} words; state the rule, apply it, and give each wrong option one clause in about 40–90 words.`
		);
	return issues;
}
