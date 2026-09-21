import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import schema from './schema';
import { requireMediaQuestion, requireMediaUser } from './questionMediaAccess';
import { validateMediaText } from './questionMediaSaving';
import { r2 } from './r2Documents';

export const getByQuestionId = query({
	args: { questionId: v.id('question'), urlRefresh: v.optional(v.number()) },
	returns: v.array(
		v.object({
			...schema.tables.questionMedia.validator.fields,
			_id: v.id('questionMedia'),
			_creationTime: v.number()
		})
	),
	handler: async (ctx, { questionId }) => {
		const { cohortId } = await requireMediaQuestion(ctx, questionId);
		const media = await ctx.db
			.query('questionMedia')
			.withIndex('by_questionId_deletedAt', (q) =>
				q.eq('questionId', questionId).eq('deletedAt', undefined)
			)
			.take(1000);
		return await Promise.all(
			media
				.sort((a, b) => a.order - b.order)
				.map(async (item) => {
					if (item.metadata.storageProvider !== 'r2') return item;
					if (!item.metadata.r2Key || item.metadata.cohortId !== cohortId)
						throw new Error('Image storage scope mismatch');
					return { ...item, url: await r2.getUrl(item.metadata.r2Key, { expiresIn: 60 * 60 }) };
				})
		);
	}
});

export const getByQuestionIds = query({
	args: { questionIds: v.array(v.id('question')) },
	returns: v.array(v.object({ questionId: v.id('question'), hasMedia: v.boolean() })),
	handler: async (ctx, { questionIds }) => {
		await requireMediaUser(ctx);
		if (questionIds.length > 150) throw new Error('Too many questions');
		const results = [];
		for (const questionId of new Set(questionIds)) {
			await requireMediaQuestion(ctx, questionId);
			const media = await ctx.db
				.query('questionMedia')
				.withIndex('by_questionId_deletedAt', (q) =>
					q.eq('questionId', questionId).eq('deletedAt', undefined)
				)
				.first();
			if (media) results.push({ questionId, hasMedia: true });
		}
		return results;
	}
});

export const softDelete = mutation({
	args: { mediaId: v.id('questionMedia') },
	returns: v.object({ success: v.boolean() }),
	handler: async (ctx, { mediaId }) => {
		const media = await ctx.db.get(mediaId);
		if (!media || media.deletedAt) throw new Error('Media not found');
		await requireMediaQuestion(ctx, media.questionId, true);
		await ctx.db.patch(mediaId, { deletedAt: Date.now(), updatedAt: Date.now() });
		// Preserve stored objects for recovery, including all legacy UploadThing files.
		return { success: true };
	}
});

export const update = mutation({
	args: {
		mediaId: v.id('questionMedia'),
		altText: v.optional(v.string()),
		caption: v.optional(v.string()),
		order: v.optional(v.number()),
		showOnSolution: v.optional(v.boolean())
	},
	returns: v.object({ updated: v.boolean() }),
	handler: async (ctx, args) => {
		const media = await ctx.db.get(args.mediaId);
		if (!media || media.deletedAt) throw new Error('Media not found');
		await requireMediaQuestion(ctx, media.questionId, true);
		validateMediaText(args.altText, args.caption);
		if (args.order !== undefined && (!Number.isSafeInteger(args.order) || args.order < 0))
			throw new Error('Invalid image order');
		await ctx.db.patch(args.mediaId, {
			altText: args.altText ?? media.altText,
			caption: args.caption ?? media.caption,
			order: args.order ?? media.order,
			showOnSolution: args.showOnSolution ?? media.showOnSolution,
			updatedAt: Date.now()
		});
		return { updated: true };
	}
});
