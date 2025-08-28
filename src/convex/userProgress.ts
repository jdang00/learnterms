import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { authQuery } from './authQueries';
import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';

const getUserProgressRecords = async (
	ctx: QueryCtx,
	userId: Id<'users'>,
	classId: Id<'class'>,
	questionIds: Id<'question'>[]
): Promise<Doc<'userProgress'>[]> => {
	const recordsForUserAndClass = await ctx.db
		.query('userProgress')
		.withIndex('by_user_class', (q) => q.eq('userId', userId).eq('classId', classId))
		.collect();

	if (questionIds.length === 0) return [];

	const idSet = new Set(questionIds);
	return recordsForUserAndClass.filter((r) => idSet.has(r.questionId));
};

export const checkExistingRecord = authQuery({
	args: { userId: v.id('users'), questionId: v.id('question') },
	handler: async (ctx, args) => {
		const record = await ctx.db
			.query('userProgress')
			.withIndex('by_user_question', (q) =>
				q.eq('userId', args.userId).eq('questionId', args.questionId)
			)
			.unique();

		return record;
	}
});

export const getProgressForClass = authQuery({
	args: {
		userId: v.id('users'),
		classId: v.id('class')
	},
	handler: async (ctx, args) => {
		const progressRecords = await ctx.db
			.query('userProgress')
			.withIndex('by_user_class', (q) => q.eq('userId', args.userId).eq('classId', args.classId))
			.collect();

		const progressMap = new Map();
		progressRecords.forEach((record) => {
			progressMap.set(record.questionId, record);
		});

		const modules = await ctx.db
			.query('module')
			.withIndex('by_classId', (q) => q.eq('classId', args.classId))
			.collect();

		if (modules.length === 0) {
			return {};
		}

		const questionsByModule = new Map();

		for (const module of modules) {
			const questions = await ctx.db
				.query('question')
				.withIndex('by_moduleId', (q) => q.eq('moduleId', module._id))
				.collect();
			questionsByModule.set(module._id, questions);
		}

		const moduleProgress: Record<
			string,
			{
				moduleTitle: string;
				moduleOrder: number;
				totalQuestions: number;
				interactedQuestions: number;
				flaggedQuestions: number;
				masteredQuestions: number;
				completionPercentage: number;
				masteryPercentage: number;
			}
		> = {};

		for (const module of modules) {
			const moduleQuestions = questionsByModule.get(module._id) || [];
			const totalQuestions = moduleQuestions.length;

			let interactedQuestions = 0;
			let flaggedQuestions = 0;
			let masteredQuestions = 0;

			for (const question of moduleQuestions) {
				const progress = progressMap.get(question._id);
				if (progress) {
					if (progress.selectedOptions.length > 0 || progress.eliminatedOptions.length > 0) {
						interactedQuestions++;
					}
					if (progress.isFlagged) {
						flaggedQuestions++;
					}
					if (progress.isMastered) {
						masteredQuestions++;
					}
				}
			}

			moduleProgress[module._id] = {
				moduleTitle: module.title,
				moduleOrder: module.order,
				totalQuestions,
				interactedQuestions,
				flaggedQuestions,
				masteredQuestions,
				completionPercentage:
					totalQuestions > 0 ? Math.round((interactedQuestions / totalQuestions) * 100) : 0,
				masteryPercentage:
					totalQuestions > 0 ? Math.round((masteredQuestions / totalQuestions) * 100) : 0
			};
		}

		return moduleProgress;
	}
});

export const getUserProgressForModule = authQuery({
	args: {
		userId: v.id('users'),
		classId: v.id('class'),
		questionIds: v.array(v.id('question'))
	},
	handler: async (ctx, args) => {
		const records = await getUserProgressRecords(ctx, args.userId, args.classId, args.questionIds);

		const interactedQuestionIds = records
			.filter((record) => record.selectedOptions.length > 0 || record.eliminatedOptions.length > 0)
			.map((record) => record.questionId);

		const flaggedQuestionIds = records
			.filter((record) => record.isFlagged === true)
			.map((record) => record.questionId);

		return { interactedQuestionIds, flaggedQuestionIds };
	}
});

export const saveUserProgress = mutation({
	args: {
		userId: v.id('users'),
		classId: v.id('class'),
		questionId: v.id('question'),
		selectedOptions: v.optional(v.array(v.string())),
		eliminatedOptions: v.optional(v.array(v.string())),
		isFlagged: v.optional(v.boolean()),
		isMastered: v.optional(v.boolean()),
		attempts: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		// Check if record exists
		const existingRecord = await ctx.db
			.query('userProgress')
			.withIndex('by_user_question', (q) =>
				q.eq('userId', args.userId).eq('questionId', args.questionId)
			)
			.unique();

		if (existingRecord) {
			// Update existing record
			return await ctx.db.patch(existingRecord._id, {
				selectedOptions: args.selectedOptions ?? existingRecord.selectedOptions,
				eliminatedOptions: args.eliminatedOptions ?? existingRecord.eliminatedOptions,
				isFlagged: args.isFlagged ?? existingRecord.isFlagged,
				isMastered: args.isMastered ?? existingRecord.isMastered,
				attempts: args.attempts ?? existingRecord.attempts,
				lastAttemptAt: Date.now(),
				updatedAt: Date.now()
			});
		} else {
			// Create new record
			return await ctx.db.insert('userProgress', {
				userId: args.userId,
				classId: args.classId,
				questionId: args.questionId,
				selectedOptions: args.selectedOptions ?? [],
				eliminatedOptions: args.eliminatedOptions ?? [],
				isFlagged: args.isFlagged ?? false,
				isMastered: args.isMastered ?? false,
				attempts: args.attempts ?? 0,
				lastAttemptAt: Date.now(),
				updatedAt: Date.now(),
				metadata: {}
			});
		}
	}
});

export const deleteUserProgress = mutation({
	args: {
		userId: v.id('users'),
		questionId: v.id('question')
	},
	handler: async (ctx, args) => {
		// Find and delete the record
		const existingRecord = await ctx.db
			.query('userProgress')
			.withIndex('by_user_question', (q) =>
				q.eq('userId', args.userId).eq('questionId', args.questionId)
			)
			.unique();

		if (existingRecord) {
			await ctx.db.delete(existingRecord._id);
			return true;
		}
		return false;
	}
});

export const clearUserProgressForModule = mutation({
	args: {
		userId: v.id('users'),
		moduleId: v.id('module')
	},
	handler: async (ctx, args) => {
		// Get all user progress records for the user
		const progressRecords = await ctx.db
			.query('userProgress')
			.withIndex('by_user_question', (q) => q.eq('userId', args.userId))
			.collect();

		// Filter and delete records where the question belongs to the module
		let deletedCount = 0;
		for (const record of progressRecords) {
			const question = await ctx.db.get(record.questionId);
			if (question && question.moduleId === args.moduleId) {
				await ctx.db.delete(record._id);
				deletedCount++;
			}
		}

		return deletedCount;
	}
});
