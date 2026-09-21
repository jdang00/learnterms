import { v } from 'convex/values';
import { authQuery } from './authQueries';
import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { polar } from './polar';
import { requireCohortStaff, requireUserReadById } from './access';

function hasInteraction(
	record: Pick<Doc<'userProgress'>, 'selectedOptions' | 'eliminatedOptions'>
) {
	return record.selectedOptions.length > 0 || record.eliminatedOptions.length > 0;
}

/**
 * Get all students in a cohort with their basic info
 * Uses the by_cohortId index for efficient querying
 */
export const getStudentsByCohort = authQuery({
	args: { cohortId: v.id('cohort') },
	handler: async (ctx, args) => {
		await requireCohortStaff(ctx, args.cohortId);
		const students = await ctx.db
			.query('users')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		// Filter out deleted users and return essential fields
		return students
			.filter((student) => !student.deletedAt)
			.map((student) => ({
				_id: student._id,
				name: student.name,
				clerkUserId: student.clerkUserId,
				updatedAt: student.updatedAt
			}));
	}
});

/**
 * Get total count of students in a cohort
 * Optimized to only count, not fetch full documents
 */
export const getStudentCountByCohort = authQuery({
	args: { cohortId: v.id('cohort') },
	handler: async (ctx, args) => {
		await requireCohortStaff(ctx, args.cohortId);
		const students = await ctx.db
			.query('users')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		// Count only non-deleted users
		return students.filter((student) => !student.deletedAt).length;
	}
});

/**
 * Get students with their progress stats for a specific cohort.
 * Uses precomputed progressStats from user records for fast reads.
 * Missing cached statistics are explicitly marked unavailable, never treated as evidence of no activity.
 */
export const getStudentsWithProgress = authQuery({
	args: {
		cohortId: v.id('cohort'),
		includeSubscription: v.optional(v.boolean())
	},
	returns: v.array(
		v.object({
			_id: v.id('users'),
			name: v.string(),
			clerkUserId: v.string(),
			firstName: v.optional(v.string()),
			lastName: v.optional(v.string()),
			email: v.optional(v.string()),
			username: v.optional(v.string()),
			imageUrl: v.optional(v.string()),
			lastSignInAt: v.optional(v.number()),
			createdAt: v.optional(v.number()),
			role: v.optional(v.union(v.literal('dev'), v.literal('admin'), v.literal('curator'))),
			isPro: v.boolean(),
			progress: v.number(),
			questionsInteracted: v.number(),
			questionsMastered: v.number(),
			totalQuestions: v.number(),
			lastActivityAt: v.union(v.number(), v.null()),
			statsAvailable: v.boolean()
		})
	),
	handler: async (ctx, args) => {
		await requireCohortStaff(ctx, args.cohortId);
		const includeSubscription = args.includeSubscription ?? false;
		// Get all students in the cohort using index
		const students = await ctx.db
			.query('users')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.filter((q) => q.eq(q.field('deletedAt'), undefined))
			.collect();

		// Get cohort stats for totalQuestions (used if user stats missing)
		const cohort = await ctx.db.get(args.cohortId);
		const totalQuestionsInCohort = cohort?.stats?.totalQuestions ?? 0;

		// Map students to progress data using precomputed stats
		const studentsWithProgress = await Promise.all(
			students.map(async (student) => {
				let isPro = false;
				if (includeSubscription) {
					try {
						const subscription = await polar.getCurrentSubscription(ctx, {
							userId: student._id
						});
						isPro = subscription?.status === 'active' || subscription?.status === 'trialing';
					} catch {
						isPro = false;
					}
				}

				// Use precomputed progressStats if available
				if (student.progressStats) {
					const totalQuestions = student.progressStats.totalQuestions || totalQuestionsInCohort;
					const progressPercentage =
						totalQuestions > 0
							? Math.round((student.progressStats.questionsInteracted / totalQuestions) * 100)
							: 0;

					return {
						_id: student._id,
						name: student.name,
						clerkUserId: student.clerkUserId,
						firstName: student.firstName,
						lastName: student.lastName,
						email: student.email,
						username: student.username,
						imageUrl: student.imageUrl,
						lastSignInAt: student.lastSignInAt,
						createdAt: student.createdAt,
						role: student.role,
						isPro,
						progress: progressPercentage,
						statsAvailable: true,
						questionsInteracted: student.progressStats.questionsInteracted,
						questionsMastered: student.progressStats.questionsMastered,
						totalQuestions,
						lastActivityAt: student.progressStats.lastActivityAt ?? null
					};
				}

				// Keep legacy numeric fields compatible, while allowing analytics to exclude unknowns.
				return {
					_id: student._id,
					name: student.name,
					clerkUserId: student.clerkUserId,
					firstName: student.firstName,
					lastName: student.lastName,
					email: student.email,
					username: student.username,
					imageUrl: student.imageUrl,
					lastSignInAt: student.lastSignInAt,
					createdAt: student.createdAt,
					role: student.role,
					isPro,
					progress: 0,
					statsAvailable: false,
					questionsInteracted: 0,
					questionsMastered: 0,
					totalQuestions: totalQuestionsInCohort,
					lastActivityAt: null
				};
			})
		);

		// Sort by progress descending
		return studentsWithProgress.sort((a, b) => b.progress - a.progress);
	}
});

/**
 * Get cohort overview stats (students, questions, modules, avg completion)
 * Uses precomputed stats from cohort.stats field for fast reads.
 * Falls back to computing if stats haven't been backfilled yet.
 */
export const getCohortProgressStats = authQuery({
	args: { cohortId: v.id('cohort') },
	handler: async (ctx, args) => {
		await requireCohortStaff(ctx, args.cohortId);
		const cohort = await ctx.db.get(args.cohortId);
		if (!cohort) {
			return {
				totalStudents: 0,
				totalQuestions: 0,
				totalModules: 0,
				averageCompletion: 0
			};
		}

		// Use precomputed stats if available
		if (cohort.stats) {
			return {
				totalStudents: cohort.stats.totalStudents,
				totalQuestions: cohort.stats.totalQuestions,
				totalModules: cohort.stats.totalModules,
				averageCompletion: cohort.stats.averageCompletion
			};
		}

		// Fallback: compute stats (for cohorts not yet backfilled)
		const students = await ctx.db
			.query('users')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.filter((q) => q.eq(q.field('deletedAt'), undefined))
			.collect();

		const totalStudents = students.length;

		const classes = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		let totalModules = 0;
		let totalQuestions = 0;

		for (const classItem of classes) {
			const modules = await ctx.db
				.query('module')
				.withIndex('by_classId', (q) => q.eq('classId', classItem._id))
				.collect();

			totalModules += modules.length;
			for (const module of modules) {
				totalQuestions += module.questionCount ?? 0;
			}
		}

		// For fallback, use precomputed user stats if available, otherwise estimate
		let totalProgressSum = 0;
		if (totalQuestions > 0 && totalStudents > 0) {
			for (const student of students) {
				if (student.progressStats) {
					const pct =
						student.progressStats.totalQuestions > 0
							? (student.progressStats.questionsInteracted / student.progressStats.totalQuestions) *
								100
							: 0;
					totalProgressSum += pct;
				}
			}
		}

		const averageCompletion = totalStudents > 0 ? Math.round(totalProgressSum / totalStudents) : 0;

		return {
			totalStudents,
			totalQuestions,
			totalModules,
			averageCompletion
		};
	}
});

type ModuleActivity = {
	moduleId: Id<'module'>;
	moduleTitle: string;
	moduleEmoji: string | undefined;
	moduleOrder: number;
	moduleStatus: string;
	classId: Id<'class'>;
	className: string;
	totalQuestions: number;
	totalStudents: number;
	possibleInteractions: number;
	questionsInteracted: number;
	questionsMastered: number;
	questionsFlagged: number;
	activeStudents: number;
	lastActivityAt: number | null;
	completion: number;
	mastery: number;
};

/**
 * Module rollups read from userModuleStats (one small row per student per module),
 * so cost scales with students x modules rather than with raw progress history.
 */
async function loadModuleActivity(
	ctx: QueryCtx,
	cohortId: Id<'cohort'>,
	semesterId: Id<'semester'> | undefined
) {
	const students = await ctx.db
		.query('users')
		.withIndex('by_cohortId', (q) => q.eq('cohortId', cohortId))
		.filter((q) => q.eq(q.field('deletedAt'), undefined))
		.collect();
	const totalStudents = students.length;
	const studentIds = new Set(students.map((student) => student._id));

	const classes = (
		await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', cohortId))
			.collect()
	)
		.filter((classItem) => !classItem.deletedAt)
		.filter((classItem) => !semesterId || classItem.semesterId === semesterId)
		.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

	const modules: ModuleActivity[] = [];
	const activeStudentsByModule = new Map<Id<'module'>, Set<Id<'users'>>>();
	for (const classItem of classes) {
		const [classModules, statRows] = await Promise.all([
			ctx.db
				.query('module')
				.withIndex('by_classId', (q) => q.eq('classId', classItem._id))
				.filter((q) => q.eq(q.field('deletedAt'), undefined))
				.collect(),
			ctx.db
				.query('userModuleStats')
				.withIndex('by_classId', (q) => q.eq('classId', classItem._id))
				.collect()
		]);

		type Totals = {
			interacted: number;
			mastered: number;
			flagged: number;
			lastActivityAt: number | null;
			students: Set<Id<'users'>>;
		};
		const totals = new Map<Id<'module'>, Totals>();
		for (const row of statRows) {
			if (!studentIds.has(row.userId)) continue;
			const entry = totals.get(row.moduleId) ?? {
				interacted: 0,
				mastered: 0,
				flagged: 0,
				lastActivityAt: null,
				students: new Set<Id<'users'>>()
			};
			entry.interacted += row.questionsInteracted;
			entry.mastered += row.questionsMastered;
			entry.flagged += row.questionsFlagged;
			if (row.questionsInteracted > 0) entry.students.add(row.userId);
			if (row.lastActivityAt && row.lastActivityAt > (entry.lastActivityAt ?? 0))
				entry.lastActivityAt = row.lastActivityAt;
			totals.set(row.moduleId, entry);
		}

		for (const module of classModules) {
			const entry = totals.get(module._id);
			const totalQuestions = module.questionCount ?? 0;
			const possibleInteractions = totalQuestions * totalStudents;
			const questionsInteracted = entry?.interacted ?? 0;
			const questionsMastered = entry?.mastered ?? 0;
			activeStudentsByModule.set(module._id, entry?.students ?? new Set());
			modules.push({
				moduleId: module._id,
				moduleTitle: module.title,
				moduleEmoji: module.emoji,
				moduleOrder: module.order,
				moduleStatus: module.status,
				classId: classItem._id,
				className: classItem.name,
				totalQuestions,
				totalStudents,
				possibleInteractions,
				questionsInteracted,
				questionsMastered,
				questionsFlagged: entry?.flagged ?? 0,
				activeStudents: entry?.students.size ?? 0,
				lastActivityAt: entry?.lastActivityAt ?? null,
				completion:
					possibleInteractions > 0
						? Math.min(100, Math.round((questionsInteracted / possibleInteractions) * 100))
						: 0,
				mastery:
					possibleInteractions > 0
						? Math.min(100, Math.round((questionsMastered / possibleInteractions) * 100))
						: 0
			});
		}
	}

	return { totalStudents, classes, modules, activeStudentsByModule };
}

export const getModuleCompletionStats = authQuery({
	args: {
		cohortId: v.id('cohort'),
		semesterId: v.optional(v.id('semester')),
		limit: v.optional(v.number()),
		offset: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		await requireCohortStaff(ctx, args.cohortId);
		const limit = Math.max(1, Math.min(args.limit ?? 8, 50));
		const offset = Math.max(0, args.offset ?? 0);
		const { totalStudents, modules } = await loadModuleActivity(
			ctx,
			args.cohortId,
			args.semesterId
		);

		const rankedModules = [...modules].sort((a, b) =>
			totalStudents === 0
				? a.className.localeCompare(b.className) || a.moduleOrder - b.moduleOrder
				: a.completion - b.completion ||
					a.className.localeCompare(b.className) ||
					a.moduleOrder - b.moduleOrder
		);

		const averageCompletion =
			rankedModules.length > 0
				? Math.round(
						rankedModules.reduce((sum, module) => sum + module.completion, 0) / rankedModules.length
					)
				: 0;
		const hasMore = offset + limit < rankedModules.length;

		return {
			totalStudents,
			totalModules: rankedModules.length,
			averageCompletion,
			modules: rankedModules.slice(offset, offset + limit),
			page: { offset, limit, hasMore, nextOffset: hasMore ? offset + limit : null }
		};
	}
});

/**
 * Every class in the cohort with per-module activity, so curators can scan stats without drilling in.
 */
export const getCurriculumActivity = authQuery({
	args: { cohortId: v.id('cohort'), semesterId: v.optional(v.id('semester')) },
	handler: async (ctx, args) => {
		await requireCohortStaff(ctx, args.cohortId);
		const { totalStudents, classes, modules, activeStudentsByModule } = await loadModuleActivity(
			ctx,
			args.cohortId,
			args.semesterId
		);

		return {
			totalStudents,
			classes: classes.map((classItem) => {
				const classModules = modules
					.filter((module) => module.classId === classItem._id)
					.sort(
						(a, b) => a.moduleOrder - b.moduleOrder || a.moduleTitle.localeCompare(b.moduleTitle)
					);
				const lastActivityAt = Math.max(
					0,
					...classModules.map((module) => module.lastActivityAt ?? 0)
				);
				return {
					classId: classItem._id,
					name: classItem.name,
					code: classItem.code,
					semesterId: classItem.semesterId,
					totalQuestions: classModules.reduce((sum, module) => sum + module.totalQuestions, 0),
					questionsInteracted: classModules.reduce(
						(sum, module) => sum + module.questionsInteracted,
						0
					),
					activeStudents: new Set(
						classModules.flatMap((module) => [
							...(activeStudentsByModule.get(module.moduleId) ?? [])
						])
					).size,
					questionsFlagged: classModules.reduce((sum, module) => sum + module.questionsFlagged, 0),
					lastActivityAt: lastActivityAt || null,
					modules: classModules
				};
			})
		};
	}
});

/**
 * Get top flagged questions for a cohort, optionally filtered by semester.
 * Uses denormalized flagCount on questions for efficient querying.
 *
 * The query flow:
 * 1. Get classes in cohort (filtered by semester if provided)
 * 2. Get modules for those classes
 * 3. Get questions with flagCount > 0 from those modules
 * 4. Sort by flagCount descending and return top N
 */
export const getTopFlaggedQuestions = authQuery({
	args: {
		cohortId: v.id('cohort'),
		semesterId: v.optional(v.id('semester')),
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		await requireCohortStaff(ctx, args.cohortId);
		const limit = Math.max(1, Math.min(args.limit ?? 10, 50));

		let classes = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		if (args.semesterId) {
			classes = classes.filter((c) => c.semesterId === args.semesterId);
		}

		if (classes.length === 0) return [];

		const classMap = new Map<string, Doc<'class'>>();
		for (const classItem of classes) {
			classMap.set(classItem._id, classItem);
		}

		const modules: Doc<'module'>[] = [];
		for (const classItem of classes) {
			const classModules = await ctx.db
				.query('module')
				.withIndex('by_classId', (q) => q.eq('classId', classItem._id))
				.collect();
			modules.push(...classModules);
		}

		if (modules.length === 0) return [];

		type QuestionWithContext = {
			_id: Id<'question'>;
			stem: string;
			type: string;
			flagCount: number;
			moduleId: Id<'module'>;
			moduleTitle: string;
			classId: Id<'class'>;
			className: string;
		};

		const candidates: QuestionWithContext[] = [];
		const perModuleFetch = Math.min(limit, 20);

		for (const module of modules) {
			const topByFlags = await ctx.db
				.query('question')
				.withIndex('by_moduleId_flagCount', (q) => q.eq('moduleId', module._id).gt('flagCount', 0))
				.order('desc')
				.take(perModuleFetch);

			const classItem = classMap.get(module.classId);
			for (const question of topByFlags) {
				const flagCount = question.flagCount ?? 0;
				if (flagCount <= 0) continue;
				candidates.push({
					_id: question._id,
					stem: question.stem,
					type: question.type,
					flagCount,
					moduleId: module._id,
					moduleTitle: module.title,
					classId: module.classId,
					className: classItem?.name ?? 'Unknown'
				});
			}
		}

		candidates.sort((a, b) => b.flagCount - a.flagCount);
		return candidates.slice(0, limit);
	}
});

/**
 * Get available semesters for a cohort (for filtering UI)
 */
export const getSemestersForCohort = authQuery({
	args: { cohortId: v.id('cohort') },
	handler: async (ctx, args) => {
		await requireCohortStaff(ctx, args.cohortId);
		// Get all classes in cohort
		const classes = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		// Get unique semester IDs
		const semesterIds = [...new Set(classes.map((c) => c.semesterId))];

		// Fetch semester details
		const semesters = await Promise.all(semesterIds.map((id) => ctx.db.get(id)));

		return semesters
			.filter((s): s is Doc<'semester'> => s !== null)
			.map((s) => ({
				_id: s._id,
				name: s.name
			}));
	}
});

/**
 * Get detailed per-module progress stats for a specific user in a cohort.
 * Used for the student detail modal - called on demand when clicking a student.
 *
 * Optimized: Uses stored questionCount on modules instead of fetching all questions.
 * Only fetches progress records once per class, then aggregates by module.
 */
export const getUserModuleStats = authQuery({
	args: {
		userId: v.id('users'),
		cohortId: v.id('cohort'),
		semesterId: v.optional(v.id('semester'))
	},
	handler: async (ctx, args) => {
		await requireUserReadById(ctx, args.userId);
		const target = await ctx.db.get(args.userId);
		if (target?.cohortId !== args.cohortId) throw new Error('Unauthorized for this cohort');
		const user = await ctx.db.get(args.userId);
		if (!user) {
			return { error: 'User not found', classes: [] };
		}

		// Get all classes in cohort
		let classes = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		// Filter by semester if provided
		if (args.semesterId) {
			classes = classes.filter((c) => c.semesterId === args.semesterId);
		}

		// Get semesters for grouping
		const semesterIds = [...new Set(classes.map((c) => c.semesterId))];
		const semesters = await Promise.all(semesterIds.map((id) => ctx.db.get(id)));
		const semesterMap = new Map(
			semesters.filter((s): s is Doc<'semester'> => s !== null).map((s) => [s._id, s.name])
		);

		// Build detailed stats per class and module
		const classStats = await Promise.all(
			classes.map(async (classItem) => {
				// Get modules with their stored questionCount
				const modules = await ctx.db
					.query('module')
					.withIndex('by_classId', (q) => q.eq('classId', classItem._id))
					.collect();

				// Get all progress records for this user in this class (single query per class)
				const progressRecords = await ctx.db
					.query('userProgress')
					.withIndex('by_user_class', (q) =>
						q.eq('userId', args.userId).eq('classId', classItem._id)
					)
					.collect();

				// We need to know which module each progress record belongs to
				// Get question -> module mapping only for questions the user has progress on
				const questionIds = progressRecords.map((r) => r.questionId);
				const questions = await Promise.all(questionIds.map((qId) => ctx.db.get(qId)));

				// Build moduleId -> progress records map
				const progressByModule = new Map<string, typeof progressRecords>();
				for (let i = 0; i < progressRecords.length; i++) {
					const question = questions[i];
					if (question) {
						const moduleId = question.moduleId;
						if (!progressByModule.has(moduleId)) {
							progressByModule.set(moduleId, []);
						}
						progressByModule.get(moduleId)!.push(progressRecords[i]);
					}
				}

				// Calculate stats per module using stored questionCount
				const moduleStats = modules.map((module) => {
					const moduleProgress = progressByModule.get(module._id) ?? [];

					let interacted = 0;
					let mastered = 0;
					let flagged = 0;
					let lastActivityAt: number | undefined = undefined;

					for (const progress of moduleProgress) {
						if (progress.selectedOptions.length > 0 || progress.eliminatedOptions.length > 0) {
							interacted++;
						}
						if (progress.isMastered) {
							mastered++;
						}
						if (progress.isFlagged) {
							flagged++;
						}
						if (progress.lastAttemptAt) {
							if (!lastActivityAt || progress.lastAttemptAt > lastActivityAt) {
								lastActivityAt = progress.lastAttemptAt;
							}
						}
					}

					// Use stored questionCount instead of fetching all questions
					const totalQuestions = module.questionCount ?? 0;
					const progressPercentage =
						totalQuestions > 0 ? Math.round((interacted / totalQuestions) * 100) : 0;

					return {
						moduleId: module._id,
						moduleTitle: module.title,
						moduleEmoji: module.emoji,
						moduleOrder: module.order,
						totalQuestions,
						questionsInteracted: interacted,
						questionsMastered: mastered,
						questionsFlagged: flagged,
						progress: progressPercentage,
						lastActivityAt
					};
				});

				// Calculate class totals
				const classTotals = moduleStats.reduce(
					(acc, m) => ({
						totalQuestions: acc.totalQuestions + m.totalQuestions,
						questionsInteracted: acc.questionsInteracted + m.questionsInteracted,
						questionsMastered: acc.questionsMastered + m.questionsMastered,
						questionsFlagged: acc.questionsFlagged + m.questionsFlagged
					}),
					{ totalQuestions: 0, questionsInteracted: 0, questionsMastered: 0, questionsFlagged: 0 }
				);

				const classProgress =
					classTotals.totalQuestions > 0
						? Math.round((classTotals.questionsInteracted / classTotals.totalQuestions) * 100)
						: 0;

				return {
					classId: classItem._id,
					className: classItem.name,
					classCode: classItem.code,
					classOrder: classItem.order,
					semesterId: classItem.semesterId,
					semesterName: semesterMap.get(classItem.semesterId) ?? 'Unknown',
					progress: classProgress,
					...classTotals,
					modules: moduleStats.sort((a, b) => a.moduleOrder - b.moduleOrder)
				};
			})
		);

		// Calculate overall totals
		const overallTotals = classStats.reduce(
			(acc, c) => ({
				totalQuestions: acc.totalQuestions + c.totalQuestions,
				questionsInteracted: acc.questionsInteracted + c.questionsInteracted,
				questionsMastered: acc.questionsMastered + c.questionsMastered,
				questionsFlagged: acc.questionsFlagged + c.questionsFlagged
			}),
			{ totalQuestions: 0, questionsInteracted: 0, questionsMastered: 0, questionsFlagged: 0 }
		);

		const overallProgress =
			overallTotals.totalQuestions > 0
				? Math.round((overallTotals.questionsInteracted / overallTotals.totalQuestions) * 100)
				: 0;

		return {
			user: {
				_id: user._id,
				name: user.name,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				imageUrl: user.imageUrl
			},
			overall: {
				progress: overallProgress,
				...overallTotals
			},
			classes: classStats.sort((a, b) => a.classOrder - b.classOrder)
		};
	}
});

/**
 * Lightweight query to identify which modules the current user touched most recently.
 * Returns only module IDs and timestamps for minimal payload.
 */
export const getRecentModuleActivity = authQuery({
	args: {
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const limit = Math.max(1, Math.min(args.limit ?? 4, 8));
		const viewer = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', ctx.identity.subject))
			.first();
		if (!viewer || viewer.deletedAt || !viewer.cohortId) return [];

		const cohortClasses = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', viewer.cohortId!))
			.collect();

		if (cohortClasses.length === 0) return [];

		const interactedProgress: Doc<'userProgress'>[] = [];
		for (const classItem of cohortClasses) {
			const classProgress = await ctx.db
				.query('userProgress')
				.withIndex('by_user_class', (q) => q.eq('userId', viewer._id).eq('classId', classItem._id))
				.filter((q) => q.eq(q.field('deletedAt'), undefined))
				.collect();

			for (const record of classProgress) {
				if (hasInteraction(record)) interactedProgress.push(record);
			}
		}

		if (interactedProgress.length === 0) return [];

		const sortedProgress = [...interactedProgress].sort(
			(a, b) => (b.lastAttemptAt ?? b.updatedAt) - (a.lastAttemptAt ?? a.updatedAt)
		);
		const cohortClassIdSet = new Set(cohortClasses.map((classItem) => classItem._id));
		const questionToModuleId = new Map<Id<'question'>, Id<'module'> | null>();
		const moduleVisibility = new Map<Id<'module'>, boolean>();
		const seenModuleIds = new Set<Id<'module'>>();
		const recentModules: Array<{ moduleId: Id<'module'>; lastActivityAt: number }> = [];

		for (const progress of sortedProgress) {
			if (recentModules.length >= limit) break;

			let moduleId: Id<'module'> | null | undefined = questionToModuleId.get(progress.questionId);
			if (moduleId === undefined) {
				const question = await ctx.db.get(progress.questionId);
				moduleId = question && !question.deletedAt ? question.moduleId : null;
				questionToModuleId.set(progress.questionId, moduleId);
			}

			if (!moduleId || seenModuleIds.has(moduleId)) continue;

			let isVisible = moduleVisibility.get(moduleId);
			if (isVisible === undefined) {
				const moduleDoc = await ctx.db.get(moduleId);
				isVisible = Boolean(
					moduleDoc &&
					!moduleDoc.deletedAt &&
					moduleDoc.status === 'published' &&
					cohortClassIdSet.has(moduleDoc.classId)
				);
				moduleVisibility.set(moduleId, isVisible);
			}

			if (!isVisible) continue;

			seenModuleIds.add(moduleId);
			recentModules.push({
				moduleId,
				lastActivityAt: progress.lastAttemptAt ?? progress.updatedAt
			});
		}

		return recentModules;
	}
});

/**
 * Optimized per-module progress query for a small set of modules.
 * Designed to pair with getRecentModuleActivity on the classes page.
 */
export const getRecentModulesProgress = authQuery({
	args: {
		moduleIds: v.array(v.id('module'))
	},
	handler: async (ctx, args) => {
		const dedupedModuleIds = Array.from(new Set(args.moduleIds)).slice(0, 8);
		if (dedupedModuleIds.length === 0) return [];

		const viewer = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', ctx.identity.subject))
			.first();
		if (!viewer || viewer.deletedAt || !viewer.cohortId) return [];

		const moduleDocs = await Promise.all(dedupedModuleIds.map((moduleId) => ctx.db.get(moduleId)));
		const validModules = moduleDocs.filter(
			(moduleDoc): moduleDoc is Doc<'module'> =>
				moduleDoc !== null && !moduleDoc.deletedAt && moduleDoc.status === 'published'
		);
		if (validModules.length === 0) return [];

		const classIds = Array.from(new Set(validModules.map((moduleDoc) => moduleDoc.classId)));
		const classDocs = await Promise.all(classIds.map((classId) => ctx.db.get(classId)));
		const classMap = new Map<Id<'class'>, Doc<'class'>>();
		for (const classDoc of classDocs) {
			if (!classDoc || classDoc.deletedAt) continue;
			if (classDoc.cohortId !== viewer.cohortId) continue;
			classMap.set(classDoc._id, classDoc);
		}

		const cohortModules = validModules.filter((moduleDoc) => classMap.has(moduleDoc.classId));
		if (cohortModules.length === 0) return [];

		type ModuleAccumulator = {
			totalQuestions: number;
			questionsInteracted: number;
			questionsMastered: number;
			questionsFlagged: number;
		};

		const moduleAccumulators = new Map<Id<'module'>, ModuleAccumulator>();
		const questionToModuleId = new Map<Id<'question'>, Id<'module'>>();

		for (const moduleDoc of cohortModules) {
			const questions = await ctx.db
				.query('question')
				.withIndex('by_moduleId', (q) => q.eq('moduleId', moduleDoc._id))
				.filter((q) => q.eq(q.field('deletedAt'), undefined))
				.collect();

			for (const question of questions) {
				questionToModuleId.set(question._id, moduleDoc._id);
			}

			moduleAccumulators.set(moduleDoc._id, {
				totalQuestions: moduleDoc.questionCount ?? questions.length,
				questionsInteracted: 0,
				questionsMastered: 0,
				questionsFlagged: 0
			});
		}

		const involvedClassIds = Array.from(
			new Set(cohortModules.map((moduleDoc) => moduleDoc.classId))
		);
		for (const classId of involvedClassIds) {
			const progressRecords = await ctx.db
				.query('userProgress')
				.withIndex('by_user_class', (q) => q.eq('userId', viewer._id).eq('classId', classId))
				.filter((q) => q.eq(q.field('deletedAt'), undefined))
				.collect();

			for (const progress of progressRecords) {
				const moduleId = questionToModuleId.get(progress.questionId);
				if (!moduleId) continue;
				const moduleStats = moduleAccumulators.get(moduleId);
				if (!moduleStats) continue;

				if (hasInteraction(progress)) moduleStats.questionsInteracted++;
				if (progress.isMastered) moduleStats.questionsMastered++;
				if (progress.isFlagged) moduleStats.questionsFlagged++;
			}
		}

		const orderLookup = new Map(dedupedModuleIds.map((moduleId, index) => [moduleId, index]));

		return [...cohortModules]
			.sort((a, b) => (orderLookup.get(a._id) ?? 999) - (orderLookup.get(b._id) ?? 999))
			.map((moduleDoc) => {
				const classDoc = classMap.get(moduleDoc.classId)!;
				const stats = moduleAccumulators.get(moduleDoc._id)!;
				const progress =
					stats.totalQuestions > 0
						? Math.round((stats.questionsInteracted / stats.totalQuestions) * 100)
						: 0;

				return {
					moduleId: moduleDoc._id,
					moduleTitle: moduleDoc.title,
					moduleEmoji: moduleDoc.emoji,
					classId: classDoc._id,
					className: classDoc.name,
					classCode: classDoc.code,
					totalQuestions: stats.totalQuestions,
					questionsInteracted: stats.questionsInteracted,
					questionsMastered: stats.questionsMastered,
					questionsFlagged: stats.questionsFlagged,
					progress
				};
			});
	}
});

const HISTORY_RECORD_CAP = 4000;
const HISTORY_QUESTION_LOOKUP_CAP = 400;
const LIVE_RECORD_CAP = 500;
const LIVE_QUESTION_LOOKUP_CAP = 100;
const SESSION_GAP_MS = 30 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const activitySessionValidator = v.object({
	kind: v.union(v.literal('practice'), v.literal('quiz_started'), v.literal('quiz_submitted')),
	userId: v.id('users'),
	startedAt: v.number(),
	at: v.number(),
	count: v.number(),
	classId: v.id('class'),
	className: v.string(),
	moduleId: v.union(v.id('module'), v.null()),
	moduleTitle: v.union(v.string(), v.null()),
	moduleEmoji: v.union(v.string(), v.null()),
	scorePct: v.union(v.number(), v.null())
});

const activityFields = {
	since: v.number(),
	truncated: v.boolean(),
	hours: v.array(
		v.object({
			hour: v.number(),
			tries: v.number(),
			users: v.array(v.object({ userId: v.id('users'), tries: v.number() }))
		})
	),
	sessions: v.array(activitySessionValidator),
	modules: v.array(
		v.object({
			moduleId: v.id('module'),
			classId: v.id('class'),
			title: v.string(),
			emoji: v.union(v.string(), v.null()),
			className: v.string(),
			tries: v.number(),
			userIds: v.array(v.id('users'))
		})
	),
	quizzes: v.object({
		started: v.number(),
		submitted: v.number(),
		scoreTotal: v.number(),
		scored: v.number()
	})
};

/**
 * First attempts (userProgress creation) and practice tests in [from, to), bounded by caps.
 * Re-answers don't create records, so they surface through lastSeenAt instead.
 */
async function collectActivity(
	ctx: QueryCtx,
	args: {
		cohortId: Id<'cohort'>;
		from: number;
		to?: number;
		recordCap: number;
		lookupCap: number;
		quizCapPerClass: number;
	}
) {
	const members = await ctx.db
		.query('users')
		.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
		.collect();
	const students = members.filter((member) => !member.deletedAt);
	const studentIds = new Set(students.map((student) => student._id));

	const classes = (
		await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect()
	).filter((classItem) => !classItem.deletedAt);
	const classMap = new Map(classes.map((classItem) => [classItem._id, classItem]));

	let truncated = false;
	const records: Doc<'userProgress'>[] = [];
	for (const classItem of classes) {
		const budget = args.recordCap - records.length;
		if (budget <= 0) {
			truncated = true;
			break;
		}
		const recent = await ctx.db
			.query('userProgress')
			.withIndex('by_classId', (q) => {
				const lower = q.eq('classId', classItem._id).gte('_creationTime', args.from);
				return args.to === undefined ? lower : lower.lt('_creationTime', args.to);
			})
			.order('desc')
			.take(budget);
		if (recent.length === budget) truncated = true;
		for (const record of recent) {
			if (!record.deletedAt && studentIds.has(record.userId) && hasInteraction(record)) {
				records.push(record);
			}
		}
	}

	const firstTriedAt = (record: Doc<'userProgress'>) =>
		record.metadata.firstInteractedAt ?? record._creationTime;
	records.sort((a, b) => firstTriedAt(b) - firstTriedAt(a));

	const hourMap = new Map<number, Map<Id<'users'>, number>>();
	for (const record of records) {
		const hour = Math.floor((firstTriedAt(record) - args.from) / HOUR_MS);
		const bucket = hourMap.get(hour) ?? new Map<Id<'users'>, number>();
		bucket.set(record.userId, (bucket.get(record.userId) ?? 0) + 1);
		hourMap.set(hour, bucket);
	}
	const hours = [...hourMap.entries()]
		.sort(([a], [b]) => a - b)
		.map(([hour, bucket]) => ({
			hour,
			tries: [...bucket.values()].reduce((sum, tries) => sum + tries, 0),
			users: [...bucket.entries()].map(([userId, tries]) => ({ userId, tries }))
		}));

	const questionModule = new Map<Id<'question'>, Id<'module'> | null>();
	for (const record of records) {
		if (questionModule.size >= args.lookupCap) break;
		if (questionModule.has(record.questionId)) continue;
		const question = await ctx.db.get(record.questionId);
		questionModule.set(record.questionId, question?.moduleId ?? null);
	}
	const moduleIds = [...new Set([...questionModule.values()].filter((id) => id !== null))];
	const moduleDocs = await Promise.all(moduleIds.map((moduleId) => ctx.db.get(moduleId)));
	const moduleMap = new Map(
		moduleDocs
			.filter((moduleDoc): moduleDoc is Doc<'module'> => moduleDoc !== null)
			.map((moduleDoc) => [moduleDoc._id, moduleDoc])
	);

	type Session = typeof activitySessionValidator.type;
	const sessions: Session[] = [];
	const openSessions = new Map<string, Session>();
	for (const record of records) {
		if (!questionModule.has(record.questionId)) continue;
		const moduleId = questionModule.get(record.questionId) ?? null;
		const at = firstTriedAt(record);
		const key = `${record.userId}:${moduleId ?? record.classId}`;
		const open = openSessions.get(key);
		if (open && open.startedAt - at <= SESSION_GAP_MS) {
			open.count++;
			open.startedAt = at;
			continue;
		}
		const moduleDoc = moduleId ? moduleMap.get(moduleId) : undefined;
		const session: Session = {
			kind: 'practice',
			userId: record.userId,
			startedAt: at,
			at,
			count: 1,
			classId: record.classId,
			className: classMap.get(record.classId)?.name ?? 'Class',
			moduleId,
			moduleTitle: moduleDoc?.title ?? null,
			moduleEmoji: moduleDoc?.emoji ?? null,
			scorePct: null
		};
		openSessions.set(key, session);
		sessions.push(session);
	}

	const moduleActivity = new Map<Id<'module'>, { tries: number; userIds: Set<Id<'users'>> }>();
	for (const record of records) {
		const moduleId = questionModule.get(record.questionId);
		if (!moduleId || !moduleMap.has(moduleId)) continue;
		const entry = moduleActivity.get(moduleId) ?? { tries: 0, userIds: new Set<Id<'users'>>() };
		entry.tries++;
		entry.userIds.add(record.userId);
		moduleActivity.set(moduleId, entry);
	}
	const modules = [...moduleActivity.entries()]
		.map(([moduleId, entry]) => {
			const moduleDoc = moduleMap.get(moduleId)!;
			return {
				moduleId,
				classId: moduleDoc.classId,
				title: moduleDoc.title,
				emoji: moduleDoc.emoji ?? null,
				className: classMap.get(moduleDoc.classId)?.name ?? 'Class',
				tries: entry.tries,
				userIds: [...entry.userIds]
			};
		})
		.sort((a, b) => b.userIds.length - a.userIds.length || b.tries - a.tries)
		.slice(0, 12);

	const quizzes = { started: 0, submitted: 0, scoreTotal: 0, scored: 0 };
	for (const classItem of classes) {
		const attempts = await ctx.db
			.query('quizAttempts')
			.withIndex('by_class', (q) => {
				const lower = q.eq('classId', classItem._id).gte('_creationTime', args.from);
				return args.to === undefined ? lower : lower.lt('_creationTime', args.to);
			})
			.order('desc')
			.take(args.quizCapPerClass);
		for (const attempt of attempts) {
			if (!studentIds.has(attempt.userId)) continue;
			quizzes.started++;
			const submitted = attempt.status === 'submitted' || attempt.status === 'timed_out';
			const scorePct = submitted ? (attempt.resultSummary?.scorePct ?? null) : null;
			if (submitted) quizzes.submitted++;
			if (scorePct !== null) {
				quizzes.scoreTotal += scorePct;
				quizzes.scored++;
			}
			sessions.push({
				kind: submitted ? 'quiz_submitted' : 'quiz_started',
				userId: attempt.userId,
				startedAt: attempt.startedAt,
				at: submitted ? (attempt.submittedAt ?? attempt.lastActivityAt) : attempt.startedAt,
				count: attempt.configSnapshot.questionCountActual,
				classId: classItem._id,
				className: classItem.name,
				moduleId: null,
				moduleTitle: null,
				moduleEmoji: null,
				scorePct
			});
		}
	}

	return {
		students,
		activity: {
			since: args.from,
			truncated,
			hours,
			sessions: sessions.sort((a, b) => b.at - a.at).slice(0, 40),
			modules,
			quizzes
		}
	};
}

/**
 * Closed-window history for the dashboard charts. `until` must be in the past (the client
 * passes the start of the current hour), and the client fetches this point-in-time rather
 * than subscribing, so ongoing studying never re-runs this larger read.
 */
export const getCohortActivityHistory = authQuery({
	args: { cohortId: v.id('cohort'), since: v.number(), until: v.number() },
	returns: v.object(activityFields),
	handler: async (ctx, args) => {
		await requireCohortStaff(ctx, args.cohortId);
		const from = Math.floor(args.since / HOUR_MS) * HOUR_MS;
		const to = Math.max(from, Math.floor(args.until / HOUR_MS) * HOUR_MS);
		const { activity } = await collectActivity(ctx, {
			cohortId: args.cohortId,
			from,
			to,
			recordCap: HISTORY_RECORD_CAP,
			lookupCap: HISTORY_QUESTION_LOOKUP_CAP,
			quizCapPerClass: 200
		});
		return activity;
	}
});

/**
 * Small reactive slice: activity since the start of the current hour plus each student's
 * last-seen time and streak. Reads stay bounded by the hour window and cohort size.
 */
export const getCohortLiveActivity = authQuery({
	args: { cohortId: v.id('cohort'), since: v.number() },
	returns: v.object({
		...activityFields,
		students: v.array(
			v.object({
				userId: v.id('users'),
				lastSeenAt: v.union(v.number(), v.null()),
				questionsInteracted: v.union(v.number(), v.null()),
				questionsMastered: v.union(v.number(), v.null()),
				streakDays: v.number(),
				streakDayKey: v.union(v.number(), v.null())
			})
		)
	}),
	handler: async (ctx, args) => {
		await requireCohortStaff(ctx, args.cohortId);
		const from = Math.floor(args.since / HOUR_MS) * HOUR_MS;
		const { students, activity } = await collectActivity(ctx, {
			cohortId: args.cohortId,
			from,
			recordCap: LIVE_RECORD_CAP,
			lookupCap: LIVE_QUESTION_LOOKUP_CAP,
			quizCapPerClass: 20
		});

		const metrics = await Promise.all(
			students.map(async (student) => {
				const [cohortMetric, globalMetric] = await Promise.all([
					ctx.db
						.query('userBadgeMetrics')
						.withIndex('by_user_scope_cohort', (q) =>
							q.eq('userId', student._id).eq('scopeType', 'cohort').eq('cohortId', args.cohortId)
						)
						.first(),
					ctx.db
						.query('userBadgeMetrics')
						.withIndex('by_user_scopeType', (q) =>
							q.eq('userId', student._id).eq('scopeType', 'global')
						)
						.first()
				]);
				return {
					userId: student._id,
					lastSeenAt: cohortMetric?.updatedAt ?? null,
					questionsInteracted: cohortMetric?.questionsInteracted ?? null,
					questionsMastered: cohortMetric?.questionsMastered ?? null,
					streakDays: globalMetric?.streakCurrentDays ?? 0,
					streakDayKey: globalMetric?.lastActivityDayKey ?? null
				};
			})
		);

		return { ...activity, students: metrics };
	}
});
