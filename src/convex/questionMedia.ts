import { v } from 'convex/values';
import { authQuery, authCreateMutation } from './authQueries';

export const getByQuestionId = authQuery({
  args: {
    questionId: v.id('question')
  },
  handler: async ({ db }, args) => {
    const media = await db
      .query('questionMedia')
      .withIndex('by_questionId', (q) => q.eq('questionId', args.questionId))
      .filter((q) => q.eq(q.field('deletedAt'), undefined))
      .collect();
    return media.sort((a, b) => a.order - b.order);
  }
});

export const create = authCreateMutation({
  args: {
    questionId: v.id('question'),
    url: v.string(),
    mediaType: v.string(),
    mimeType: v.string(),
    altText: v.string(),
    caption: v.optional(v.string()),
    order: v.optional(v.number()),
    metadata: v.optional(
      v.object({
        uploadthingKey: v.optional(v.string()),
        sizeBytes: v.optional(v.number()),
        originalFileName: v.optional(v.string())
      })
    )
  },
  handler: async ({ db }, args) => {
    const question = await db.get(args.questionId);
    if (!question || question.deletedAt) {
      throw new Error('Question not found');
    }

    // Enforce images only and 8MB limit
    const isImage = args.mimeType.startsWith('image/');
    if (!isImage) {
      throw new Error('Only image uploads are allowed');
    }
    const sizeBytes = args.metadata?.sizeBytes;
    if (typeof sizeBytes === 'number' && sizeBytes > 8 * 1024 * 1024) {
      throw new Error('Image exceeds 8MB limit');
    }

    let order = args.order;
    if (order === undefined) {
      const existing = await db
        .query('questionMedia')
        .withIndex('by_questionId', (q) => q.eq('questionId', args.questionId))
        .filter((q) => q.eq(q.field('deletedAt'), undefined))
        .collect();
      order = existing.length;
    }

    const id = await db.insert('questionMedia', {
      url: args.url,
      type: 'uploadthing',
      questionId: args.questionId,
      updatedAt: Date.now(),
      mediaType: args.mediaType,
      mimeType: args.mimeType,
      altText: args.altText,
      caption: args.caption,
      order,
      metadata: args.metadata ?? {}
    });
    return id;
  }
});

export const softDelete = authCreateMutation({
  args: {
    mediaId: v.id('questionMedia')
  },
  handler: async ({ db }, args) => {
    const media = await db.get(args.mediaId);
    if (!media || media.deletedAt) {
      throw new Error('Media not found');
    }
    await db.patch(args.mediaId, { deletedAt: Date.now(), updatedAt: Date.now() });
    const fileKey = (media.metadata as { uploadthingKey?: string } | undefined)?.uploadthingKey;
    return { success: true, fileKey };
  }
});

export const update = authCreateMutation({
  args: {
    mediaId: v.id('questionMedia'),
    altText: v.optional(v.string()),
    caption: v.optional(v.string()),
    order: v.optional(v.number())
  },
  handler: async ({ db }, args) => {
    const media = await db.get(args.mediaId);
    if (!media || media.deletedAt) {
      throw new Error('Media not found');
    }
    await db.patch(args.mediaId, {
      altText: args.altText ?? media.altText,
      caption: args.caption ?? media.caption,
      order: args.order ?? media.order,
      updatedAt: Date.now()
    });
    return { updated: true };
  }
});


