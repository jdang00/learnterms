import type { Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

export async function getActor(ctx: Pick<QueryCtx, 'db' | 'auth'>) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error('Unauthorized');
	const user = await ctx.db
		.query('users')
		.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
		.first();
	if (!user) throw new Error('User not found');
	if (!(user.role === 'dev' || user.role === 'admin' || user.role === 'curator')) {
		throw new Error('Unauthorized');
	}
	return { identity, user };
}

export async function assertSaveAccess(
	ctx: MutationCtx,
	args: { moduleId: Id<'module'>; documentId: Id<'contentLib'> }
) {
	const { identity, user } = await getActor(ctx);
	const module = await ctx.db.get(args.moduleId);
	if (!module || module.deletedAt) throw new Error('Module not found');
	const classDoc = await ctx.db.get(module.classId);
	if (!classDoc || classDoc.deletedAt) throw new Error('Class not found');
	const document = await ctx.db.get(args.documentId);
	if (!document || document.deletedAt) throw new Error('Document not found');
	if (document.cohortId !== classDoc.cohortId) {
		throw new Error('Source document and destination module must be in the same cohort');
	}
	if (user.role !== 'dev' && user.cohortId !== classDoc.cohortId) {
		throw new Error('Unauthorized for this cohort');
	}
	return { identity, user, module, classDoc, document };
}
