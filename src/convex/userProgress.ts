import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { authQuery } from './authQueries';
import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { applyProgressDeltaAndEvaluateBadges } from './badgeEngine';

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
		const now = Date.now();
		const currentHourUtc = new Date(now).getUTCHours();

		// Check if record exists
		const existingRecord = await ctx.db
			.query('userProgress')
			.withIndex('by_user_question', (q) =>
				q.eq('userId', args.userId).eq('questionId', args.questionId)
			)
			.unique();

		if (existingRecord) {
			const nextSelectedOptions = args.selectedOptions ?? existingRecord.selectedOptions;
			const nextEliminatedOptions = args.eliminatedOptions ?? existingRecord.eliminatedOptions;
			const nextMastered = args.isMastered ?? existingRecord.isMastered;

			const wasInteracted =
				existingRecord.selectedOptions.length > 0 || existingRecord.eliminatedOptions.length > 0;
			const isInteracted = nextSelectedOptions.length > 0 || nextEliminatedOptions.length > 0;
			const interactedDelta = Number(isInteracted) - Number(wasInteracted);
			const masteredDelta = Number(nextMastered) - Number(existingRecord.isMastered);

			const oldFlagged = existingRecord.isFlagged;
			const newFlagged = args.isFlagged ?? existingRecord.isFlagged;
			const flaggedDelta = Number(newFlagged) - Number(oldFlagged);

			const nextMetadata = {
				...(existingRecord.metadata ?? {})
			};

			let earlyInteractionsDelta = 0;
			let lateInteractionsDelta = 0;
			const previousHour = existingRecord.metadata?.firstInteractedHourUtc;

			if (!wasInteracted && isInteracted) {
				nextMetadata.firstInteractedAt = now;
				nextMetadata.firstInteractedHourUtc = currentHourUtc;
				if (currentHourUtc < 8) earlyInteractionsDelta += 1;
				if (currentHourUtc >= 22) lateInteractionsDelta += 1;
			}

			if (wasInteracted && !isInteracted) {
				if (previousHour !== undefined) {
					if (previousHour < 8) earlyInteractionsDelta -= 1;
					if (previousHour >= 22) lateInteractionsDelta -= 1;
				}
				nextMetadata.firstInteractedAt = undefined;
				nextMetadata.firstInteractedHourUtc = undefined;
			}

			// Update flagCount on question if flag status changed
			if (oldFlagged !== newFlagged) {
				const question = await ctx.db.get(args.questionId);
				if (question) {
					const currentFlagCount = question.flagCount ?? 0;
					const delta = newFlagged ? 1 : -1;
					await ctx.db.patch(args.questionId, {
						flagCount: Math.max(0, currentFlagCount + delta)
					});
				}
			}

			// Update existing record
			await ctx.db.patch(existingRecord._id, {
				selectedOptions: nextSelectedOptions,
				eliminatedOptions: nextEliminatedOptions,
				isFlagged: newFlagged,
				isMastered: nextMastered,
				attempts: args.attempts ?? existingRecord.attempts,
				lastAttemptAt: now,
				updatedAt: now,
				metadata: nextMetadata
			});

			await applyProgressDeltaAndEvaluateBadges(ctx, {
				userId: args.userId,
				classId: args.classId,
				occurredAt: now,
				interactedDelta,
				masteredDelta,
				flaggedDelta,
				earlyInteractionsDelta,
				lateInteractionsDelta,
				touchStreak: true
			});

			return existingRecord._id;
		} else {
			const newFlagged = args.isFlagged ?? false;
			const selectedOptions = args.selectedOptions ?? [];
			const eliminatedOptions = args.eliminatedOptions ?? [];
			const isInteracted = selectedOptions.length > 0 || eliminatedOptions.length > 0;
			const isMastered = args.isMastered ?? false;
			const earlyInteractionsDelta = isInteracted && currentHourUtc < 8 ? 1 : 0;
			const lateInteractionsDelta = isInteracted && currentHourUtc >= 22 ? 1 : 0;
			const metadata = isInteracted
				? {
						firstInteractedAt: now,
						firstInteractedHourUtc: currentHourUtc
					}
				: {};

			// If creating with flag set, increment flagCount
			if (newFlagged) {
				const question = await ctx.db.get(args.questionId);
				if (question) {
					const currentFlagCount = question.flagCount ?? 0;
					await ctx.db.patch(args.questionId, {
						flagCount: currentFlagCount + 1
					});
				}
			}

			// Create new record
			const recordId = await ctx.db.insert('userProgress', {
				userId: args.userId,
				classId: args.classId,
				questionId: args.questionId,
				selectedOptions,
				eliminatedOptions,
				isFlagged: newFlagged,
				isMastered,
				attempts: args.attempts ?? 0,
				lastAttemptAt: now,
				updatedAt: now,
				metadata
			});

			await applyProgressDeltaAndEvaluateBadges(ctx, {
				userId: args.userId,
				classId: args.classId,
				occurredAt: now,
				interactedDelta: Number(isInteracted),
				masteredDelta: Number(isMastered),
				flaggedDelta: Number(newFlagged),
				earlyInteractionsDelta,
				lateInteractionsDelta,
				touchStreak: true
			});

			return recordId;
		}
	}
});

export const deleteUserProgress = mutation({
	args: {
		userId: v.id('users'),
		questionId: v.id('question')
	},
	handler: async (ctx, args) => {
		const now = Date.now();

		// Find and delete the record
		const existingRecord = await ctx.db
			.query('userProgress')
			.withIndex('by_user_question', (q) =>
				q.eq('userId', args.userId).eq('questionId', args.questionId)
			)
			.unique();

		if (existingRecord) {
			const wasInteracted =
				existingRecord.selectedOptions.length > 0 || existingRecord.eliminatedOptions.length > 0;
			const earlyInteractionsDelta =
				wasInteracted && existingRecord.metadata?.firstInteractedHourUtc !== undefined
					? existingRecord.metadata.firstInteractedHourUtc < 8
						? -1
						: 0
					: 0;
			const lateInteractionsDelta =
				wasInteracted && existingRecord.metadata?.firstInteractedHourUtc !== undefined
					? existingRecord.metadata.firstInteractedHourUtc >= 22
						? -1
						: 0
					: 0;

			// If the record was flagged, decrement the question's flagCount
			if (existingRecord.isFlagged) {
				const question = await ctx.db.get(args.questionId);
				if (question) {
					const currentFlagCount = question.flagCount ?? 0;
					await ctx.db.patch(args.questionId, {
						flagCount: Math.max(0, currentFlagCount - 1)
					});
				}
			}

			await ctx.db.delete(existingRecord._id);

			await applyProgressDeltaAndEvaluateBadges(ctx, {
				userId: args.userId,
				classId: existingRecord.classId,
				occurredAt: now,
				interactedDelta: wasInteracted ? -1 : 0,
				masteredDelta: existingRecord.isMastered ? -1 : 0,
				flaggedDelta: existingRecord.isFlagged ? -1 : 0,
				earlyInteractionsDelta,
				lateInteractionsDelta,
				touchStreak: false
			});

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
		const now = Date.now();
		// Get all questions for this module (efficient, bounded by module size)
		const questions = await ctx.db
			.query('question')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', args.moduleId))
			.collect();

		const module = await ctx.db.get(args.moduleId);

		// For each question, find and delete the user's progress record
		let deletedCount = 0;
		let interactedDelta = 0;
		let masteredDelta = 0;
		let flaggedDelta = 0;
		let earlyInteractionsDelta = 0;
		let lateInteractionsDelta = 0;
		for (const question of questions) {
			// Use by_question_user index to efficiently find the specific progress record
			const progressRecord = await ctx.db
				.query('userProgress')
				.withIndex('by_question_user', (q) =>
					q.eq('questionId', question._id).eq('userId', args.userId)
				)
				.unique();

			if (progressRecord) {
				const wasInteracted =
					progressRecord.selectedOptions.length > 0 || progressRecord.eliminatedOptions.length > 0;
				if (wasInteracted) {
					interactedDelta -= 1;
					const hour = progressRecord.metadata?.firstInteractedHourUtc;
					if (hour !== undefined) {
						if (hour < 8) earlyInteractionsDelta -= 1;
						if (hour >= 22) lateInteractionsDelta -= 1;
					}
				}
				if (progressRecord.isMastered) masteredDelta -= 1;
				if (progressRecord.isFlagged) flaggedDelta -= 1;

				// If the record was flagged, decrement the question's flagCount
				if (progressRecord.isFlagged) {
					const currentFlagCount = question.flagCount ?? 0;
					await ctx.db.patch(question._id, {
						flagCount: Math.max(0, currentFlagCount - 1)
					});
				}

				await ctx.db.delete(progressRecord._id);
				deletedCount++;
			}
		}

		if (deletedCount > 0 && module) {
			await applyProgressDeltaAndEvaluateBadges(ctx, {
				userId: args.userId,
				classId: module.classId,
				occurredAt: now,
				interactedDelta,
				masteredDelta,
				flaggedDelta,
				earlyInteractionsDelta,
				lateInteractionsDelta,
				touchStreak: false
			});
		}

		return deletedCount;
	}
});
