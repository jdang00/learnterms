import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { authQuery } from './authQueries';

type StudentLite = {
	_id: Id<'users'>;
	name: string;
	imageUrl?: string;
	email?: string;
};

function hasInteraction(record: Doc<'userProgress'>): boolean {
	return record.selectedOptions.length > 0 || record.eliminatedOptions.length > 0;
}

async function getModuleContext(ctx: { db: any }, cohortId: Id<'cohort'>, moduleId: Id<'module'>) {
	const module = await ctx.db.get(moduleId);
	if (!module || module.deletedAt) {
		throw new Error('Module not found');
	}

	const classItem = await ctx.db.get(module.classId);
	if (!classItem || classItem.cohortId !== cohortId) {
		throw new Error('Module is not part of the selected cohort');
	}

	const semester = await ctx.db.get(classItem.semesterId);

	const cohortStudents = await ctx.db
		.query('users')
		.withIndex('by_cohortId', (q: any) => q.eq('cohortId', cohortId))
		.filter((q: any) => q.eq(q.field('deletedAt'), undefined))
		.collect();

	const studentMap = new Map<Id<'users'>, StudentLite>(
		cohortStudents.map((student: Doc<'users'>) => [
			student._id,
			{
				_id: student._id,
				name: student.name,
				imageUrl: student.imageUrl,
				email: student.email
			}
		])
	);
	const studentIdSet = new Set<Id<'users'>>(
		cohortStudents.map((student: Doc<'users'>) => student._id)
	);

	const questions = await ctx.db
		.query('question')
		.withIndex('by_moduleId', (q: any) => q.eq('moduleId', module._id))
		.collect();

	const moduleQuestions = questions
		.filter((question: Doc<'question'>) => !question.deletedAt)
		.sort((a: Doc<'question'>, b: Doc<'question'>) => a.order - b.order);

	return {
		module,
		classItem,
		semester,
		cohortStudents,
		studentMap,
		studentIdSet,
		moduleQuestions
	};
}

export const getModuleSelectorOptions = authQuery({
	args: {
		cohortId: v.id('cohort'),
		semesterId: v.optional(v.id('semester')),
		classId: v.optional(v.id('class'))
	},
	handler: async (ctx, args) => {
		let classes = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		if (args.semesterId) {
			classes = classes.filter((classItem) => classItem.semesterId === args.semesterId);
		}

		const sortedClasses = [...classes].sort((a, b) => {
			if (a.order !== b.order) return a.order - b.order;
			return a.name.localeCompare(b.name);
		});

		const classOptions = sortedClasses.map((classItem) => ({
			_id: classItem._id,
			name: classItem.name,
			code: classItem.code
		}));

		let moduleOptions: Array<{
			_id: Id<'module'>;
			title: string;
			emoji?: string;
			order: number;
			questionCount: number;
			status: string;
		}> = [];

		if (args.classId && sortedClasses.some((classItem) => classItem._id === args.classId)) {
			const modules = await ctx.db
				.query('module')
				.withIndex('by_classId', (q) => q.eq('classId', args.classId!))
				.filter((q) => q.eq(q.field('deletedAt'), undefined))
				.collect();

			moduleOptions = modules
				.sort((a, b) => {
					if (a.order !== b.order) return a.order - b.order;
					return a.title.localeCompare(b.title);
				})
				.map((module) => ({
					_id: module._id,
					title: module.title,
					emoji: module.emoji,
					order: module.order,
					questionCount: module.questionCount ?? 0,
					status: module.status
				}));
		}

		return {
			classes: classOptions,
			modules: moduleOptions
		};
	}
});

export const getModuleOverviewAnalytics = authQuery({
	args: {
		cohortId: v.id('cohort'),
		moduleId: v.id('module'),
		participantsLimit: v.optional(v.number()),
		recentLimit: v.optional(v.number()),
		flagLimit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const participantsLimit = Math.max(3, Math.min(args.participantsLimit ?? 10, 30));
		const recentLimit = Math.max(5, Math.min(args.recentLimit ?? 10, 50));
		const flagLimit = Math.max(3, Math.min(args.flagLimit ?? 10, 30));

		const context = await getModuleContext(ctx, args.cohortId, args.moduleId);
		const {
			module,
			classItem,
			semester,
			cohortStudents,
			studentMap,
			studentIdSet,
			moduleQuestions
		} = context;

		type ParticipantAccumulator = {
			_id: Id<'users'>;
			name: string;
			imageUrl?: string;
			email?: string;
			interactionCount: number;
			flaggedCount: number;
			masteredCount: number;
			lastAttemptAt: number | null;
			questionIds: Set<Id<'question'>>;
		};

		type RecentActivityItem = {
			userId: Id<'users'>;
			userName: string;
			userImageUrl?: string;
			questionId: Id<'question'>;
			questionOrder: number;
			questionStem: string;
			timestamp: number;
			isFlagged: boolean;
			isMastered: boolean;
		};

		const participantsMap = new Map<Id<'users'>, ParticipantAccumulator>();
		const activeStudentIds = new Set<Id<'users'>>();
		const recentActivity: RecentActivityItem[] = [];
		const questionOverview: Array<{
			questionId: Id<'question'>;
			order: number;
			stem: string;
			type: string;
			interactionCount: number;
			interactionRate: number;
			flaggedCount: number;
			flagRate: number;
			masteredCount: number;
			masteryRate: number;
		}> = [];

		let totalInteractions = 0;
		let totalFlags = 0;
		let totalMastered = 0;

		for (const question of moduleQuestions) {
			const progressRecords = await ctx.db
				.query('userProgress')
				.withIndex('by_question_user', (q: any) => q.eq('questionId', question._id))
				.collect();

			let questionInteractions = 0;
			let questionFlags = 0;
			let questionMastered = 0;

			for (const record of progressRecords) {
				if (record.deletedAt || !studentIdSet.has(record.userId)) continue;

				const interacted = hasInteraction(record);
				const isFlagged = record.isFlagged;
				const isMastered = record.isMastered;

				if (interacted) {
					questionInteractions++;
					totalInteractions++;
					activeStudentIds.add(record.userId);
				}
				if (isFlagged) {
					questionFlags++;
					totalFlags++;
				}
				if (isMastered) {
					questionMastered++;
					totalMastered++;
				}

				if (record.lastAttemptAt) {
					const student = studentMap.get(record.userId);
					recentActivity.push({
						userId: record.userId,
						userName: student?.name ?? 'Unknown student',
						userImageUrl: student?.imageUrl,
						questionId: question._id,
						questionOrder: question.order,
						questionStem: question.stem,
						timestamp: record.lastAttemptAt,
						isFlagged,
						isMastered
					});
				}

				const existing = participantsMap.get(record.userId);
				if (existing) {
					if (interacted) {
						existing.interactionCount++;
						existing.questionIds.add(question._id);
					}
					if (isFlagged) existing.flaggedCount++;
					if (isMastered) existing.masteredCount++;
					if (
						record.lastAttemptAt &&
						(!existing.lastAttemptAt || record.lastAttemptAt > existing.lastAttemptAt)
					) {
						existing.lastAttemptAt = record.lastAttemptAt;
					}
				} else {
					const student = studentMap.get(record.userId);
					participantsMap.set(record.userId, {
						_id: record.userId,
						name: student?.name ?? 'Unknown student',
						imageUrl: student?.imageUrl,
						email: student?.email,
						interactionCount: interacted ? 1 : 0,
						flaggedCount: isFlagged ? 1 : 0,
						masteredCount: isMastered ? 1 : 0,
						lastAttemptAt: record.lastAttemptAt ?? null,
						questionIds: interacted ? new Set([question._id]) : new Set()
					});
				}
			}

			const totalStudents = cohortStudents.length;
			questionOverview.push({
				questionId: question._id,
				order: question.order,
				stem: question.stem,
				type: question.type,
				interactionCount: questionInteractions,
				interactionRate:
					totalStudents > 0 ? Math.round((questionInteractions / totalStudents) * 100) : 0,
				flaggedCount: questionFlags,
				flagRate: totalStudents > 0 ? Math.round((questionFlags / totalStudents) * 100) : 0,
				masteredCount: questionMastered,
				masteryRate: totalStudents > 0 ? Math.round((questionMastered / totalStudents) * 100) : 0
			});
		}

		const participants = Array.from(participantsMap.values())
			.filter((participant) => participant.interactionCount > 0)
			.sort((a, b) => {
				const aLast = a.lastAttemptAt ?? 0;
				const bLast = b.lastAttemptAt ?? 0;
				if (aLast !== bLast) return bLast - aLast;
				return b.interactionCount - a.interactionCount;
			})
			.slice(0, participantsLimit)
			.map((participant) => ({
				_id: participant._id,
				name: participant.name,
				imageUrl: participant.imageUrl,
				email: participant.email,
				interactions: participant.interactionCount,
				questionsAttempted: participant.questionIds.size,
				flagged: participant.flaggedCount,
				mastered: participant.masteredCount,
				lastAttemptAt: participant.lastAttemptAt
			}));

		const mostFlaggedQuestions = questionOverview
			.filter((question) => question.flaggedCount > 0)
			.sort((a, b) => {
				if (a.flaggedCount !== b.flaggedCount) return b.flaggedCount - a.flaggedCount;
				return b.interactionCount - a.interactionCount;
			})
			.slice(0, flagLimit);

		const recent = recentActivity.sort((a, b) => b.timestamp - a.timestamp).slice(0, recentLimit);

		const studentsInCohort = cohortStudents.length;
		const possibleInteractions = studentsInCohort * moduleQuestions.length;
		const questionsWithFlags = questionOverview.filter(
			(question) => question.flaggedCount > 0
		).length;
		const questionsWithNoInteractions = questionOverview.filter(
			(question) => question.interactionCount === 0
		).length;
		const participationRate =
			studentsInCohort > 0 ? Math.round((activeStudentIds.size / studentsInCohort) * 100) : 0;

		return {
			module: {
				_id: module._id,
				title: module.title,
				emoji: module.emoji,
				status: module.status,
				questionCount: module.questionCount ?? moduleQuestions.length,
				classId: classItem._id,
				className: classItem.name,
				semesterId: classItem.semesterId,
				semesterName: semester?.name ?? 'Unknown'
			},
			totals: {
				studentsInCohort,
				participants: activeStudentIds.size,
				participationRate,
				totalQuestions: moduleQuestions.length,
				totalInteractions,
				totalFlags,
				totalMastered,
				possibleInteractions,
				questionsWithFlags,
				questionsWithNoInteractions
			},
			participants,
			mostFlaggedQuestions,
			recentActivity: recent
		};
	}
});

export const getModuleQuestionAnalyticsPage = authQuery({
	args: {
		cohortId: v.id('cohort'),
		moduleId: v.id('module'),
		pageSize: v.optional(v.number()),
		pageOffset: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const pageSize = Math.max(5, Math.min(args.pageSize ?? 8, 50));
		const pageOffset = Math.max(0, args.pageOffset ?? 0);

		const context = await getModuleContext(ctx, args.cohortId, args.moduleId);
		const { cohortStudents, studentIdSet, moduleQuestions } = context;

		const total = moduleQuestions.length;
		const pageQuestions = moduleQuestions.slice(pageOffset, pageOffset + pageSize);

		const items: Array<{
			questionId: Id<'question'>;
			order: number;
			stem: string;
			type: string;
			interactionCount: number;
			interactionRate: number;
			flaggedCount: number;
			flagRate: number;
			masteredCount: number;
			masteryRate: number;
			lastInteractionAt: number | null;
		}> = [];

		for (const question of pageQuestions) {
			const progressRecords = await ctx.db
				.query('userProgress')
				.withIndex('by_question_user', (q: any) => q.eq('questionId', question._id))
				.collect();

			let interactionCount = 0;
			let flaggedCount = 0;
			let masteredCount = 0;
			let lastInteractionAt: number | null = null;

			for (const record of progressRecords) {
				if (record.deletedAt || !studentIdSet.has(record.userId)) continue;

				if (hasInteraction(record)) interactionCount++;
				if (record.isFlagged) flaggedCount++;
				if (record.isMastered) masteredCount++;

				if (
					record.lastAttemptAt &&
					(!lastInteractionAt || record.lastAttemptAt > lastInteractionAt)
				) {
					lastInteractionAt = record.lastAttemptAt;
				}
			}

			const studentCount = cohortStudents.length;
			items.push({
				questionId: question._id,
				order: question.order,
				stem: question.stem,
				type: question.type,
				interactionCount,
				interactionRate: studentCount > 0 ? Math.round((interactionCount / studentCount) * 100) : 0,
				flaggedCount,
				flagRate: studentCount > 0 ? Math.round((flaggedCount / studentCount) * 100) : 0,
				masteredCount,
				masteryRate: studentCount > 0 ? Math.round((masteredCount / studentCount) * 100) : 0,
				lastInteractionAt
			});
		}

		const hasMore = pageOffset + pageSize < total;
		const nextOffset = hasMore ? pageOffset + pageSize : null;

		return {
			total,
			pageSize,
			pageOffset,
			hasMore,
			nextOffset,
			items
		};
	}
});
