import { query } from './_generated/server';
import { v } from 'convex/values';

export const checkExistingRecord = query({
	args: { userId: v.id('users'), questionId: v.id('question') },
	handler: async (ctx, args) => {
		const record = await ctx.db
			.query('userProgress')
			.withIndex('by_user_question', (q) => 
				q.eq('userId', args.userId).eq('questionId', args.questionId)
			)
			.unique();

		return record;
	}
});
