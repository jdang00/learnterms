import { v } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { authCuratorMutation } from '../authQueries';
import { requireModuleAccess } from '../access';
import { adjustModuleQuestionCount } from '../moduleStats';
import { getRationale } from '../../lib/utils/rationale';
import {
	assignFreshOptionIds,
	convertQuestionType,
	normalizeMatchingCorrectAnswers,
	normalizeStandardCorrectAnswers
} from './options';
import {
	applyQuestionCreationBadgesForActor,
	checkModuleCapacity,
	computeSearchText,
	publishedUnits
} from './shared';

async function insertCopy(ctx: MutationCtx, original: Doc<'question'>, order: number) {
	const { optionsWithIds, legacyIdMap } = assignFreshOptionIds(original.options || []);
	const correctAnswers =
		convertQuestionType(original.type) === 'matching'
			? normalizeMatchingCorrectAnswers(original.correctAnswers || [], optionsWithIds, legacyIdMap)
			: normalizeStandardCorrectAnswers(original.correctAnswers || [], optionsWithIds, legacyIdMap);
	const rationale = getRationale(original);
	return await ctx.db.insert('question', {
		moduleId: original.moduleId,
		type: original.type,
		stem: original.stem,
		options: optionsWithIds,
		correctAnswers,
		rationale,
		freeResponseAcceptance: original.freeResponseAcceptance,
		examFindings: original.examFindings,
		examFindingsStyle: original.examFindingsStyle,
		aiGenerated: original.aiGenerated,
		status: original.status,
		order,
		metadata: original.metadata,
		updatedAt: Date.now(),
		searchText: computeSearchText({
			stem: original.stem,
			rationale,
			examFindings: original.examFindings,
			freeResponseAcceptance: original.freeResponseAcceptance,
			type: original.type,
			status: original.status,
			aiGenerated: original.aiGenerated,
			options: optionsWithIds,
			correctAnswers,
			metadata: original.metadata
		})
	});
}

async function duplicateInto(
	ctx: MutationCtx & { user: Doc<'users'> },
	questionId: Id<'question'>,
	count: number
) {
	const original = await ctx.db.get(questionId);
	if (!original) throw new Error('Question not found');
	await requireModuleAccess(ctx, original.moduleId, true);
	await checkModuleCapacity(ctx, original.moduleId, count);

	const lastInModule = await ctx.db
		.query('question')
		.withIndex('by_moduleId_order', (q) => q.eq('moduleId', original.moduleId))
		.order('desc')
		.first();
	const nextOrder = lastInModule ? (lastInModule.order ?? 0) + 1 : 0;

	const insertedIds: Id<'question'>[] = [];
	for (let i = 0; i < count; i++) {
		insertedIds.push(await insertCopy(ctx, original, nextOrder + i));
	}
	await adjustModuleQuestionCount(
		ctx,
		original.moduleId,
		insertedIds.length,
		insertedIds.length * publishedUnits(original.status)
	);
	await applyQuestionCreationBadgesForActor(ctx, ctx.user, original.moduleId, insertedIds.length);
	return insertedIds;
}

export const duplicateQuestion = authCuratorMutation({
	args: { questionId: v.id('question') },
	handler: async (ctx, { questionId }) => (await duplicateInto(ctx, questionId, 1))[0]
});

export const duplicateQuestionMany = authCuratorMutation({
	args: { questionId: v.id('question'), count: v.number() },
	handler: async (ctx, { questionId, count }) => {
		const insertedIds = await duplicateInto(ctx, questionId, Math.max(1, Math.min(10, count)));
		return { insertedIds, insertedCount: insertedIds.length };
	}
});
