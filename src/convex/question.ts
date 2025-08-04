import { query } from './_generated/server';
import { v } from 'convex/values';

export const getQuestionsByModule = query({
	// match the schema: moduleId is an id("module")
	args: { id: v.id('module') },
	handler: async (ctx, { id }) => {
		const questions = await ctx.db
			.query('question')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', id))
			.collect();

		return questions;
	}
});

export const getFirstQuestionInModule = query({
	// Enter module ID
	args: { id: v.id('module') },
	handler: async (ctx, args) => {
		const firstQuestion = ctx.db
			.query('question')
			.filter((q) => q.and(q.eq(q.field('moduleId'), args.id), q.eq(q.field('order'), 0)))
			.first();

		return firstQuestion;
	}
});
