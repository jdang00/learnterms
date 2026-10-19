import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { getRationale } from '../../lib/utils/rationale';
import { computeSearchText } from '../questions/shared';
import { pagedArgs, scheduleNextPage } from './shared';

async function refreshModuleSearchText(ctx: MutationCtx, moduleId: Id<'module'>) {
	const items = await ctx.db
		.query('question')
		.withIndex('by_moduleId', (q) => q.eq('moduleId', moduleId))
		.collect();
	let updated = 0;
	for (const q of items) {
		const searchText = computeSearchText({
			stem: q.stem,
			rationale: getRationale(q),
			examFindings: q.examFindings,
			type: q.type,
			status: q.status,
			aiGenerated: q.aiGenerated,
			options: q.options,
			correctAnswers: q.correctAnswers,
			metadata: q.metadata
		});
		if (q.searchText !== searchText) {
			await ctx.db.patch(q._id, { searchText });
			updated += 1;
		}
	}
	return updated;
}

/** Run via CLI: bunx convex run migrations/questions:backfillQuestionSearchTextForModule '{"moduleId": "..."}' */
export const backfillQuestionSearchTextForModule = internalMutation({
	args: { moduleId: v.id('module') },
	handler: async (ctx, { moduleId }) => ({ updated: await refreshModuleSearchText(ctx, moduleId) })
});

/** Run via CLI: bunx convex run migrations/questions:backfillSearchTextForAllModules */
export const backfillSearchTextForAllModules = internalMutation({
	args: pagedArgs,
	handler: async (ctx, args) => {
		const page = await ctx.db
			.query('module')
			.paginate({ cursor: args.cursor ?? null, numItems: args.batchSize ?? 10 });
		let updated = 0;
		for (const m of page.page) updated += await refreshModuleSearchText(ctx, m._id);
		await scheduleNextPage(
			ctx,
			internal.migrations.questions.backfillSearchTextForAllModules,
			args,
			page
		);
		return { updated, done: page.isDone, cursor: page.continueCursor };
	}
});

/** Run via CLI: bunx convex run migrations/questions:backfillQuestionRationales */
export const backfillQuestionRationales = internalMutation({
	args: pagedArgs,
	handler: async (ctx, args) => {
		const page = await ctx.db
			.query('question')
			.paginate({ cursor: args.cursor ?? null, numItems: args.batchSize ?? 200 });
		let updated = 0;
		for (const question of page.page) {
			const rationale = getRationale(question);
			if (!rationale || question.rationale === rationale) continue;
			await ctx.db.patch(question._id, {
				rationale,
				searchText: computeSearchText({
					stem: question.stem,
					rationale,
					examFindings: question.examFindings,
					type: question.type,
					status: question.status,
					aiGenerated: question.aiGenerated,
					options: question.options,
					correctAnswers: question.correctAnswers,
					metadata: question.metadata
				}),
				updatedAt: Date.now()
			});
			updated += 1;
		}
		await scheduleNextPage(
			ctx,
			internal.migrations.questions.backfillQuestionRationales,
			args,
			page
		);
		return { updated, done: page.isDone, cursor: page.continueCursor };
	}
});

/**
 * Backfill flagCount on questions from userProgress records, a page at a time.
 * Run via CLI: bunx convex run migrations/questions:backfillFlagCounts
 */
export const backfillFlagCounts = internalMutation({
	args: pagedArgs,
	handler: async (ctx, args) => {
		const page = await ctx.db
			.query('question')
			.paginate({ cursor: args.cursor ?? null, numItems: args.batchSize ?? 100 });
		let updated = 0;
		for (const question of page.page) {
			const flaggedRecords = await ctx.db
				.query('userProgress')
				.withIndex('by_question_user', (q) => q.eq('questionId', question._id))
				.filter((q) => q.eq(q.field('isFlagged'), true))
				.collect();
			if (question.flagCount !== flaggedRecords.length) {
				await ctx.db.patch(question._id, { flagCount: flaggedRecords.length });
				updated++;
			}
		}
		await scheduleNextPage(ctx, internal.migrations.questions.backfillFlagCounts, args, page);
		return { done: page.isDone, cursor: page.continueCursor, processed: page.page.length, updated };
	}
});

/**
 * Rewrite legacy matching answers into prompt::answer pairs for one module.
 * Run via CLI: bunx convex run migrations/questions:repairMatchingPairsForModule '{"moduleId": "..."}'
 */
export const repairMatchingPairsForModule = internalMutation({
	args: { moduleId: v.id('module') },
	handler: async (ctx, { moduleId }) => {
		const items = await ctx.db
			.query('question')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', moduleId))
			.collect();

		let updated = 0;
		for (const q of items) {
			if (q.type !== 'matching') continue;
			const hasPairs = (q.correctAnswers || []).some((s: string) => String(s).includes('::'));
			if (hasPairs) continue;

			const prompts = (q.options || []).filter((o) => o.text.startsWith('prompt:'));
			const answers = (q.options || []).filter((o) => o.text.startsWith('answer:'));
			const n = Math.min(prompts.length, answers.length);
			if (n === 0) continue;

			const pairs: string[] = [];
			for (let i = 0; i < n; i++) {
				pairs.push(`${prompts[i].id}::${answers[i].id}`);
			}

			const searchText = computeSearchText({
				stem: q.stem,
				rationale: getRationale(q),
				examFindings: q.examFindings,
				type: q.type,
				status: q.status,
				aiGenerated: q.aiGenerated,
				options: q.options,
				correctAnswers: pairs,
				metadata: q.metadata
			});

			await ctx.db.patch(q._id, { correctAnswers: pairs, searchText, updatedAt: Date.now() });
			updated += 1;
		}

		return { updated };
	}
});

/**
 * Get stats about questions and userProgress for migration planning (paginated).
 * Run via CLI: bunx convex run migrations/questions:getStats
 */
export const getStats = internalQuery({
	args: {
		cursor: v.optional(v.string()),
		type: v.optional(v.union(v.literal('questions'), v.literal('progress')))
	},
	handler: async (ctx, args) => {
		const type = args.type ?? 'questions';
		const batchSize = 1000;

		if (type === 'questions') {
			const { page, isDone, continueCursor } = await ctx.db
				.query('question')
				.paginate({ cursor: args.cursor ?? null, numItems: batchSize });

			const withFlagCount = page.filter((q) => q.flagCount !== undefined && q.flagCount !== null);
			const needingBackfill = page.filter((q) => q.flagCount === undefined || q.flagCount === null);

			return {
				type: 'questions',
				batchCount: page.length,
				withFlagCount: withFlagCount.length,
				needingBackfill: needingBackfill.length,
				done: isDone,
				cursor: continueCursor
			};
		} else {
			const { page, isDone, continueCursor } = await ctx.db
				.query('userProgress')
				.paginate({ cursor: args.cursor ?? null, numItems: batchSize });

			const flagged = page.filter((p) => p.isFlagged === true);

			return {
				type: 'progress',
				batchCount: page.length,
				flaggedCount: flagged.length,
				done: isDone,
				cursor: continueCursor
			};
		}
	}
});

/**
 * Backfill all questions in one go (for smaller datasets).
 * Run via CLI: bunx convex run migrations/questions:backfillAllFlagCounts
 *
 * WARNING: May timeout on large datasets. Use backfillFlagCounts for large datasets.
 */
export const backfillAllFlagCounts = internalMutation({
	args: {},
	handler: async (ctx) => {
		// Get all questions
		const questions = await ctx.db.query('question').collect();

		// Get all flagged userProgress records
		const allProgress = await ctx.db
			.query('userProgress')
			.filter((q) => q.eq(q.field('isFlagged'), true))
			.collect();

		// Count flags per question
		const flagCounts = new Map<string, number>();
		for (const progress of allProgress) {
			const questionId = progress.questionId;
			flagCounts.set(questionId, (flagCounts.get(questionId) ?? 0) + 1);
		}

		let updated = 0;

		// Update each question with its flagCount
		for (const question of questions) {
			const flagCount = flagCounts.get(question._id) ?? 0;

			// Only update if flagCount differs or wasn't set
			if (question.flagCount !== flagCount) {
				await ctx.db.patch(question._id, { flagCount });
				updated++;
			}
		}

		return {
			totalQuestions: questions.length,
			totalFlaggedProgress: allProgress.length,
			updated,
			message: `Backfilled ${updated} questions with flagCounts`
		};
	}
});

/**
 * Reset all flagCounts to 0 (utility for testing).
 * Run via CLI: bunx convex run migrations/questions:resetFlagCounts
 */
export const resetFlagCounts = internalMutation({
	args: {},
	handler: async (ctx) => {
		const questions = await ctx.db.query('question').collect();

		let updated = 0;
		for (const question of questions) {
			if (question.flagCount !== 0 && question.flagCount !== undefined) {
				await ctx.db.patch(question._id, { flagCount: 0 });
				updated++;
			}
		}

		return {
			totalQuestions: questions.length,
			reset: updated,
			message: `Reset ${updated} questions to flagCount=0`
		};
	}
});

/**
 * Update all questions in a specific class to have a specific author.
 * Run via CLI: bunx convex run migrations/questions:updateQuestionAuthorForClass --classId "jn78h93750gr8svhbfrys3fcb57pbp8v" --firstName "Brayden" --lastName "Dyer"
 */
export const updateQuestionAuthorForClass = internalMutation({
	args: {
		classId: v.id('class'),
		firstName: v.string(),
		lastName: v.string()
	},
	handler: async (ctx, args) => {
		// Get all modules for this class
		const modules = await ctx.db
			.query('module')
			.withIndex('by_classId', (q) => q.eq('classId', args.classId))
			.collect();

		if (modules.length === 0) {
			return {
				modulesFound: 0,
				questionsUpdated: 0,
				message: 'No modules found for this class'
			};
		}

		let totalUpdated = 0;

		// For each module, get all questions and update their author
		for (const module of modules) {
			const questions = await ctx.db
				.query('question')
				.withIndex('by_moduleId', (q) => q.eq('moduleId', module._id))
				.collect();

			for (const question of questions) {
				await ctx.db.patch(question._id, {
					createdBy: {
						firstName: args.firstName,
						lastName: args.lastName
					},
					updatedAt: Date.now()
				});
				totalUpdated++;
			}
		}

		return {
			modulesFound: modules.length,
			questionsUpdated: totalUpdated,
			message: `Updated ${totalUpdated} questions across ${modules.length} modules to be authored by ${args.firstName} ${args.lastName}`
		};
	}
});
