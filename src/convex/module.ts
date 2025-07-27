import { query } from './_generated/server';
import { v } from 'convex/values';

export const getClassModules = query({
	// Enter class ID
	args: { id: v.string() },
	handler: async (ctx, args) => {
		const classes = ctx.db
			.query('module')
			.filter((q) => q.eq(q.field('classId'), args.id))
			.collect();

		return classes;
	}
});
