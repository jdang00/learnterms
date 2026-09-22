import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireCurrentUser } from './access';

const MAX_TOOLS = 40;
const MAX_ID_LENGTH = 48;

const layoutValidator = v.object({
	items: v.array(
		v.object({
			id: v.string(),
			display: v.union(v.literal('icon'), v.literal('label'), v.literal('both'))
		})
	),
	overflow: v.array(v.string())
});

export const getLayout = query({
	args: {},
	returns: v.union(layoutValidator, v.null()),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return null;
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
			.first();
		if (!user || user.deletedAt) return null;
		const doc = await ctx.db
			.query('quizDockLayouts')
			.withIndex('by_userId', (q) => q.eq('userId', user._id))
			.unique();
		return doc ? { items: doc.items, overflow: doc.overflow } : null;
	}
});

// Passing null clears the saved layout so the user falls back to the default dock.
export const saveLayout = mutation({
	args: { layout: v.union(layoutValidator, v.null()) },
	returns: v.null(),
	handler: async (ctx, { layout }) => {
		const user = await requireCurrentUser(ctx);
		const existing = await ctx.db
			.query('quizDockLayouts')
			.withIndex('by_userId', (q) => q.eq('userId', user._id))
			.unique();

		if (layout === null) {
			if (existing) await ctx.db.delete(existing._id);
			return null;
		}

		if (layout.items.length > MAX_TOOLS || layout.overflow.length > MAX_TOOLS) {
			throw new Error('Too many dock tools');
		}
		const ids = [...layout.items.map((item) => item.id), ...layout.overflow];
		if (ids.some((id) => !id || id.length > MAX_ID_LENGTH)) throw new Error('Invalid dock tool');

		const fields = { items: layout.items, overflow: layout.overflow, updatedAt: Date.now() };
		if (existing) await ctx.db.patch(existing._id, fields);
		else await ctx.db.insert('quizDockLayouts', { userId: user._id, ...fields });
		return null;
	}
});
