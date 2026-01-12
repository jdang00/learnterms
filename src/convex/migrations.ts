import { internalMutation, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Backfill flagCount for all questions based on existing userProgress records.
 * Run via CLI: npx convex run migrations:backfillFlagCounts
 *
 * This processes questions in batches to avoid timeouts.
 * Run multiple times if needed until it returns { done: true }.
 */
export const backfillFlagCounts = mutation({
	args: {
		batchSize: v.optional(v.number()),
		cursor: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const batchSize = args.batchSize ?? 100;

		// Get all questions, paginated
		const {
			page: questions,
			isDone,
			continueCursor
		} = await ctx.db
			.query('question')
			.paginate({ cursor: args.cursor ?? null, numItems: batchSize });

		if (questions.length === 0) {
			return { done: true, processed: 0, message: 'No more questions to process' };
		}

		let processed = 0;
		let updated = 0;

		for (const question of questions) {
			// Count flagged userProgress records for this question
			const flaggedRecords = await ctx.db
				.query('userProgress')
				.withIndex('by_question_user', (q) => q.eq('questionId', question._id))
				.filter((q) => q.eq(q.field('isFlagged'), true))
				.collect();

			const flagCount = flaggedRecords.length;

			// Only update if flagCount differs or wasn't set
			if (question.flagCount !== flagCount) {
				await ctx.db.patch(question._id, { flagCount });
				updated++;
			}

			processed++;
		}

		return {
			done: isDone,
			cursor: continueCursor,
			processed,
			updated,
			message: `Processed ${processed} questions, updated ${updated} flagCounts`
		};
	}
});

/**
 * Backfill all questions in one go (for smaller datasets).
 * Run via CLI: npx convex run migrations:backfillAllFlagCounts
 *
 * WARNING: May timeout on large datasets. Use backfillFlagCounts for large datasets.
 */
export const backfillAllFlagCounts = mutation({
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
 * Run via CLI: npx convex run migrations:resetFlagCounts
 */
export const resetFlagCounts = mutation({
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
