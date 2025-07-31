import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

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

export const getUserProgressForModule = query({
	args: { 
		userId: v.id('users'), 
		questionIds: v.array(v.id('question'))
	},
	handler: async (ctx, args) => {
		// Use a more efficient query that directly filters for the specific questions
		const records = await ctx.db
			.query('userProgress')
			.withIndex('by_user_question', (q) =>
				q.eq('userId', args.userId)
			)
			.collect();

		// Create a Set for O(1) lookup performance
		const questionIdSet = new Set(args.questionIds);
		
		// Filter records that match the question IDs in this module
		// and have actual interactions (selected or eliminated options)
		const interactedQuestions = records
			.filter(record => 
				questionIdSet.has(record.questionId) &&
				(record.selectedOptions.length > 0 || record.eliminatedOptions.length > 0)
			)
			.map(record => record.questionId);

		return interactedQuestions;
	}
});

export const getFlaggedQuestionsForModule = query({
	args: { 
		userId: v.id('users'), 
		questionIds: v.array(v.id('question'))
	},
	handler: async (ctx, args) => {
		const records = await ctx.db
			.query('userProgress')
			.withIndex('by_user_question', (q) =>
				q.eq('userId', args.userId)
			)
			.collect();

		// Create a Set for O(1) lookup performance
		const questionIdSet = new Set(args.questionIds);
		
		// Filter records that match the question IDs in this module and are flagged
		const flaggedQuestions = records
			.filter(record => 
				questionIdSet.has(record.questionId) &&
				record.isFlagged === true
			)
			.map(record => record.questionId);

		return flaggedQuestions;
	}
});

export const saveUserProgress = mutation({
	args: {
		userId: v.id('users'),
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
			.withIndex('by_user_question', (q) =>
				q.eq('userId', args.userId)
			)
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
