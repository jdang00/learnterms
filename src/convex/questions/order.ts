import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { authCuratorMutation } from '../authQueries';
import { requireModuleAccess } from '../access';
import { adjustModuleQuestionCount, shiftQuestionStats } from '../moduleStats';
import { MODULE_QUESTION_READ_LIMIT, checkModuleCapacity, publishedUnits } from './shared';

export const updateQuestionOrder = authCuratorMutation({
	args: {
		questionId: v.id('question'),
		newOrder: v.number(),
		moduleId: v.id('module')
	},
	handler: async (ctx, args) => {
		await requireModuleAccess(ctx, args.moduleId);
		const allQuestions = await ctx.db
			.query('question')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', args.moduleId))
			.take(MODULE_QUESTION_READ_LIMIT);

		// Sort questions by their current order to get the correct sequence
		allQuestions.sort((a, b) => a.order - b.order);

		const movedQuestion = allQuestions.find((q) => q._id === args.questionId);
		if (!movedQuestion) return;

		// Find the current position of the moved question in the sorted array
		const oldIndex = allQuestions.findIndex((q) => q._id === args.questionId);
		const newIndex = args.newOrder;

		// Remove the moved question from its current position
		allQuestions.splice(oldIndex, 1);
		// Insert it at the new position
		allQuestions.splice(newIndex, 0, movedQuestion);

		// Update all questions with their new order based on their position in the array
		for (let i = 0; i < allQuestions.length; i++) {
			await ctx.db.patch(allQuestions[i]._id, { order: i });
		}
	}
});

export const moveQuestionsToModule = authCuratorMutation({
	args: {
		sourceModuleId: v.id('module'),
		targetModuleId: v.id('module'),
		questionIds: v.array(v.id('question'))
	},
	handler: async (ctx, args) => {
		await requireModuleAccess(ctx, args.sourceModuleId, true);
		await requireModuleAccess(ctx, args.targetModuleId, true);
		if (args.sourceModuleId === args.targetModuleId) {
			return { moved: 0, errors: [], success: true };
		}

		await checkModuleCapacity(ctx, args.targetModuleId, args.questionIds.length);

		const targetQuestions = await ctx.db
			.query('question')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', args.targetModuleId))
			.take(MODULE_QUESTION_READ_LIMIT);

		let nextOrder =
			targetQuestions.length > 0 ? Math.max(...targetQuestions.map((q) => q.order)) + 1 : 0;

		const targetModule = await ctx.db.get(args.targetModuleId);
		if (!targetModule) throw new Error('Target module not found');
		const errors: string[] = [];
		const movedQuestions: Array<{ _id: Id<'question'>; moduleId: Id<'module'> }> = [];
		let moved = 0;
		let movedPublished = 0;

		for (const qid of args.questionIds) {
			const q = await ctx.db.get(qid);
			if (!q) {
				errors.push(`Question ${qid} not found`);
				continue;
			}
			if (q.moduleId !== args.sourceModuleId) {
				errors.push(`Question ${qid} not in source module`);
				continue;
			}
			await ctx.db.patch(qid, {
				moduleId: args.targetModuleId,
				order: nextOrder,
				updatedAt: Date.now()
			});
			movedQuestions.push({ _id: qid, moduleId: q.moduleId });
			moved += 1;
			movedPublished += publishedUnits(q.status);
			nextOrder += 1;
		}

		// Reorder remaining questions in source module to keep contiguous order values
		const remaining = await ctx.db
			.query('question')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', args.sourceModuleId))
			.take(MODULE_QUESTION_READ_LIMIT);
		remaining.sort((a, b) => a.order - b.order);
		for (let i = 0; i < remaining.length; i++) {
			const item = remaining[i];
			if (item.order !== i) await ctx.db.patch(item._id, { order: i });
		}

		await shiftQuestionStats(ctx, movedQuestions, {
			moduleId: args.targetModuleId,
			classId: targetModule.classId
		});

		// Adjust question counts for both modules
		if (moved > 0) {
			await adjustModuleQuestionCount(ctx, args.sourceModuleId, -moved, -movedPublished);
			await adjustModuleQuestionCount(ctx, args.targetModuleId, moved, movedPublished);
		}

		return { moved, errors, success: errors.length === 0 };
	}
});
