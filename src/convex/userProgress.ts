import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';

const getUserProgressRecords = async (
	ctx: any,
	userId: string,
	questionIds: string[]
): Promise<Doc<'userProgress'>[]> => {
	return await ctx.db
		.query('userProgress')
		.filter((q: any) =>
			q.and(
				q.eq(q.field('userId'), userId),
				q.or(...questionIds.map((id) => q.eq(q.field('questionId'), id)))
			)
		)
		.collect();
};

export const checkExistingRecord = query({
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

export const getProgressForClass = query({
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
				interactedQuestionIds: string[];
				flaggedQuestionIds: string[];
				masteredQuestionIds: string[];
			}
		> = {};

		for (const module of modules) {
			const moduleQuestions = questionsByModule.get(module._id) || [];
			const totalQuestions = moduleQuestions.length;

			let interactedQuestions = 0;
			let flaggedQuestions = 0;
			let masteredQuestions = 0;
			const interactedQuestionIds = [];
			const flaggedQuestionIds = [];
			const masteredQuestionIds = [];

			for (const question of moduleQuestions) {
				const progress = progressMap.get(question._id);
				if (progress) {
					if (progress.selectedOptions.length > 0 || progress.eliminatedOptions.length > 0) {
						interactedQuestions++;
						interactedQuestionIds.push(question._id);
					}
					if (progress.isFlagged) {
						flaggedQuestions++;
						flaggedQuestionIds.push(question._id);
					}
					if (progress.isMastered) {
						masteredQuestions++;
						masteredQuestionIds.push(question._id);
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
					totalQuestions > 0 ? Math.round((masteredQuestions / totalQuestions) * 100) : 0,
				interactedQuestionIds,
				flaggedQuestionIds,
				masteredQuestionIds
			};
		}

		return moduleProgress;
	}
});

export const getUserProgressForModule = query({
	args: {
		userId: v.id('users'),
		questionIds: v.array(v.id('question'))
	},
	handler: async (ctx, args) => {
		const records = await getUserProgressRecords(ctx, args.userId, args.questionIds);

		const interactedQuestions = records
			.filter((record) => record.selectedOptions.length > 0 || record.eliminatedOptions.length > 0)
			.map((record) => record.questionId);

		return interactedQuestions;
	}
});

export const getFlaggedQuestionsForModule = query({
	args: {
		userId: v.id('users'),
		questionIds: v.array(v.id('question'))
	},
	handler: async (ctx, args) => {
		const records = await getUserProgressRecords(ctx, args.userId, args.questionIds);

		const flaggedQuestions = records
			.filter((record) => record.isFlagged === true)
			.map((record) => record.questionId);

		return flaggedQuestions;
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
