import { R2 } from '@convex-dev/r2';
import { mutation, query } from './_generated/server';
import { components } from './_generated/api';
import type { DataModel, Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { requireCurrentUser } from './access';

export const r2 = new R2(components.r2);

type ReadCtx = QueryCtx | MutationCtx;

function canManageDocuments(user: Doc<'users'>) {
	return user.role === 'dev' || user.role === 'admin' || user.role === 'curator';
}

async function assertCanUpload(ctx: ReadCtx) {
	const user = await requireCurrentUser(ctx);
	if (!canManageDocuments(user)) {
		throw new Error('Unauthorized');
	}
	return user;
}

function fileExtension(fileName: string) {
	const match = fileName
		.trim()
		.toLowerCase()
		.match(/\.([a-z0-9]{1,12})$/);
	return match ? `.${match[1]}` : '';
}

function slugifyFileName(fileName: string) {
	const baseName = fileName
		.replace(/\.[^/.]+$/, '')
		.trim()
		.toLowerCase();
	const slug = baseName
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
	return slug || 'document';
}

function todayPath() {
	return new Date().toISOString().slice(0, 10);
}

function documentObjectKey(args: { cohortId: Id<'cohort'>; fileName: string }) {
	const uniqueId = crypto.randomUUID();
	return [
		'cohorts',
		String(args.cohortId),
		'content-library',
		todayPath(),
		`${uniqueId}-${slugifyFileName(args.fileName)}${fileExtension(args.fileName)}`
	].join('/');
}

async function findDocumentByR2Key(ctx: ReadCtx, key: string, user: Doc<'users'>) {
	if (user.role === 'dev') {
		return await ctx.db
			.query('contentLib')
			.filter((q) =>
				q.and(
					q.eq(q.field('deletedAt'), undefined),
					q.eq(q.field('metadata.storageProvider'), 'r2'),
					q.eq(q.field('metadata.r2Key'), key)
				)
			)
			.first();
	}

	if (!user.cohortId) {
		return null;
	}
	const cohortId = user.cohortId;

	return await ctx.db
		.query('contentLib')
		.withIndex('by_cohortId', (q) => q.eq('cohortId', cohortId))
		.filter((q) =>
			q.and(
				q.eq(q.field('deletedAt'), undefined),
				q.eq(q.field('metadata.storageProvider'), 'r2'),
				q.eq(q.field('metadata.r2Key'), key)
			)
		)
		.first();
}

async function assertCanReadKey(ctx: ReadCtx, key: string) {
	const user = await requireCurrentUser(ctx);
	const document = await findDocumentByR2Key(ctx, key, user);
	if (!document) {
		throw new Error('Document not found or access denied');
	}
}

export const { syncMetadata, getMetadata } = r2.clientApi<DataModel>({
	checkUpload: async (ctx) => {
		await assertCanUpload(ctx);
	},
	checkReadKey: async (ctx, _bucket, key) => {
		await assertCanReadKey(ctx, key);
	}
});

export const generateUploadUrl = mutation({
	args: {
		cohortId: v.id('cohort'),
		fileName: v.string()
	},
	handler: async (ctx, args) => {
		const user = await assertCanUpload(ctx);
		if (user.role !== 'dev' && user.cohortId !== args.cohortId) {
			throw new Error('Unauthorized for this cohort');
		}

		return await r2.generateUploadUrl(
			documentObjectKey({
				cohortId: args.cohortId,
				fileName: args.fileName
			})
		);
	}
});

export const getUrl = query({
	args: {
		key: v.string()
	},
	handler: async (ctx, args) => {
		await assertCanReadKey(ctx, args.key);
		return await r2.getUrl(args.key, { expiresIn: 60 * 15 });
	}
});

export const getDocumentUrl = query({
	args: {
		documentId: v.id('contentLib')
	},
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		const document = await ctx.db.get(args.documentId);
		if (
			!document ||
			document.deletedAt ||
			document.metadata?.storageProvider !== 'r2' ||
			(user.role !== 'dev' && user.cohortId !== document.cohortId)
		) {
			throw new Error('Document not found or access denied');
		}

		const key =
			document.metadata.mimeType === 'application/pdf'
				? document.metadata.r2Key
				: document.metadata.convertedPdfR2Key;
		if (!key) {
			throw new Error('No PDF source is available for this document');
		}

		return await r2.getUrl(key, { expiresIn: 60 * 15 });
	}
});
