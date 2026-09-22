import { v } from 'convex/values';
import { internal } from './_generated/api';
import { query, mutation, internalMutation } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { requireCurrentUser, requireClassAccess } from './access';
import {
	stemFingerprint,
	validStemHighlight,
	MAX_STEM_HIGHLIGHTS,
	highlightChange,
	applyHighlightChange
} from '../lib/utils/stemHighlights';

export const highlightValidator = v.object({
	id: v.string(),
	start: v.number(),
	end: v.number(),
	quote: v.string()
});

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
	return { user, question };
}

export const get = query({
	args: { questionId: v.id('question') },
	returns: v.object({
		questionId: v.id('question'),
		version: v.string(),
		ranges: v.array(highlightValidator),
		stale: v.boolean()
	}),
	handler: async (ctx, { questionId }) => {
		const { user, question } = await access(ctx, questionId);
		const version = await stemFingerprint(question.stem);
		const saved = await ctx.db
			.query('stemHighlights')
			.withIndex('by_user_question', (q) => q.eq('userId', user._id).eq('questionId', questionId))
			.unique();
		return {
			questionId,
			version,
			ranges: saved?.version === version ? saved.ranges : [],
			stale: !!saved && saved.version !== version
		};
	}
});

export const edit = mutation({
	args: {
		questionId: v.id('question'),
		version: v.string(),
		operation: v.union(
			v.object({ type: v.literal('add'), range: highlightValidator }),
			v.object({ type: v.literal('remove'), id: v.string() }),
			v.object({ type: v.literal('toggle'), range: highlightValidator }),
			v.object({
				type: v.literal('patch'),
				removeIds: v.array(v.string()),
				addRanges: v.array(highlightValidator)
			})
		)
	},
	returns: v.object({ added: v.array(highlightValidator), removed: v.array(highlightValidator) }),
	handler: async (ctx, { questionId, version, operation }) => {
		const { user, question } = await access(ctx, questionId);
		if (version !== (await stemFingerprint(question.stem)))
			throw new Error('Question changed. Reload before highlighting.');
		const saved = await ctx.db
			.query('stemHighlights')
			.withIndex('by_user_question', (q) => q.eq('userId', user._id).eq('questionId', questionId))
			.unique();
		let ranges = saved?.version === version ? saved.ranges : [];
		if ('range' in operation && !validStemHighlight(operation.range))
			throw new Error('Invalid highlight');
		if (
			operation.type === 'patch' &&
			(operation.removeIds.length > MAX_STEM_HIGHLIGHTS ||
				operation.addRanges.length > MAX_STEM_HIGHLIGHTS ||
				!operation.addRanges.every(validStemHighlight))
		)
			throw new Error('Invalid highlight');
		const change = highlightChange(ranges, operation);
		ranges = applyHighlightChange(ranges, change);
		if (
			ranges.length > MAX_STEM_HIGHLIGHTS ||
			ranges.reduce((sum, r) => sum + r.quote.length, 0) > 40_000
		)
			throw new Error('Highlight limit reached. Remove a highlight first.');

		if (!ranges.length) {
			if (saved) await ctx.db.delete(saved._id);
		} else if (saved) {
			await ctx.db.patch(saved._id, { version, ranges, updatedAt: Date.now() });
		} else {
			await ctx.db.insert('stemHighlights', {
				userId: user._id,
				questionId,
				version,
				ranges,
				updatedAt: Date.now()
			});
		}
		return change;
	}
});

// Question deletion can involve many students; clean up in bounded transactions.
export const deleteForQuestion = internalMutation({
	args: { questionId: v.id('question') },
	returns: v.null(),
	handler: async (ctx, { questionId }) => {
		const rows = await ctx.db
			.query('stemHighlights')
			.withIndex('by_question', (q) => q.eq('questionId', questionId))
			.take(100);
		for (const row of rows) await ctx.db.delete(row._id);
		if (rows.length === 100)
			await ctx.scheduler.runAfter(0, internal.stemHighlights.deleteForQuestion, { questionId });
		return null;
	}
});

export const setEnabled = mutation({
	args: { enabled: v.boolean() },
	returns: v.null(),
	handler: async (ctx, { enabled }) => {
		const user = await requireCurrentUser(ctx);
		await ctx.db.patch(user._id, { stemHighlightEnabled: enabled });
		return null;
	}
});
