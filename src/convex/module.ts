import { query } from './_generated/server';
import { v } from 'convex/values';

export const getClassModules = query({
	// Enter class ID
	args: { id: v.id('class') },
	handler: async (ctx, args) => {
		const classes = ctx.db
			.query('module')
			.filter((q) => q.eq(q.field('classId'), args.id))
			.collect();

		return classes;
	}
});

export const getModuleById = query({
	args: { id: v.id('module') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	}
});
