// Builds the human exemplar bank from a production export.
// Usage: bun scripts/ai-eval/exemplars/build-bank.ts [--export tmp/exemplar-bank/raw/export] [--no-label] [--no-embed]
// The export directory holds <table>/documents.jsonl (unzip of `bunx convex export --prod`).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	type ItemStats,
	type Response,
	TOP_TIER_MIN_QUALITY,
	computeItemStats,
	earliestPerLearner,
	embeddingText,
	moduleTotals,
	restScoresForModule,
	scoreExemplar
} from '../../../src/convex/questionStudio/exemplarStats';
import {
	type ExemplarText,
	type RawQuestion,
	classifyQuestionType,
	classifyShape,
	exemplarRejection,
	exemplarText
} from '../../../src/convex/questionStudio/exemplarText';
import { type Label, labelItems } from './classify';
import { BANK_DIR, embedTexts, ledgerSpend } from './embeddings';
import type { BankEntry } from './types';

const args = process.argv.slice(2);
const exportDir = args.includes('--export')
	? args[args.indexOf('--export') + 1]
	: join(BANK_DIR, 'raw/export');
const shouldEmbed = !args.includes('--no-embed');
const shouldLabel = !args.includes('--no-label');

type Doc = Record<string, any>;
async function table(name: string): Promise<Doc[]> {
	const file = Bun.file(join(exportDir, name, 'documents.jsonl'));
	if (!(await file.exists())) return [];
	return (await file.text())
		.split('\n')
		.filter(Boolean)
		.map((line) => JSON.parse(line));
}

const [questions, modules, classes, media, checks, quizItems, userProgress] = await Promise.all(
	[
		'question',
		'module',
		'class',
		'questionMedia',
		'studyChecks',
		'quizAttemptItems',
		'userProgress'
	].map(table)
);
const moduleById = new Map(modules.map((m) => [m._id, m]));
const classById = new Map(classes.map((c) => [c._id, c]));
const questionById = new Map(questions.map((q) => [q._id, q]));
const withMedia = new Set(media.filter((m) => !m.deletedAt).map((m) => m.questionId));

const sameAnswer = (selected: string[], key: string[]) =>
	selected.length === key.length && selected.every((id) => key.includes(id));

// First attempts: earliest study check or answered quiz item per learner and question.
type Event = {
	userId: string;
	questionId: string;
	moduleId: string;
	at: number;
	selected: string[];
	correct: boolean;
};
const events: Event[] = [];
for (const check of checks) {
	const question = questionById.get(check.questionId);
	if (!question) continue;
	events.push({
		userId: check.userId,
		questionId: check.questionId,
		moduleId: question.moduleId,
		at: check.checkedAt,
		selected: check.selectedOptions,
		correct: check.isCorrect
	});
}
let quizResponses = 0;
for (const item of quizItems) {
	if (item.score?.isCorrect === undefined || !item.response?.selectedOptions?.length) continue;
	quizResponses += 1;
	events.push({
		userId: item.userId,
		questionId: item.questionId,
		moduleId: item.moduleId,
		at: item.response.answeredAt ?? item.updatedAt,
		selected: item.response.selectedOptions,
		correct: item.score.isCorrect
	});
}
const firstAttempts = earliestPerLearner(events);
const firstTotals = moduleTotals(firstAttempts.values());
const firstByQuestion = groupByQuestion(firstAttempts.values());

// Legacy final selections: userProgress keeps each learner's last saved choice.
const finalEvents: Event[] = [];
for (const row of userProgress) {
	if (row.deletedAt || !row.selectedOptions?.length) continue;
	const question = questionById.get(row.questionId);
	if (!question) continue;
	finalEvents.push({
		userId: row.userId,
		questionId: row.questionId,
		moduleId: question.moduleId,
		at: row.updatedAt,
		selected: row.selectedOptions,
		correct: sameAnswer(row.selectedOptions, question.correctAnswers)
	});
}
const finalTotals = moduleTotals(finalEvents);
const finalByQuestion = groupByQuestion(finalEvents);

function groupByQuestion(list: Iterable<Event>) {
	const grouped = new Map<string, Event[]>();
	for (const event of list) {
		const bucket = grouped.get(event.questionId) ?? [];
		bucket.push(event);
		grouped.set(event.questionId, bucket);
	}
	return grouped;
}

/** Stats against the current key; responses naming options that no longer exist are dropped. */
function statsFor(
	question: Doc,
	grouped: Map<string, Event[]>,
	totals: ReturnType<typeof moduleTotals>
): ItemStats | null {
	const optionIds: string[] = question.options.map((o: Doc) => o.id);
	const key = question.correctAnswers[0];
	const responses: Response[] = (grouped.get(question._id) ?? [])
		.filter((event) => event.selected.every((id) => optionIds.includes(id)))
		.map((event) => ({
			userId: event.userId,
			selected: event.selected,
			correct: sameAnswer(event.selected, [key])
		}));
	return computeItemStats({
		optionIds,
		correctId: key,
		responses,
		restScores: restScoresForModule(totals, question.moduleId)
	});
}

// Funnel
const funnel: Record<string, number> = { total: questions.length };
const rejections: Record<string, number> = {};
type Candidate = { question: Doc; module: Doc; klass: Doc; text: ExemplarText; heuristic: Label };
const candidates: Candidate[] = [];
for (const question of questions) {
	const module = moduleById.get(question.moduleId);
	const klass = module ? classById.get(module.classId) : undefined;
	const rejection =
		!module || module.deletedAt || !klass || klass.deletedAt
			? 'orphaned'
			: exemplarRejection(question as RawQuestion, {
					className: klass.name,
					hasMedia: withMedia.has(question._id)
				});
	if (rejection) {
		rejections[rejection] = (rejections[rejection] ?? 0) + 1;
		continue;
	}
	const text = exemplarText(question as RawQuestion);
	const questionType = classifyQuestionType(text.stem);
	const shape = classifyShape(text.stem, text.options, questionType);
	candidates.push({
		question,
		module: module!,
		klass: klass!,
		text,
		heuristic: { questionType, shape }
	});
}

const modelLabels = shouldLabel
	? await labelItems(candidates.map(({ question, text }) => ({ id: question._id, ...text })))
	: new Map<string, Label>();

const entries: BankEntry[] = candidates.map(({ question, module, klass, text, heuristic }) => {
	const label: Label = modelLabels.get(question._id) ?? heuristic;
	const firstAttempt = statsFor(question, firstByQuestion, firstTotals);
	const finalSelection = statsFor(question, finalByQuestion, finalTotals);
	const scored = scoreExemplar(text, label, firstAttempt);
	const subject = klass.name;
	return {
		id: question._id,
		questionType: label.questionType,
		shape: label.shape,
		subject,
		...text,
		stats: scored.stats,
		notes: scored.notes,
		tier: scored.tier,
		quality: scored.score,
		basis: scored.quality.basis,
		rubric: scored.rubric,
		failedGates: scored.quality.failedGates,
		labelSource: modelLabels.has(question._id) ? 'model' : 'heuristic',
		informal: label.informal,
		dependsOnUnseen: label.dependsOnUnseen,
		heuristicLabel: heuristic,
		firstAttempt,
		finalSelection,
		className: klass.name,
		moduleTitle: module.title,
		classId: klass._id,
		cohortId: klass.cohortId,
		moduleId: module._id,
		embedText: embeddingText({
			stem: text.stem,
			correctOption: text.options[text.correctIndex],
			subject
		})
	};
});
entries.sort((a, b) => b.quality - a.quality);
// The same question copied into several modules keeps only its best-scoring copy.
const seenText = new Set<string>();
for (let index = 0; index < entries.length; index++) {
	const key = entries[index].embedText.toLowerCase();
	if (!seenText.has(key)) {
		seenText.add(key);
		continue;
	}
	rejections.duplicate = (rejections.duplicate ?? 0) + 1;
	entries.splice(index--, 1);
}

const human = questions.filter(
	(q) => !q.metadata?.generation && q.aiGenerated !== true && !q.deletedAt
);
const humanIds = new Set(human.map((q) => q._id));
const humanFirst = [...firstAttempts.values()].filter((e) => humanIds.has(e.questionId));
const humanFinal = finalEvents.filter((e) => humanIds.has(e.questionId));
const top = entries.filter((e) => e.tier === 'top');
const count = <T>(list: T[], key: (item: T) => string) =>
	Object.fromEntries(
		Object.entries(
			list.reduce<Record<string, number>>((acc, item) => {
				acc[key(item)] = (acc[key(item)] ?? 0) + 1;
				return acc;
			}, {})
		).sort((a, b) => b[1] - a[1])
	);
const median = (values: number[]) => {
	if (!values.length) return undefined;
	const sorted = [...values].sort((a, b) => a - b);
	return Math.round(sorted[Math.floor(sorted.length / 2)] * 1000) / 1000;
};
const summarize = (list: BankEntry[]) => {
	const first = list
		.filter((e) => (e.firstAttempt?.responders ?? 0) >= 15)
		.map((e) => e.firstAttempt!);
	const final = list
		.filter((e) => (e.finalSelection?.responders ?? 0) >= 15)
		.map((e) => e.finalSelection!);
	const describe = (stats: ItemStats[]) => ({
		items: stats.length,
		medianResponders: median(stats.map((s) => s.responders)),
		medianDifficulty: median(stats.map((s) => s.difficulty)),
		medianDiscrimination: median(
			stats.filter((s) => s.discrimination !== undefined).map((s) => s.discrimination!)
		),
		withDiscrimination: stats.filter((s) => s.discrimination !== undefined).length,
		positiveDiscriminationOver015: stats.filter((s) => (s.discrimination ?? 0) > 0.15).length,
		twoPlusFunctionalDistractors: stats.filter((s) => s.functionalDistractors >= 2).length
	});
	return { firstAttempt15: describe(first), finalSelection15: describe(final) };
};

const report = {
	builtAt: new Date().toISOString(),
	topTierMinQuality: TOP_TIER_MIN_QUALITY,
	labels: count(entries, (e) => e.labelSource),
	labelAgreement: {
		type: entries.filter(
			(e) => e.labelSource === 'model' && e.heuristicLabel.questionType === e.questionType
		).length,
		shape: entries.filter((e) => e.labelSource === 'model' && e.heuristicLabel.shape === e.shape)
			.length
	},
	volumes: {
		questions: questions.length,
		humanLive: human.length,
		studyChecks: checks.length,
		quizAttemptItemsAnswered: quizResponses,
		firstAttempts: firstAttempts.size,
		firstAttemptsOnHuman: humanFirst.length,
		firstAttemptLearners: new Set([...firstAttempts.values()].map((e) => e.userId)).size,
		humanQuestionsWithFirstAttempts: new Set(humanFirst.map((e) => e.questionId)).size,
		userProgressSelections: finalEvents.length,
		userProgressSelectionsOnHuman: humanFinal.length,
		finalSelectionLearners: new Set(finalEvents.map((e) => e.userId)).size
	},
	funnel: { ...funnel, rejections, bank: entries.length, top: top.length },
	evidence: count(entries, (e) => e.basis),
	topEvidence: count(top, (e) => e.basis),
	byType: count(entries, (e) => e.questionType),
	topByType: count(top, (e) => e.questionType),
	byShape: count(entries, (e) => e.shape),
	topByShape: count(top, (e) => e.shape),
	topByTypeShape: count(top, (e) => `${e.questionType}/${e.shape}`),
	topBySubject: count(top, (e) => e.subject),
	failedGates: count(
		entries.flatMap((e) => e.failedGates.map((gate) => ({ gate }))),
		(g) => g.gate
	),
	psychometrics: { bank: summarize(entries), top: summarize(top) }
};

mkdirSync(BANK_DIR, { recursive: true });
writeFileSync(join(BANK_DIR, 'bank.json'), JSON.stringify(entries));
writeFileSync(join(BANK_DIR, 'top-tier.json'), JSON.stringify(top, null, 1));
writeFileSync(join(BANK_DIR, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

if (shouldEmbed) {
	await embedTexts(
		entries.map((e) => e.embedText),
		'bank'
	);
	console.log(`embedded ${entries.length} entries; ledger total $${ledgerSpend().toFixed(4)}`);
}
