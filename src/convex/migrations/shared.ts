import { v } from 'convex/values';
import type { FunctionReference, SchedulableFunctionReference } from 'convex/server';
import type { MutationCtx } from '../_generated/server';

/** Args for a paginated backfill. It schedules its next page unless `continueAutomatically` is false. */
export const pagedArgs = {
	batchSize: v.optional(v.number()),
	cursor: v.optional(v.string()),
	continueAutomatically: v.optional(v.boolean())
};

type PagedArgs = { batchSize?: number; cursor?: string; continueAutomatically?: boolean };

export async function scheduleNextPage<Args extends PagedArgs>(
	ctx: MutationCtx,
	fn: FunctionReference<'mutation', 'internal', Args>,
	args: Args,
	page: { isDone: boolean; continueCursor: string }
) {
	if (page.isDone || args.continueAutomatically === false) return;
	await ctx.scheduler.runAfter(0, fn as SchedulableFunctionReference, {
		...args,
		cursor: page.continueCursor
	});
}
