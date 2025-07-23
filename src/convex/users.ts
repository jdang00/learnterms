import { query } from './_generated/server';
import { v } from 'convex/values';

export const getUserById = query({
	args: { id: v.string() },
	handler: async (ctx, args) => {
		const user = ctx.db
			.query('users')
			.filter((q) => q.eq(q.field('clerkUserId'), args.id))
			.collect();

		return user;
	}
});
