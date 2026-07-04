import fs from 'fs';
import path from 'path';
import {
	questionTemplateDefinitions,
	questionTemplatePromptCard
} from '../../../src/convex/questionStudio/templateTaxonomy.ts';

const root = path.resolve('dev/question-template-system');
const outputRoot = path.join(root, 'template-anatomies');
const EXAMPLES_PER_TEMPLATE = 12;

function readConvexJson(filePath) {
	const raw = fs.readFileSync(filePath, 'utf8').replace(/^\([^\n]+\) .*\n/gm, '');
	return JSON.parse(raw);
}

const questions = readConvexJson('/tmp/learnterms-prod-question-latest-20000.json');
const modules = readConvexJson('/tmp/learnterms-prod-modules.json');
const classes = readConvexJson('/tmp/learnterms-prod-classes.json');
const mediaRows = fs.existsSync('/tmp/learnterms-prod-question-media.json')
	? readConvexJson('/tmp/learnterms-prod-question-media.json')
	: [];

const moduleById = new Map(modules.map((module) => [module._id, module]));
const classById = new Map(classes.map((classDoc) => [classDoc._id, classDoc]));
const mediaByQuestionId = new Map();
for (const media of mediaRows) {
	const rows = mediaByQuestionId.get(media.questionId) ?? [];
	rows.push(media);
	mediaByQuestionId.set(media.questionId, rows);
}

function decodeHtml(value) {
	return String(value ?? '')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n')
		.replace(/<\/li>/gi, '\n')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&rsquo;/g, "'")
		.replace(/&lsquo;/g, "'")
		.replace(/&rdquo;/g, '"')
		.replace(/&ldquo;/g, '"')
		.replace(/&ndash;/g, '-')
		.replace(/&mdash;/g, '-')
		.replace(/\s+/g, ' ')
		.trim();
}

function ascii(value) {
	return String(value ?? '')
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[\u2019\u2018]/g, "'")
		.replace(/[\u201c\u201d]/g, '"')
		.replace(/[\u2013\u2014]/g, '-')
		.replace(/[\u2192]/g, '->')
		.replace(/[\u2248]/g, '~')
		.replace(/[\u2264]/g, '<=')
		.replace(/[\u2265]/g, '>=')
		.replace(/[\u00b1]/g, '+/-')
		.replace(/[\u00b0]/g, ' degrees')
		.replace(/[\u00b5]/g, 'u')
		.replace(/[\u2122\u00ae\u00a9]/g, '')
		.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
}

function text(value) {
	return ascii(decodeHtml(value));
}

function includesAny(value, terms) {
	const haystack =
		`${text(value.stem)} ${text(value.rationale ?? value.explanation ?? '')}`.toLowerCase();
	return terms.some((term) => haystack.includes(term));
}

function stemMatchesAny(value, patterns) {
	const haystack = text(value.stem);
	return patterns.some((pattern) => pattern.test(haystack));
}

function matchesAny(value, patterns) {
	const haystack = `${text(value.stem)} ${text(value.rationale ?? value.explanation ?? '')}`;
	return patterns.some((pattern) => pattern.test(haystack));
}

function questionContext(question) {
	const module = moduleById.get(question.moduleId);
	const classDoc = module?.classId ? classById.get(module.classId) : null;
	return {
		module,
		classDoc,
		moduleTitle: module?.title ?? 'Unknown module',
		moduleDescription: module?.description ?? '',
		className: classDoc?.name ?? 'Unknown class',
		classCode: classDoc?.code ?? ''
	};
}

function correctAnswerDetails(question) {
	const ids = new Set(question.correctAnswers ?? []);
	if (question.type === 'matching') {
		return (question.correctAnswers ?? []).map((pair) => {
			const [promptId, answerIdRaw] = String(pair).split('::');
			const prompt = question.options?.find((option) => option.id === promptId);
			const answerTexts = String(answerIdRaw ?? '')
				.split('|')
				.map(
					(answerId) => question.options?.find((option) => option.id === answerId)?.text ?? answerId
				)
				.map(text);
			return {
				raw: pair,
				promptId,
				promptText: text(prompt?.text ?? promptId),
				answerIds: String(answerIdRaw ?? '').split('|'),
				answerText: answerTexts.join(' | ')
			};
		});
	}

	return (question.correctAnswers ?? []).map((answerId) => {
		const option = question.options?.find(
			(candidate) => candidate.id === answerId || candidate.text === answerId
		);
		return {
			raw: answerId,
			optionId: option?.id ?? null,
			text: text(option?.text ?? answerId)
		};
	});
}

function optionLines(question) {
	const correctIds = new Set(question.correctAnswers ?? []);
	const correctText = new Set(correctAnswerDetails(question).map((answer) => answer.text));
	return (question.options ?? []).map((option) => {
		const correct =
			correctIds.has(option.id) ||
			correctIds.has(option.text) ||
			correctText.has(text(option.text)) ||
			(question.type === 'matching' &&
				(question.correctAnswers ?? []).some((pair) => String(pair).includes(option.id)));
		return `  - id: \`${ascii(option.id)}\`\n    text: ${markdownQuote(text(option.text))}\n    correct_or_used: ${correct ? 'true' : 'false'}`;
	});
}

function mediaLines(question) {
	const rows = mediaByQuestionId.get(question._id) ?? [];
	if (rows.length === 0) return ['  - none'];
	return rows.map((row) =>
		[
			`  - id: \`${ascii(row._id)}\``,
			`    mediaType: \`${ascii(row.mediaType ?? '')}\``,
			`    mimeType: \`${ascii(row.mimeType ?? '')}\``,
			`    altText: ${markdownQuote(text(row.altText ?? ''))}`,
			`    caption: ${markdownQuote(text(row.caption ?? ''))}`,
			`    showOnSolution: ${row.showOnSolution === true ? 'true' : 'false'}`,
			`    order: ${typeof row.order === 'number' ? row.order : 'unknown'}`
		].join('\n')
	);
}

function markdownQuote(value) {
	const clean = ascii(String(value ?? '').trim());
	if (!clean) return '""';
	return `"${clean.replace(/"/g, '\\"')}"`;
}

function scoreQuestion(question) {
	const stem = text(question.stem);
	const rationale = text(question.rationale ?? question.explanation ?? '');
	let score = 0;
	if (question.status === 'published') score += 8;
	if (rationale.length >= 80) score += 8;
	if (rationale.length >= 200) score += 4;
	if ((question.options ?? []).length >= 4) score += 4;
	if (stem.length >= 40) score += 3;
	if (stem.length <= 500) score += 2;
	if (question.createdBy) score += 2;
	if (mediaByQuestionId.has(question._id)) score += 4;
	if (question.correctAnswers?.length > 1) score += 2;
	return score;
}

const humanQuestions = questions.filter(
	(question) => question.aiGenerated === false && !question.deletedAt
);

const regex = {
	recall: [
		/\b(what is|define|definition|term|refers to|called|known as|abbreviation|stands for|name of)\b/i
	],
	quantitative: [
		/\b(\d+|percent|percentage|threshold|ratio|rate|dose|mmhg|mm|diopter|dpt|hours?|days?|weeks?|months?|years?|score|calculate|value|range|average)\b/i
	],
	recognition: [
		/\b(which of the following|which .* is|identify|recognized|finding|feature|characteristic|sign|symptom|association|true about)\b/i
	],
	compare: [
		/\b(differentiat|distinguish|compared with|versus|vs\.?|best differentiates|primary difference|tell apart|discriminate|common|classify)\b/i
	],
	mechanism: [
		/\b(why|mechanism|pathophysiology|cause|causes|due to|because|leads to|results from|responsible for|mediated by|basis for|explains|effect)\b/i
	],
	diagnosis: [
		/\b(diagnos|most likely|presents with|patient|case|history|exam|bcva|iop|what do you suspect|presentation)\b/i
	],
	interpretation: [
		/\b(interpret|indicates|suggests|observes|visual field|figure|graph|image|test|measurement|printout|appearance|result|shown)\b/i
	],
	management: [
		/\b(treat|treatment|management|manage|therapy|recommend|recommended|next step|intervention|prescribe|adjustment|follow-up|counsel|educat|refer|monitor|dose)\b/i
	],
	risk: [
		/\b(risk|adverse|side effect|contraindicat|avoid|warning|complication|toxicity|danger|safe|safety|concern|main concern)\b/i
	],
	sequence: [
		/\b(first|initial|sequence|order|step|stage|phase|progression|before|after|during|cycle|pathway|timeline|development)\b/i
	],
	negative: [/\b(not|except|least likely|false|incorrect|contraindicated|avoid|would not)\b/i]
};

const templateExampleSelectors = new Map([
	[
		'recall.definition',
		{
			preferredIds: [
				'jx72ptsy25bcq5f1hvtm47j91h85rh87',
				'jx75xw2zm57dqmr5a245nz0jnx85qkh7',
				'jx7a94kmp4b9fgwbq1rfjayheh7zy6nf'
			],
			filter: (q) =>
				stemMatchesAny(q, [
					/\b(what is the name|what is the most common|what is the term|known as|called|acronym|abbreviation|stands for|defined as)\b/i
				]) &&
				text(q.stem).length < 260 &&
				q.type !== 'matching'
		}
	],
	[
		'recall.threshold',
		{
			preferredIds: [
				'jx7egx5wg3ehfpwg24mh4zsjhh85r4ed',
				'jx728qwstd3pnf6eg78mcsadp985sdyc',
				'jx72g96178ep6zt6p56080tb9x7zgnk3'
			],
			filter: (q) =>
				stemMatchesAny(q, [
					/\b(threshold|normal range|range of normal|what percentage|what percent|how many|after how many|at what|what approximate percentage|average thickness)\b/i
				]) && text(q.stem).length < 260
		}
	],
	[
		'recognition.feature',
		{
			preferredIds: [
				'jx730z3h4gn86tdgaren7svh3n85znqz',
				'jx74bfwm9jjf9zjncspg70vms985zyjf',
				'jx7cbckma680bsrajm9dpsp5sh85sk0g'
			],
			filter: (q) =>
				q.type === 'multiple_choice' &&
				(q.correctAnswers ?? []).length === 1 &&
				stemMatchesAny(q, regex.recognition) &&
				!stemMatchesAny(q, regex.negative)
		}
	],
	[
		'recognition.feature_set',
		{
			preferredIds: [
				'jx7173kjtcw7w7327bm21dwq898610bj',
				'jx70593g6ypkyp1sgaapqapecd861f0d',
				'jx70t5nb72fgxefc7g8qp9q9h985ykf4'
			],
			filter: (q) =>
				q.type === 'multiple_choice' &&
				(q.correctAnswers ?? []).length > 1 &&
				stemMatchesAny(q, regex.recognition)
		}
	],
	[
		'discrimination.compare',
		{
			preferredIds: [
				'jx7fafwr3rggb6vd8s71jxhh717vn4j3',
				'jx7empzt4bsmg1424519z0ezx58600n9',
				'jx7fbx30jb3a8tzzywx8e4c05s85zeq1'
			],
			filter: (q) =>
				stemMatchesAny(q, regex.compare) ||
				(q.type === 'matching' && includesAny(q, ['classify', 'match']))
		}
	],
	[
		'mechanism.causal',
		{
			preferredIds: [
				'jx7brnbaecwrrazmqv76aamb7s860jy4',
				'jx7czgz2cn1df4danyx7tx8ypd861vqn',
				'jx793w94r89tdqrbn0c79ggqes85t80h'
			],
			filter: (q) =>
				matchesAny(q, regex.mechanism) && text(q.rationale ?? q.explanation ?? '').length > 120
		}
	],
	[
		'diagnosis.case',
		{
			preferredIds: [
				'jx78dkq0f3zjehk2ddrdaem63n7vfwnh',
				'jx70ne4sgqxayee3efgg5r106n7vfyt4',
				'jx72gb74hsfh6axkf2190gd2sx7sm87c'
			],
			filter: (q) => stemMatchesAny(q, regex.diagnosis) && text(q.stem).length > 120
		}
	],
	[
		'interpretation.test',
		{
			preferredIds: [
				'jx793w94r89tdqrbn0c79ggqes85t80h',
				'jx739byentsm16k3wvcd6sjv8n860ytd',
				'jx708jja3mp5k78m9y709yhdnh85rc58'
			],
			filter: (q) => stemMatchesAny(q, regex.interpretation) || mediaByQuestionId.has(q._id)
		}
	],
	[
		'management.next_step',
		{
			preferredIds: [
				'jx78dkq0f3zjehk2ddrdaem63n7vfwnh',
				'jx72gb74hsfh6axkf2190gd2sx7sm87c',
				'jx7azegy80q2xkcqgmp1bcx3r185nwgr'
			],
			filter: (q) => stemMatchesAny(q, regex.management)
		}
	],
	[
		'safety.contraindication',
		{
			preferredIds: [
				'jx7fp6hjamrf2vf1tgmh5tm6dd848vpf',
				'jx781z3v5xa2sm0xp975bz8ap981qwa0',
				'jx7956r8apxcbt01vrz1wsr5jd82d1qp'
			],
			filter: (q) =>
				stemMatchesAny(q, regex.risk) ||
				includesAny(q, ['avoid', 'contraindication', 'main concern'])
		}
	],
	[
		'sequence.timeline',
		{
			preferredIds: [
				'jx72h7xnhxpxz42sj7sewebhmn85z561',
				'jx723ewymyna2360e3htkqy5ad85zfrx',
				'jx79szq4f85g3kp1p22fk2z5jh85yp3m'
			],
			filter: (q) => stemMatchesAny(q, regex.sequence)
		}
	],
	[
		'negative.exception',
		{
			preferredIds: [
				'jx7956r8apxcbt01vrz1wsr5jd82d1qp',
				'jx74tvx6k5gby5e0pbjhn38gps846txj',
				'jx7ctbg8vqyayexbkcvmbw8z9d85mwn0'
			],
			filter: (q) => stemMatchesAny(q, regex.negative)
		}
	],
	[
		'format.single_best',
		{
			preferredIds: [
				'jx7egx5wg3ehfpwg24mh4zsjhh85r4ed',
				'jx730z3h4gn86tdgaren7svh3n85znqz',
				'jx75aga581dbf73e62fet9rbkd860mrw'
			],
			filter: (q) => q.type === 'multiple_choice' && (q.correctAnswers ?? []).length === 1
		}
	],
	[
		'format.select_all',
		{
			preferredIds: [
				'jx7173kjtcw7w7327bm21dwq898610bj',
				'jx70593g6ypkyp1sgaapqapecd861f0d',
				'jx70t5nb72fgxefc7g8qp9q9h985ykf4'
			],
			filter: (q) => q.type === 'multiple_choice' && (q.correctAnswers ?? []).length > 1
		}
	],
	[
		'format.true_false',
		{
			preferredIds: [
				'jx7czgz2cn1df4danyx7tx8ypd861vqn',
				'jx7fafwr3rggb6vd8s71jxhh717vn4j3',
				'jx79szq4f85g3kp1p22fk2z5jh85yp3m'
			],
			filter: (q) => q.type === 'true_false'
		}
	],
	[
		'format.matching',
		{
			preferredIds: [
				'jx7empzt4bsmg1424519z0ezx58600n9',
				'jx7fbx30jb3a8tzzywx8e4c05s85zeq1',
				'jx72h7xnhxpxz42sj7sewebhmn85z561'
			],
			filter: (q) => q.type === 'matching'
		}
	],
	[
		'format.fill_blank',
		{
			preferredIds: [
				'jx72ptsy25bcq5f1hvtm47j91h85rh87',
				'jx797567brqjhhnd7z23wzfkf584hfb5',
				'jx7fhaw9n56kzqq0epqbrsv4y984edv3'
			],
			filter: (q) => q.type === 'fill_in_the_blank'
		}
	],
	[
		'format.media_interpretation',
		{
			preferredIds: [
				'jx793w94r89tdqrbn0c79ggqes85t80h',
				'jx7332whck3f61y28662amy0rx84z0vh',
				'jx77dx6qxvza97ycwpjtdfcyjx84fpga'
			],
			filter: (q) => mediaByQuestionId.has(q._id)
		}
	]
]);

const templateDefs = questionTemplateDefinitions;

function exampleSelectorFor(definition) {
	const selector = templateExampleSelectors.get(definition.id);
	if (!selector) throw new Error('Missing example selector for ' + definition.id);
	return selector;
}
function selectExamples(definition) {
	const selector = exampleSelectorFor(definition);
	const preferred = (selector.preferredIds ?? [])
		.map((id) => humanQuestions.find((question) => question._id === id))
		.filter(Boolean);
	const selected = humanQuestions
		.filter(selector.filter)
		.sort((a, b) => scoreQuestion(b) - scoreQuestion(a) || b._creationTime - a._creationTime);

	const result = [...preferred];
	const existingIds = new Set(result.map((question) => question._id));
	const seenModules = new Set();
	for (const question of result) seenModules.add(question.moduleId);
	for (const question of selected) {
		if (result.length >= EXAMPLES_PER_TEMPLATE) break;
		if (existingIds.has(question._id)) continue;
		if (seenModules.has(question.moduleId) && selected.length > 5) continue;
		result.push(question);
		existingIds.add(question._id);
		seenModules.add(question.moduleId);
	}
	for (const question of selected) {
		if (result.length >= EXAMPLES_PER_TEMPLATE) break;
		if (!existingIds.has(question._id)) result.push(question);
	}
	return result.slice(0, EXAMPLES_PER_TEMPLATE);
}

function answerSummary(question) {
	return correctAnswerDetails(question)
		.map((answer) => {
			if ('promptText' in answer) return `${answer.promptText} -> ${answer.answerText}`;
			return answer.text;
		})
		.join('; ');
}

function optionStrategy(question) {
	const count = question.options?.length ?? 0;
	const correctCount = question.correctAnswers?.length ?? 0;
	if (question.type === 'matching')
		return 'The options create prompt/answer pairs rather than ordinary distractors.';
	if (question.type === 'fill_in_the_blank')
		return 'The options are accepted answer variants for exact or contains-style grading.';
	if (correctCount > 1)
		return `The ${count} options define a category boundary with ${correctCount} correct selections.`;
	return `The ${count} options create a single-best-answer decision with near-neighbor distractors.`;
}

function formatLabel(question) {
	if (question.type === 'multiple_choice' && (question.correctAnswers ?? []).length > 1) {
		return 'multiple choice, multi-select';
	}
	if (question.type === 'multiple_choice') return 'multiple choice, single-best-answer';
	if (question.type === 'fill_in_the_blank') return 'fill in the blank';
	if (question.type === 'true_false') return 'true/false';
	if (question.type === 'matching') return 'matching';
	return text(question.type);
}

function compactOptionLines(question) {
	if (question.type === 'fill_in_the_blank') {
		return correctAnswerDetails(question).map((answer) => `- ${answer.text}`);
	}
	if (question.type === 'matching') {
		return correctAnswerDetails(question).map(
			(answer) => `- ${answer.promptText} -> ${answer.answerText}`
		);
	}
	const correctIds = new Set(question.correctAnswers ?? []);
	const correctText = new Set(correctAnswerDetails(question).map((answer) => answer.text));
	return (question.options ?? []).map((option) => {
		const optionText = text(option.text);
		const correct =
			correctIds.has(option.id) || correctIds.has(option.text) || correctText.has(optionText);
		return `- ${optionText}${correct ? ' [correct]' : ''}`;
	});
}

function mediaSummary(question) {
	const rows = mediaByQuestionId.get(question._id) ?? [];
	if (rows.length === 0) return '';
	const visibleRows = rows.map((row) => {
		const bits = [text(row.mediaType ?? 'media') || 'media'];
		const alt = text(row.altText ?? '');
		const caption = text(row.caption ?? '');
		if (alt) bits.push(`alt: ${alt}`);
		if (caption) bits.push(`caption: ${caption}`);
		if (row.showOnSolution === true) bits.push('shown on solution');
		return bits.join(', ');
	});
	return visibleRows.join('; ');
}

function anatomyNotes(definition, question) {
	const stem = text(question.stem);
	const rationale = text(question.rationale ?? question.explanation ?? '');
	const answers = answerSummary(question);
	const context = questionContext(question);
	return [
		`- Learning target: ${definition.id} in ${context.classCode ? `${context.classCode} ` : ''}${context.moduleTitle}.`,
		`- Stem function: it frames the learner's task as ${definition.useWhen.charAt(0).toLowerCase()}${definition.useWhen.slice(1)}`,
		`- Stem quality: ${stem.length > 180 ? 'the added context forces interpretation instead of isolated recall.' : 'the stem stays focused and does not add unnecessary setup.'}`,
		`- Answer design: ${optionStrategy(question)}`,
		`- Correct answer role: ${answers || 'the stored answer set defines the expected response.'}`,
		`- Rationale role: ${rationale.length > 180 ? 'it teaches the underlying rule and gives transfer value beyond answer confirmation.' : 'it confirms the key fact and gives a compact memory anchor.'}`,
		`- What to emulate: keep the same alignment between stem task, answer format, and rationale purpose.`
	].join('\n');
}

function compactQuestionContent(question) {
	const context = questionContext(question);
	const lines = [
		`- Context: ${context.classCode ? `${context.classCode} ` : ''}${context.className} / ${context.moduleTitle}`,
		`- Format: ${formatLabel(question)}`,
		`- Stem: ${text(question.stem)}`,
		question.type === 'fill_in_the_blank'
			? '- Accepted answers:'
			: question.type === 'matching'
				? '- Correct pairings:'
				: '- Options:'
	];
	for (const line of compactOptionLines(question)) {
		lines.push(`  ${line}`);
	}
	lines.push(`- Rationale: ${text(question.rationale ?? question.explanation ?? '')}`);
	const media = mediaSummary(question);
	if (media) lines.push(`- Media cue: ${media}`);
	return lines.join('\n');
}

function writeTemplate(definition) {
	const examples = selectExamples(definition);
	const dir = path.join(outputRoot, definition.slug);
	fs.mkdirSync(dir, { recursive: true });
	const lines = [
		`# ${definition.title}`,
		'',
		`Template label: \`${definition.id}\``,
		'',
		'## Purpose',
		'',
		definition.useWhen,
		'',
		'## Reasoning Order Fit',
		'',
		...definition.reasoningOrderFit.map((item) => `- ${item}`),
		'',
		'## Do Not Use When',
		'',
		definition.doNotUseWhen,
		'',
		'## Common Stem Patterns',
		'',
		...definition.stemPatterns.map((pattern) => `- ${pattern}`),
		'',
		'## Anatomy Of This Template',
		'',
		...definition.keyParts.map((part) => `- ${part}`),
		'',
		'## Considerations',
		'',
		...definition.considerations.map((item) => `- ${item}`),
		'',
		'## Production Examples',
		'',
		'Each example keeps only the content and semantics needed to understand the template. Source wording is preserved where useful, but new generated questions should use clean wording.'
	];

	examples.forEach((question, index) => {
		const context = questionContext(question);
		lines.push('');
		lines.push(`### Example ${index + 1}: ${context.moduleTitle}`);
		lines.push('');
		lines.push('#### Question Content');
		lines.push('');
		lines.push(compactQuestionContent(question));
		lines.push('');
		lines.push('#### Why This Is Good');
		lines.push('');
		lines.push(anatomyNotes(definition, question));
		lines.push('');
		lines.push('#### Parts To Preserve In New Questions');
		lines.push('');
		lines.push('- Preserve the same cognitive task.');
		lines.push('- Preserve the same answer-format contract.');
		lines.push('- Preserve the rationale pattern, especially the transfer rule.');
		lines.push('- Improve grammar or spelling when source wording is informal or rough.');
	});

	fs.writeFileSync(path.join(dir, 'README.md'), `${ascii(lines.join('\n'))}\n`);
}

fs.mkdirSync(outputRoot, { recursive: true });
for (const definition of templateDefs) writeTemplate(definition);

const indexLines = [
	'# Template Anatomies',
	'',
	`One directory per template. Each page explains purpose, stem patterns, anatomy, considerations, and ${EXAMPLES_PER_TEMPLATE} compact production examples when enough matching source questions are available.`,
	'',
	'## Cognitive Templates',
	'',
	...templateDefs
		.filter((definition) => !definition.slug.startsWith('format-'))
		.map((definition) => `- [${definition.id}](./${definition.slug}/README.md)`),
	'',
	'## Format Templates',
	'',
	...templateDefs
		.filter((definition) => definition.slug.startsWith('format-'))
		.map((definition) => `- [${definition.id}](./${definition.slug}/README.md)`)
];

fs.writeFileSync(path.join(outputRoot, 'README.md'), `${ascii(indexLines.join('\n'))}\n`);

const promptCardLines = [
	'# Template Prompt Cards',
	'',
	'Compact cards generated from `src/convex/questionStudio/templateTaxonomy.ts`. These are sized for future prompt injection; the full anatomy pages remain the human review reference.',
	''
];

for (const definition of templateDefs) {
	promptCardLines.push(`## ${definition.id}`);
	promptCardLines.push('');
	promptCardLines.push('```text');
	promptCardLines.push(questionTemplatePromptCard(definition.id));
	promptCardLines.push('```');
	promptCardLines.push('');
}

fs.writeFileSync(
	path.join(root, 'guidance', 'template-prompt-cards.md'),
	`${ascii(promptCardLines.join('\n'))}\n`
);

console.log(`Wrote ${templateDefs.length} template anatomy directories to ${outputRoot}`);
