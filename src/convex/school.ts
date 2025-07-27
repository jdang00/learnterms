import { query } from './_generated/server';
import { v } from 'convex/values';

export const getAllSchools = query({
	args: {},
	handler: async (ctx) => {
		const schools = ctx.db.query('school').collect();

		return schools;
	}
});

export const getSchoolById = query({
	args: { id: v.string() },
	handler: async (ctx, args) => {
		const schools = ctx.db
			.query('school')
			.filter((q) => q.eq(q.field('_id'), args.id))
			.collect();

		return schools;
	}
});
