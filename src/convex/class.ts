import { query } from './_generated/server';
import { v } from 'convex/values';

// Get user classes by their UserId and looking up their school and cohort
export const getUserClasses = query({
	args: { id: v.string() },
	handler: async (ctx, args) => {
		const classes = ctx.db
			.query('class')
			.filter((q) => q.eq(q.field('cohortId'), args.id))
			.collect();

		return classes;
	}
});
