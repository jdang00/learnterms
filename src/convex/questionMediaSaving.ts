import { v, type Infer } from 'convex/values';
import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { requireMediaQuestion, requireOwnedUpload } from './questionMediaAccess';
import { MAX_QUESTION_IMAGES } from '../lib/utils/questionMediaUpload';

export const imageAttachment = v.object({
	uploadId: v.id('questionMediaUploads'),
	altText: v.string(),
	caption: v.optional(v.string()),
	showOnSolution: v.optional(v.boolean())
});

export function validateMediaText(altText?: string, caption?: string) {
	if ((altText?.length ?? 0) > 500 || (caption?.length ?? 0) > 2000) {
		throw new Error('Image alt text must be under 500 characters and captions under 2,000.');
	}
}

// Called inside the question save transaction: both question and images save, or neither does.
export async function attachQuestionImages(
	ctx: MutationCtx,
	questionId: Id<'question'>,
	images: Infer<typeof imageAttachment>[]
) {
	if (!images.length) return;
	if (
		images.length > MAX_QUESTION_IMAGES ||
		new Set(images.map((image) => image.uploadId)).size !== images.length
	) {
		throw new Error('Too many or duplicate image attachments');
	}
	const { question } = await requireMediaQuestion(ctx, questionId, true);
	const existing = await ctx.db
		.query('questionMedia')
		.withIndex('by_questionId_deletedAt', (q) =>
			q.eq('questionId', questionId).eq('deletedAt', undefined)
		)
		.take(MAX_QUESTION_IMAGES + 1);
	let order = existing.reduce((max, media) => Math.max(max, media.order + 1), 0);
	let count = existing.length;
	for (const image of images) {
		validateMediaText(image.altText, image.caption);
		const upload = await requireOwnedUpload(ctx, image.uploadId);
		if (upload.moduleId !== question.moduleId)
			throw new Error('Image belongs to a different module');
		if (upload.status === 'attached' && upload.questionId === questionId) continue;
		if (upload.status !== 'ready' || upload.expiresAt <= Date.now())
			throw new Error('Image upload expired or is not ready. Upload it again.');
		if (++count > MAX_QUESTION_IMAGES)
			throw new Error(`A question can have up to ${MAX_QUESTION_IMAGES} images.`);
		await ctx.db.insert('questionMedia', {
			questionId,
			url: '',
			type: 'r2',
			mediaType: 'image',
			mimeType: upload.mimeType,
			altText: image.altText.trim() || upload.originalFileName,
			caption: image.caption?.trim() || undefined,
			showOnSolution: image.showOnSolution ?? false,
			order: order++,
			updatedAt: Date.now(),
			metadata: {
				storageProvider: 'r2',
				r2Key: upload.r2Key,
				cohortId: upload.cohortId,
				sizeBytes: upload.sizeBytes,
				originalFileName: upload.originalFileName
			}
		});
		await ctx.db.patch(upload._id, { status: 'attached', questionId });
	}
}
