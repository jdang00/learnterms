import { v } from 'convex/values';
import { RateLimiter } from '@convex-dev/rate-limiter';
import { mutation, internalMutation } from './_generated/server';
import { internal, components } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';
import { requireMediaModule, requireOwnedUpload } from './questionMediaAccess';
import { validateQuestionImage } from '../lib/utils/questionMediaUpload';
import { r2 } from './r2Documents';

const PENDING_LIFETIME_MS = 24 * 60 * 60 * 1000;
// Allow any verification action already in flight to finish before deleting its objects.
const CLEANUP_GRACE_MS = 15 * 60 * 1000;
const limiter = new RateLimiter(components.rateLimiter, {
	questionImages: { kind: 'token bucket', rate: 60, period: 60 * 60 * 1000, capacity: 20 }
});
const uploadArgs = { uploadId: v.id('questionMediaUploads') };

export const begin = mutation({
	args: {
		moduleId: v.id('module'),
		fileName: v.string(),
		mimeType: v.string(),
		sizeBytes: v.number()
	},
	returns: v.object({ uploadId: v.id('questionMediaUploads'), url: v.string() }),
	handler: async (ctx, args): Promise<{ uploadId: Id<'questionMediaUploads'>; url: string }> => {
		const scope = await requireMediaModule(ctx, args.moduleId, true);
		validateQuestionImage(args.mimeType, args.sizeBytes);
		await limiter.limit(ctx, 'questionImages', { key: scope.user._id, throws: true });
		const extension = {
			'image/jpeg': 'jpg',
			'image/png': 'png',
			'image/webp': 'webp',
			'image/gif': 'gif'
		}[args.mimeType];
		const prefix = `cohorts/${scope.cohortId}/classes/${scope.classDoc._id}/modules/${args.moduleId}/question-media`;
		const name = `${crypto.randomUUID()}.${extension}`;
		const stagingKey = `${prefix}/pending/${name}`;
		const uploadId = await ctx.db.insert('questionMediaUploads', {
			moduleId: args.moduleId,
			cohortId: scope.cohortId,
			uploadedBy: scope.user._id,
			stagingKey,
			r2Key: `${prefix}/images/${name}`,
			originalFileName: args.fileName.split(/[\\/]/).pop()?.slice(0, 255) || `image.${extension}`,
			mimeType: args.mimeType,
			sizeBytes: args.sizeBytes,
			status: 'uploading',
			expiresAt: Date.now() + PENDING_LIFETIME_MS
		});
		await ctx.scheduler.runAfter(
			PENDING_LIFETIME_MS + CLEANUP_GRACE_MS,
			internal.questionMediaUploads.cleanup,
			{ uploadId }
		);
		const { url } = await r2.generateUploadUrl(stagingKey);
		return { uploadId, url };
	}
});

export const claim = internalMutation({
	args: uploadArgs,
	returns: v.object({
		...schema.tables.questionMediaUploads.validator.fields,
		_id: v.id('questionMediaUploads'),
		_creationTime: v.number()
	}),
	handler: async (ctx, { uploadId }) => {
		const upload = await requireOwnedUpload(ctx, uploadId);
		if (upload.status === 'ready' && upload.expiresAt > Date.now()) return upload;
		if (upload.status !== 'uploading' || upload.expiresAt <= Date.now())
			throw new Error('Image upload is expired or already processing');
		await ctx.db.patch(uploadId, { status: 'verifying' });
		return upload;
	}
});

export const markReady = internalMutation({
	args: uploadArgs,
	returns: v.null(),
	handler: async (ctx, { uploadId }) => {
		const upload = await requireOwnedUpload(ctx, uploadId);
		if (upload.status !== 'verifying' || upload.expiresAt <= Date.now())
			throw new Error('Image upload was canceled or expired');
		await ctx.db.patch(uploadId, { status: 'ready' });
		return null;
	}
});

export const discard = mutation({
	args: uploadArgs,
	returns: v.null(),
	handler: async (ctx, { uploadId }) => {
		const upload = await requireOwnedUpload(ctx, uploadId);
		if (upload.status === 'attached') return null;
		await ctx.db.patch(uploadId, { status: 'abandoned' });
		// Deferred cleanup also catches an in-flight PUT or verification finishing after cancellation.
		return null;
	}
});

export const cleanup = internalMutation({
	args: uploadArgs,
	returns: v.null(),
	handler: async (ctx, { uploadId }) => {
		const upload = await ctx.db.get(uploadId);
		if (!upload) return null;
		if (upload.expiresAt + CLEANUP_GRACE_MS > Date.now()) {
			await ctx.scheduler.runAt(
				upload.expiresAt + CLEANUP_GRACE_MS,
				internal.questionMediaUploads.cleanup,
				{ uploadId }
			);
			return null;
		}
		// The browser's upload URL has expired by now; it cannot recreate the staging object.
		await r2.deleteObject(ctx, upload.stagingKey);
		if (upload.status !== 'attached') await r2.deleteObject(ctx, upload.r2Key);
		await ctx.db.delete(uploadId);
		return null;
	}
});
