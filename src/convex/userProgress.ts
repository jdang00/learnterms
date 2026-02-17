import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { authQuery } from './authQueries';
import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { applyProgressDeltaAndEvaluateBadges } from './badgeEngine';

const EARLY_HOUR_CUTOFF = 8;
const LATE_HOUR_CUTOFF = 22;
const MIN_UTC_OFFSET_MINUTES = -14 * 60;
const MAX_UTC_OFFSET_MINUTES = 14 * 60;

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

function normalizeUtcOffsetMinutes(offset: number | undefined) {
	if (offset === undefined || !Number.isFinite(offset)) return undefined;
	const rounded = Math.trunc(offset);
	if (rounded < MIN_UTC_OFFSET_MINUTES || rounded > MAX_UTC_OFFSET_MINUTES) return undefined;
	return rounded;
}

function getHourForOffset(ts: number, utcOffsetMinutes: number | undefined) {
	if (utcOffsetMinutes === undefined) return new Date(ts).getUTCHours();
	return new Date(ts - utcOffsetMinutes * 60_000).getUTCHours();
}

function getRecordedInteractionHour(record: Doc<'userProgress'>) {
	const metadata = record.metadata;
	if (!metadata) return undefined;
	if (metadata.firstInteractedHourLocal !== undefined) return metadata.firstInteractedHourLocal;
	if (
		metadata.firstInteractedAt !== undefined &&
		metadata.firstInteractedUtcOffsetMinutes !== undefined
	) {
		return getHourForOffset(metadata.firstInteractedAt, metadata.firstInteractedUtcOffsetMinutes);
	}
	return metadata.firstInteractedHourUtc;
}

function earlyLateDeltaFromHour(hour: number | undefined, direction: 1 | -1) {
	return {
		early: hour !== undefined && hour < EARLY_HOUR_CUTOFF ? direction : 0,
		late: hour !== undefined && hour >= LATE_HOUR_CUTOFF ? direction : 0
	};
}

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
		attempts: v.optional(v.number()),
		clientUtcOffsetMinutes: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const currentHourUtc = new Date(now).getUTCHours();
		const utcOffsetMinutes = normalizeUtcOffsetMinutes(args.clientUtcOffsetMinutes);
		const currentHourLocal = getHourForOffset(now, utcOffsetMinutes);

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
			const previousHour = getRecordedInteractionHour(existingRecord);

			if (!wasInteracted && isInteracted) {
				nextMetadata.firstInteractedAt = now;
				nextMetadata.firstInteractedHourUtc = currentHourUtc;
				nextMetadata.firstInteractedHourLocal = currentHourLocal;
				nextMetadata.firstInteractedUtcOffsetMinutes = utcOffsetMinutes;
				const delta = earlyLateDeltaFromHour(currentHourLocal, 1);
				earlyInteractionsDelta += delta.early;
				lateInteractionsDelta += delta.late;
			}

			if (wasInteracted && !isInteracted) {
				const delta = earlyLateDeltaFromHour(previousHour, -1);
				earlyInteractionsDelta += delta.early;
				lateInteractionsDelta += delta.late;
				nextMetadata.firstInteractedAt = undefined;
				nextMetadata.firstInteractedHourUtc = undefined;
				nextMetadata.firstInteractedHourLocal = undefined;
				nextMetadata.firstInteractedUtcOffsetMinutes = undefined;
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
				utcOffsetMinutes,
				touchStreak: true
			});

			return existingRecord._id;
		} else {
			const newFlagged = args.isFlagged ?? false;
			const selectedOptions = args.selectedOptions ?? [];
			const eliminatedOptions = args.eliminatedOptions ?? [];
			const isInteracted = selectedOptions.length > 0 || eliminatedOptions.length > 0;
			const isMastered = args.isMastered ?? false;
			const earlyInteractionsDelta = isInteracted && currentHourLocal < EARLY_HOUR_CUTOFF ? 1 : 0;
			const lateInteractionsDelta = isInteracted && currentHourLocal >= LATE_HOUR_CUTOFF ? 1 : 0;
			const metadata = isInteracted
				? {
						firstInteractedAt: now,
						firstInteractedHourUtc: currentHourUtc,
						firstInteractedHourLocal: currentHourLocal,
						firstInteractedUtcOffsetMinutes: utcOffsetMinutes
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
				utcOffsetMinutes,
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
			const interactionHour = getRecordedInteractionHour(existingRecord);
			const earlyInteractionsDelta = wasInteracted
				? earlyLateDeltaFromHour(interactionHour, -1).early
				: 0;
			const lateInteractionsDelta = wasInteracted
				? earlyLateDeltaFromHour(interactionHour, -1).late
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
					const hour = getRecordedInteractionHour(progressRecord);
					const delta = earlyLateDeltaFromHour(hour, -1);
					earlyInteractionsDelta += delta.early;
					lateInteractionsDelta += delta.late;
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
