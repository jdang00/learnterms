import type { QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';

type ReadCtx = Pick<QueryCtx, 'auth' | 'db'>;

export async function requireIdentity(ctx: Pick<QueryCtx, 'auth'>) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error('Unauthorized');
	return identity;
}

export async function requireSelfIdentity(ctx: Pick<QueryCtx, 'auth'>, clerkUserId: string) {
	const identity = await requireIdentity(ctx);
	if (identity.subject !== clerkUserId) throw new Error('Unauthorized');
	return identity;
}

export async function requireCurrentUser(ctx: ReadCtx) {
	const identity = await requireIdentity(ctx);
	const user = await ctx.db
		.query('users')
		.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
		.first();
	if (!user || user.deletedAt) throw new Error('Unauthorized');
	return user;
}

export async function requireSelfUser(ctx: ReadCtx, userId: Id<'users'>) {
	const user = await requireCurrentUser(ctx);
	if (user._id !== userId) throw new Error('Unauthorized');
	return user;
}

export function assertCohortStaff(user: Doc<'users'>, cohortId: Id<'cohort'>) {
	if (user.role === 'dev') return;
	if ((user.role !== 'admin' && user.role !== 'curator') || user.cohortId !== cohortId) {
		throw new Error('Unauthorized');
	}
}

export async function requireCohortStaff(ctx: ReadCtx, cohortId: Id<'cohort'>) {
	const user = await requireCurrentUser(ctx);
	assertCohortStaff(user, cohortId);
	return user;
}

export async function requireUserRead(ctx: ReadCtx, target: Doc<'users'> | null) {
	const user = await requireCurrentUser(ctx);
	if (!target || target.deletedAt) throw new Error('User not found');
	if (user._id === target._id || user.role === 'dev') return;
	if (!target.cohortId) throw new Error('Unauthorized');
	assertCohortStaff(user, target.cohortId);
}

export async function requireUserReadById(ctx: ReadCtx, userId: Id<'users'>) {
	await requireUserRead(ctx, await ctx.db.get(userId));
}

export async function requireClassAccess(ctx: ReadCtx, user: Doc<'users'>, classId: Id<'class'>) {
	const classDoc = await ctx.db.get(classId);
	if (
		!classDoc ||
		classDoc.deletedAt ||
		(user.role !== 'dev' && user.cohortId !== classDoc.cohortId)
	) {
		throw new Error('Class access denied');
	}
	return classDoc;
}
