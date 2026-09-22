import { v } from 'convex/values';
import { query, mutation, internalMutation } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { requireCurrentUser, requireClassAccess } from './access';
import { EMPTY_NOTE, normalizeNote } from '../lib/question-notes/document';

const snapshot = { content: v.string(), revision: v.number() };
async function access(ctx: QueryCtx | MutationCtx, questionId: Id<'question'>) {
	const user = await requireCurrentUser(ctx);
	const question = await ctx.db.get(questionId);
	const module = question ? await ctx.db.get(question.moduleId) : null;
	if (
		!question ||
		question.deletedAt ||
		question.status !== 'published' ||
		!module ||
		module.deletedAt
	)
		throw new Error('Question unavailable');
	const classDoc = await requireClassAccess(ctx, user, module.classId);
	const cohort = await ctx.db.get(classDoc.cohortId);
	if (!cohort || cohort.deletedAt) throw new Error('Class access denied');
	return user;
}
export const get = query({
	args: { questionId: v.id('question') },
	returns: v.object(snapshot),
	handler: async (ctx, { questionId }) => {
		const user = await access(ctx, questionId);
		const note = await ctx.db
			.query('questionNotes')
			.withIndex('by_userId_questionId', (q) =>
				q.eq('userId', user._id).eq('questionId', questionId)
			)
			.unique();
		return { content: note?.content ?? EMPTY_NOTE, revision: note?.revision ?? 0 };
	}
});
export const save = mutation({
	args: { questionId: v.id('question'), content: v.string(), expectedRevision: v.number() },
	returns: v.object({ ...snapshot, status: v.union(v.literal('saved'), v.literal('conflict')) }),
	handler: async (ctx, { questionId, content: raw, expectedRevision }) => {
		const user = await access(ctx, questionId);
		if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
			throw new Error('Invalid note revision.');
		const { content } = normalizeNote(raw);
		const note = await ctx.db
			.query('questionNotes')
			.withIndex('by_userId_questionId', (q) =>
				q.eq('userId', user._id).eq('questionId', questionId)
			)
			.unique();
		const revision = note?.revision ?? 0;
		const current = note?.content ?? EMPTY_NOTE;
		// Identical retries are safe even if the successful response was lost.
		if (content === current) return { status: 'saved' as const, content, revision };
		if (expectedRevision !== revision)
			return { status: 'conflict' as const, content: current, revision };
		const fields = { content, revision: revision + 1, updatedAt: Date.now() };
		if (note) await ctx.db.patch(note._id, fields);
		else await ctx.db.insert('questionNotes', { userId: user._id, questionId, ...fields });
		// Retain the revision when cleared so older tabs cannot recreate an erased note.
		return { status: 'saved' as const, content, revision: fields.revision };
	}
});
export const deleteForQuestion = internalMutation({
	args: { questionId: v.id('question') },
	returns: v.null(),
	handler: async (ctx, { questionId }) => {
		const notes = await ctx.db
			.query('questionNotes')
			.withIndex('by_questionId', (q) => q.eq('questionId', questionId))
			.take(100);
		for (const note of notes) await ctx.db.delete(note._id);
		if (notes.length === 100)
			await ctx.scheduler.runAfter(0, internal.questionNotes.deleteForQuestion, { questionId });
		return null;
	}
});
