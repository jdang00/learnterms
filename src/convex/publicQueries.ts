import { query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Public (no-auth) query for module metadata.
 * Used by OG image generation and social media crawlers.
 */
export const getModuleMetadata = query({
	args: { id: v.id('module') },
	handler: async (ctx, args) => {
		const module = await ctx.db.get(args.id);

		if (!module || module.status !== 'published') {
			return null;
		}

		const classDoc = await ctx.db.get(module.classId);

		return {
			title: module.title,
			emoji: module.emoji ?? null,
			description: module.description,
			questionCount: module.questionCount ?? 0,
			className: classDoc?.name ?? null,
			classCode: classDoc?.code ?? null
		};
	}
});
