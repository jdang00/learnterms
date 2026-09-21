import type { Id } from './_generated/dataModel';
import type { QueryCtx, MutationCtx } from './_generated/server';

type ReadCtx = QueryCtx | MutationCtx;

export async function requireMediaUser(ctx: ReadCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error('Not authenticated');
	const user = await ctx.db
		.query('users')
		.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
		.unique();
	if (!user || user.deletedAt) throw new Error('User not found');
	return user;
}

export async function requireMediaModule(ctx: ReadCtx, moduleId: Id<'module'>, write = false) {
	const user = await requireMediaUser(ctx);
	const module = await ctx.db.get(moduleId);
	const classDoc = module ? await ctx.db.get(module.classId) : null;
	const cohort = classDoc ? await ctx.db.get(classDoc.cohortId) : null;
	if (
		!module ||
		module.deletedAt ||
		!classDoc ||
		classDoc.deletedAt ||
		!cohort ||
		cohort.deletedAt ||
		(user.role !== 'dev' && user.cohortId !== cohort._id) ||
		(write && !['dev', 'admin', 'curator'].includes(user.role ?? ''))
	) {
		throw new Error('Question media access denied');
	}
	return { user, module, classDoc, cohortId: cohort._id };
}

export async function requireMediaQuestion(
	ctx: ReadCtx,
	questionId: Id<'question'>,
	write = false
) {
	const question = await ctx.db.get(questionId);
	if (!question || question.deletedAt) throw new Error('Question not found');
	const scope = await requireMediaModule(ctx, question.moduleId, write);
	return { ...scope, question };
}

export async function requireOwnedUpload(ctx: ReadCtx, uploadId: Id<'questionMediaUploads'>) {
	const upload = await ctx.db.get(uploadId);
	if (!upload) throw new Error('Image upload not found');
	const scope = await requireMediaModule(ctx, upload.moduleId, true);
	if (upload.uploadedBy !== scope.user._id || upload.cohortId !== scope.cohortId) {
		throw new Error('Image upload access denied');
	}
	return upload;
}
