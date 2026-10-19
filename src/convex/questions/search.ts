import { v } from 'convex/values';
import { authQuery } from '../authQueries';
import { requireModuleAccess } from '../access';
import { MODULE_QUESTION_READ_LIMIT } from './shared';

export const searchQuestionsByModuleAdmin = authQuery({
	args: {
		id: v.id('module'),
		query: v.string(),
		limit: v.optional(v.number()),
		sort: v.optional(v.string())
	},
	handler: async (ctx, { id, query, limit, sort }) => {
		await requireModuleAccess(ctx, id, true);
		const trimmed = query.trim().toLowerCase();
		if (trimmed.length === 0) {
			if ((sort || 'order') === 'created_desc') {
				const results = await ctx.db
					.query('question')
					.withIndex('by_moduleId', (q) => q.eq('moduleId', id))
					.order('desc')
					.take(MODULE_QUESTION_READ_LIMIT);
				return results;
			} else {
				const results = await ctx.db
					.query('question')
					.withIndex('by_moduleId_order', (q) => q.eq('moduleId', id))
					.take(MODULE_QUESTION_READ_LIMIT);
				return results;
			}
		}
		const max = Math.min(Math.max(limit ?? 200, 1), 1000);
		const results = await ctx.db
			.query('question')
			.withSearchIndex('by_moduleId_searchText', (q) =>
				q.search('searchText', trimmed).eq('moduleId', id)
			)
			.take(max);
		if ((sort || 'order') === 'created_desc') {
			return results.sort((a, b) => (b._creationTime || 0) - (a._creationTime || 0));
		}
		return results.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	}
});
