import { internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import { getRationale } from '../../lib/utils/rationale';
import { pagedArgs, scheduleNextPage } from './shared';

/**
 * Backfill legacy explanation fields into rationale for quiz attempt snapshots.
 * Run via CLI: bunx convex run migrations/attempts:backfillAttemptItemRationales
 */
export const backfillAttemptItemRationales = internalMutation({
	args: pagedArgs,
	handler: async (ctx, args) => {
		const page = await ctx.db
			.query('quizAttemptItems')
			.paginate({ cursor: args.cursor ?? null, numItems: args.batchSize ?? 200 });
		let updated = 0;
		for (const item of page.page) {
			const rationale = getRationale(item.questionSnapshot).trim();
			if (!rationale || item.questionSnapshot.rationale === rationale) continue;
			await ctx.db.patch(item._id, {
				questionSnapshot: { ...item.questionSnapshot, rationale },
				updatedAt: Date.now()
			});
			updated += 1;
		}
		await scheduleNextPage(
			ctx,
			internal.migrations.attempts.backfillAttemptItemRationales,
			args,
			page
		);
		return { updated, done: page.isDone, cursor: page.continueCursor };
	}
});
