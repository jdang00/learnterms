import { v } from 'convex/values';
import { authQuery } from '../authQueries';
import { requireModuleAccess } from '../access';
import { MODULE_QUESTION_READ_LIMIT } from './shared';

export const getQuestionsByModule = authQuery({
	// match the schema: moduleId is an id("module")
	args: { id: v.id('module') },
	handler: async (ctx, { id }) => {
		await requireModuleAccess(ctx, id);
		const questions = await ctx.db
			.query('question')
			.withIndex('by_moduleId_order', (q) => q.eq('moduleId', id))
			.filter((q) => q.eq(q.field('status'), 'published'))
			.take(MODULE_QUESTION_READ_LIMIT);

		return questions;
	}
});

export const getQuestionsByModuleAdmin = authQuery({
	args: { id: v.id('module') },
	handler: async (ctx, { id }) => {
		await requireModuleAccess(ctx, id, true);
		const questions = await ctx.db
			.query('question')
			.withIndex('by_moduleId_order', (q) => q.eq('moduleId', id))
			.take(MODULE_QUESTION_READ_LIMIT);

		return questions;
	}
});

export const getFirstQuestionInModule = authQuery({
	// Enter module ID
	args: { id: v.id('module') },
	handler: async (ctx, args) => {
		await requireModuleAccess(ctx, args.id);
		const firstQuestion = ctx.db
			.query('question')
			.withIndex('by_moduleId_order', (q) => q.eq('moduleId', args.id).eq('order', 0))
			.first();

		return firstQuestion;
	}
});

export const getAllQuestions = authQuery({
	args: {},
	handler: async (ctx) => {
		if (ctx.user.role !== 'dev') throw new Error('Unauthorized');
		const questions = await ctx.db.query('question').collect();
		return questions;
	}
});
