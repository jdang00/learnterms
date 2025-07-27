import { query } from './_generated/server';
import { v } from 'convex/values';

export const getQuestionsByModule = query({
	// Enter module ID
	args: { id: v.string() },
	handler: async (ctx, args) => {
		const classes = ctx.db
			.query('question')
			.filter((q) => q.eq(q.field('moduleId'), args.id))
			.collect();

		return classes;
	}
});

export const getFirstQuestionInModule = query({
	// Enter module ID
	args: { id: v.string() },
	handler: async (ctx, args) => {
		const classes = ctx.db
			.query('question')
			.filter((q) => q.and(q.eq(q.field('moduleId'), args.id), q.eq(q.field('order'), 0)))
			.first();

		return classes;
	}
});
