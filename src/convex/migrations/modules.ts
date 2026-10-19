import { internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import { countPublishedQuestions } from '../moduleStats';
import { pagedArgs, scheduleNextPage } from './shared';

/**
 * Backfill publishedQuestionCount on modules: the count students see, which leaves out drafts.
 * Run via CLI: bunx convex run migrations/modules:backfillPublishedQuestionCounts
 */
export const backfillPublishedQuestionCounts = internalMutation({
	args: pagedArgs,
	handler: async (ctx, args) => {
		const page = await ctx.db
			.query('module')
			.paginate({ cursor: args.cursor ?? null, numItems: args.batchSize ?? 10 });
		let updated = 0;
		for (const module of page.page) {
			const count = await countPublishedQuestions(ctx, module._id);
			if (module.publishedQuestionCount !== count) {
				await ctx.db.patch(module._id, { publishedQuestionCount: count });
				updated++;
			}
		}
		await scheduleNextPage(
			ctx,
			internal.migrations.modules.backfillPublishedQuestionCounts,
			args,
			page
		);
		return { done: page.isDone, cursor: page.continueCursor, processed: page.page.length, updated };
	}
});

/**
 * Backfill module.cohortId from each module's class.cohortId.
 * Run via CLI: bunx convex run migrations/modules:backfillModuleCohortIds
 */
export const backfillModuleCohortIds = internalMutation({
	args: {},
	handler: async (ctx) => {
		const modules = await ctx.db.query('module').collect();
		let updated = 0;
		let skipped = 0;

		for (const moduleItem of modules) {
			const classItem = await ctx.db.get(moduleItem.classId);
			if (!classItem) {
				skipped += 1;
				continue;
			}
			if (moduleItem.cohortId !== classItem.cohortId) {
				await ctx.db.patch(moduleItem._id, { cohortId: classItem.cohortId });
				updated += 1;
			}
		}

		return {
			totalModules: modules.length,
			updated,
			skippedMissingClass: skipped
		};
	}
});

/**
 * Backfill questionCount for all modules.
 * Run via CLI: bunx convex run migrations/modules:backfillQuestionCounts
 */
export const backfillQuestionCounts = internalMutation({
	args: {},
	handler: async (ctx) => {
		const modules = await ctx.db.query('module').collect();
		let updated = 0;

		for (const module of modules) {
			const questions = await ctx.db
				.query('question')
				.withIndex('by_moduleId', (q) => q.eq('moduleId', module._id))
				.collect();

			const count = questions.length;
			if (module.questionCount !== count) {
				await ctx.db.patch(module._id, { questionCount: count });
				updated++;
			}
		}

		return { totalModules: modules.length, updated };
	}
});
