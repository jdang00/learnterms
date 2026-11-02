import { embedMany } from 'ai';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { type ActionCtx, internalAction, internalQuery } from '../_generated/server';
import { EMBEDDING_MODEL } from '../aiModels';
import {
	computeItemStats,
	earliestPerLearner,
	embeddingText,
	moduleTotals,
	restScoresForModule,
	scoreExemplar,
	textFingerprint
} from '../questionStudio/exemplarStats';
import {
	type ExemplarText,
	type RawQuestion,
	classifyQuestionType,
	classifyShape,
	exemplarRejection,
	exemplarText
} from '../questionStudio/exemplarText';
import { assertOpenRouterKey, openRouter } from '../questionStudio/shared';
import { pagedArgs } from './shared';

const RESPONSE_PAGE = 2000;
const EMBED_BATCH = 96;
const UPSERT_BATCH = 20;
const KEY_BATCH = 100;

const responseEvent = v.object({
	userId: v.string(),
	questionId: v.string(),
	moduleId: v.string(),
	at: v.number(),
	selected: v.array(v.string()),
	correct: v.boolean()
});

/** One page of study checks or answered quiz items, flattened to response events. */
export const exemplarResponsePage = internalQuery({
	args: {
		source: v.union(v.literal('studyChecks'), v.literal('quizAttemptItems')),
		cursor: v.union(v.string(), v.null()),
		numItems: v.number()
	},
	returns: v.object({
		events: v.array(responseEvent),
		continueCursor: v.string(),
		isDone: v.boolean()
	}),
	handler: async (ctx, { source, cursor, numItems }) => {
		if (source === 'quizAttemptItems') {
			const page = await ctx.db.query('quizAttemptItems').paginate({ cursor, numItems });
			return {
				events: page.page
					.filter(
						(item) => item.score.isCorrect !== undefined && item.response.selectedOptions.length
					)
					.map((item) => ({
						userId: item.userId,
						questionId: item.questionId,
						moduleId: item.moduleId,
						at: item.response.answeredAt ?? item.updatedAt,
						selected: item.response.selectedOptions,
						correct: item.score.isCorrect === true
					})),
				continueCursor: page.continueCursor,
				isDone: page.isDone
			};
		}
		const page = await ctx.db.query('studyChecks').paginate({ cursor, numItems });
		const modules = new Map<Id<'question'>, Id<'module'> | null>();
		const events = [];
		for (const check of page.page) {
			if (!modules.has(check.questionId)) {
				modules.set(check.questionId, (await ctx.db.get(check.questionId))?.moduleId ?? null);
			}
			const moduleId = modules.get(check.questionId);
			if (!moduleId) continue;
			events.push({
				userId: check.userId,
				questionId: check.questionId,
				moduleId,
				at: check.checkedAt,
				selected: check.selectedOptions,
				correct: check.isCorrect
			});
		}
		return { events, continueCursor: page.continueCursor, isDone: page.isDone };
	}
});

const candidateValidator = v.object({
	questionId: v.id('question'),
	moduleId: v.id('module'),
	cohortId: v.id('cohort'),
	className: v.string(),
	optionIds: v.array(v.string()),
	correctId: v.string(),
	text: v.object({
		stem: v.string(),
		options: v.array(v.string()),
		correctIndex: v.number(),
		rationale: v.string()
	})
});

/** One page of the question table, reduced to qualifying human-written exemplar candidates. */
export const exemplarCandidatePage = internalQuery({
	args: { cursor: v.union(v.string(), v.null()), numItems: v.number() },
	returns: v.object({
		candidates: v.array(candidateValidator),
		scanned: v.number(),
		continueCursor: v.string(),
		isDone: v.boolean()
	}),
	handler: async (ctx, { cursor, numItems }) => {
		const page = await ctx.db.query('question').paginate({ cursor, numItems });
		const modules = new Map<Id<'module'>, Doc<'module'> | null>();
		const classes = new Map<Id<'class'>, Doc<'class'> | null>();
		const candidates = [];
		for (const question of page.page) {
			if (question.metadata.generation || question.aiGenerated) continue;
			if (!modules.has(question.moduleId))
				modules.set(question.moduleId, await ctx.db.get(question.moduleId));
			const module = modules.get(question.moduleId);
			if (!module || module.deletedAt) continue;
			if (!classes.has(module.classId))
				classes.set(module.classId, await ctx.db.get(module.classId));
			const klass = classes.get(module.classId);
			if (!klass || klass.deletedAt) continue;
			const raw = question as unknown as RawQuestion;
			if (exemplarRejection(raw, { className: klass.name })) continue;
			const media = await ctx.db
				.query('questionMedia')
				.withIndex('by_questionId_deletedAt', (q) =>
					q.eq('questionId', question._id).eq('deletedAt', undefined)
				)
				.first();
			if (media) continue;
			candidates.push({
				questionId: question._id,
				moduleId: module._id,
				cohortId: klass.cohortId,
				className: klass.name,
				optionIds: question.options.map((option) => option.id),
				correctId: question.correctAnswers[0],
				text: exemplarText(raw)
			});
		}
		return {
			candidates,
			scanned: page.page.length,
			continueCursor: page.continueCursor,
			isDone: page.isDone
		};
	}
});

type Event = typeof responseEvent.type;
type CandidatePage = {
	candidates: (typeof candidateValidator.type)[];
	scanned: number;
	continueCursor: string;
	isDone: boolean;
};
const rebuildResult = v.object({
	buildId: v.string(),
	scanned: v.number(),
	candidates: v.number(),
	embedded: v.number(),
	upserted: v.number(),
	done: v.boolean()
});

async function loadResponses(ctx: ActionCtx) {
	const events: Event[] = [];
	for (const source of ['studyChecks', 'quizAttemptItems'] as const) {
		let cursor: string | null = null;
		for (;;) {
			const page: { events: Event[]; continueCursor: string; isDone: boolean } = await ctx.runQuery(
				internal.migrations.exemplars.exemplarResponsePage,
				{ source, cursor, numItems: RESPONSE_PAGE }
			);
			events.push(...page.events);
			if (page.isDone) break;
			cursor = page.continueCursor;
		}
	}
	return events;
}

/**
 * Recompute exemplar statistics from first attempts (study checks and quiz items), score one page of
 * human questions, embed changed rows and upsert them. Schedules its next page; on the last page it
 * prunes rows the build didn't write. Heuristic labels never overwrite model-assigned ones.
 * Run via CLI: bunx convex run migrations/exemplars:rebuildExemplarBank '{}'
 */
export const rebuildExemplarBank = internalAction({
	args: { ...pagedArgs, buildId: v.optional(v.string()) },
	returns: rebuildResult,
	handler: async (ctx, args): Promise<typeof rebuildResult.type> => {
		assertOpenRouterKey();
		const buildId = args.buildId ?? `build-${Date.now()}`;
		const firstAttempts = earliestPerLearner(await loadResponses(ctx));
		const totals = moduleTotals(firstAttempts.values());
		const byQuestion = new Map<string, Event[]>();
		for (const event of firstAttempts.values()) {
			const list = byQuestion.get(event.questionId) ?? [];
			list.push(event);
			byQuestion.set(event.questionId, list);
		}

		const page: CandidatePage = await ctx.runQuery(
			internal.migrations.exemplars.exemplarCandidatePage,
			{
				cursor: args.cursor ?? null,
				numItems: args.batchSize ?? 1000
			}
		);
		const rows = page.candidates.map((candidate) => {
			const text: ExemplarText = candidate.text;
			const questionType = classifyQuestionType(text.stem);
			const shape = classifyShape(text.stem, text.options, questionType);
			const responses = (byQuestion.get(candidate.questionId) ?? [])
				.filter((event) => event.selected.every((id) => candidate.optionIds.includes(id)))
				.map((event) => ({
					userId: event.userId,
					selected: event.selected,
					correct: event.selected.length === 1 && event.selected[0] === candidate.correctId
				}));
			const firstAttempt = computeItemStats({
				optionIds: candidate.optionIds,
				correctId: candidate.correctId,
				responses,
				restScores: restScoresForModule(totals, candidate.moduleId)
			});
			const scored = scoreExemplar(text, { questionType }, firstAttempt);
			const embedText = embeddingText({
				stem: text.stem,
				correctOption: text.options[text.correctIndex],
				subject: candidate.className
			});
			return {
				embedText,
				row: {
					...text,
					questionType,
					shape,
					subject: candidate.className,
					stats: scored.stats,
					notes: scored.notes,
					sourceQuestionId: candidate.questionId as string,
					questionId: candidate.questionId,
					cohortId: candidate.cohortId,
					tier: scored.tier,
					quality: scored.score,
					labelSource: 'heuristic' as const,
					embedTextHash: textFingerprint(embedText)
				}
			};
		});

		const existing = new Map<string, string>();
		for (let start = 0; start < rows.length; start += KEY_BATCH) {
			const keys = await ctx.runQuery(internal.questionStudio.exemplarBank.existingExemplarKeys, {
				sourceQuestionIds: rows
					.slice(start, start + KEY_BATCH)
					.map(({ row }) => row.sourceQuestionId)
			});
			for (const key of keys) existing.set(key.sourceQuestionId, key.embedTextHash);
		}
		const needsEmbedding = rows.filter(
			({ row }) => existing.get(row.sourceQuestionId) !== row.embedTextHash
		);
		const embeddings = new Map<string, number[]>();
		for (let start = 0; start < needsEmbedding.length; start += EMBED_BATCH) {
			const batch = needsEmbedding.slice(start, start + EMBED_BATCH);
			const result = await embedMany({
				model: openRouter().embedding(EMBEDDING_MODEL),
				values: batch.map(({ embedText }) => embedText)
			});
			batch.forEach(({ row }, index) =>
				embeddings.set(row.sourceQuestionId, result.embeddings[index])
			);
		}

		let upserted = 0;
		for (let start = 0; start < rows.length; start += UPSERT_BATCH) {
			const exemplars = rows.slice(start, start + UPSERT_BATCH).map(({ row }) => {
				const embedding = embeddings.get(row.sourceQuestionId);
				return embedding ? { ...row, embedding } : row;
			});
			const result = await ctx.runMutation(internal.questionStudio.exemplarBank.upsertExemplars, {
				buildId,
				exemplars
			});
			upserted += result.inserted + result.updated;
		}

		if (args.continueAutomatically !== false) {
			if (!page.isDone) {
				await ctx.scheduler.runAfter(0, internal.migrations.exemplars.rebuildExemplarBank, {
					...args,
					buildId,
					cursor: page.continueCursor
				});
			} else {
				await ctx.scheduler.runAfter(0, internal.questionStudio.exemplarBank.pruneExemplars, {
					buildId
				});
			}
		}
		return {
			buildId,
			scanned: page.scanned,
			candidates: rows.length,
			embedded: embeddings.size,
			upserted,
			done: page.isDone
		};
	}
});
