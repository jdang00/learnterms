import { v } from 'convex/values';
import { authQuery } from './authQueries';
import type { Doc, Id } from './_generated/dataModel';
import { polar } from './polar';

function hasInteraction(record: Pick<Doc<'userProgress'>, 'selectedOptions' | 'eliminatedOptions'>) {
	return record.selectedOptions.length > 0 || record.eliminatedOptions.length > 0;
}

/**
 * Get all students in a cohort with their basic info
 * Uses the by_cohortId index for efficient querying
 */
export const getStudentsByCohort = authQuery({
	args: { cohortId: v.id('cohort') },
	handler: async (ctx, args) => {
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
 * Falls back to computing if stats haven't been backfilled yet.
 */
export const getStudentsWithProgress = authQuery({
	args: {
		cohortId: v.id('cohort'),
		includeSubscription: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
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
						questionsInteracted: student.progressStats.questionsInteracted,
						questionsMastered: student.progressStats.questionsMastered,
						totalQuestions,
						lastActivityAt: student.progressStats.lastActivityAt ?? null
					};
				}

				// Fallback for users without precomputed stats
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

export const getModuleCompletionStats = authQuery({
	args: {
		cohortId: v.id('cohort'),
		semesterId: v.optional(v.id('semester')),
		limit: v.optional(v.number()),
		offset: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const limit = Math.max(1, Math.min(args.limit ?? 8, 50));
		const offset = Math.max(0, args.offset ?? 0);

		const students = await ctx.db
			.query('users')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.filter((q) => q.eq(q.field('deletedAt'), undefined))
			.collect();
		const totalStudents = students.length;
		const studentIds = new Set(students.map((student) => student._id));

		let classes = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		if (args.semesterId) {
			classes = classes.filter((classItem) => classItem.semesterId === args.semesterId);
		}

		if (classes.length === 0) {
			return {
				totalStudents,
				totalModules: 0,
				averageCompletion: 0,
				modules: [],
				page: { offset, limit, hasMore: false, nextOffset: null }
			};
		}

		const classMap = new Map(classes.map((classItem) => [classItem._id, classItem]));

		const modules: Doc<'module'>[] = [];
		for (const classItem of classes) {
			const classModules = await ctx.db
				.query('module')
				.withIndex('by_classId', (q) => q.eq('classId', classItem._id))
				.filter((q) => q.eq(q.field('deletedAt'), undefined))
				.collect();
			modules.push(...classModules);
		}

		if (modules.length === 0) {
			return {
				totalStudents,
				totalModules: 0,
				averageCompletion: 0,
				modules: [],
				page: { offset, limit, hasMore: false, nextOffset: null }
			};
		}

		if (totalStudents === 0) {
			const rankedModules = modules
				.map((module) => {
					const classItem = classMap.get(module.classId);
					return {
						moduleId: module._id,
						moduleTitle: module.title,
						moduleEmoji: module.emoji,
						moduleOrder: module.order,
						classId: module.classId,
						className: classItem?.name ?? 'Unknown',
						totalQuestions: module.questionCount ?? 0,
						totalStudents: 0,
						possibleInteractions: 0,
						questionsInteracted: 0,
						questionsMastered: 0,
						questionsFlagged: 0,
						activeStudents: 0,
						completion: 0,
						mastery: 0
					};
				})
				.sort((a, b) => {
					if (a.className !== b.className) return a.className.localeCompare(b.className);
					return a.moduleOrder - b.moduleOrder;
				});

			const pageModules = rankedModules.slice(offset, offset + limit);
			const hasMore = offset + limit < rankedModules.length;
			const nextOffset = hasMore ? offset + limit : null;

			return {
				totalStudents: 0,
				totalModules: rankedModules.length,
				averageCompletion: 0,
				modules: pageModules,
				page: {
					offset,
					limit,
					hasMore,
					nextOffset
				}
			};
		}

		type ModuleAccumulator = {
			questionsInteracted: number;
			questionsMastered: number;
			questionsFlagged: number;
			activeStudentIds: Set<Id<'users'>>;
		};

		const moduleStatsMap = new Map<Id<'module'>, ModuleAccumulator>();
		for (const module of modules) {
			moduleStatsMap.set(module._id, {
				questionsInteracted: 0,
				questionsMastered: 0,
				questionsFlagged: 0,
				activeStudentIds: new Set<Id<'users'>>()
			});
		}

		const questionToModuleId = new Map<Id<'question'>, Id<'module'>>();
		for (const module of modules) {
			if ((module.questionCount ?? 0) === 0) continue;

			const questions = await ctx.db
				.query('question')
				.withIndex('by_moduleId', (q) => q.eq('moduleId', module._id))
				.collect();

			for (const question of questions) {
				if (!question.deletedAt) {
					questionToModuleId.set(question._id, module._id);
				}
			}
		}

		for (const classItem of classes) {
			const progressRecords = await ctx.db
				.query('userProgress')
				.withIndex('by_classId', (q) => q.eq('classId', classItem._id))
				.filter((q) => q.eq(q.field('deletedAt'), undefined))
				.collect();

			for (const progress of progressRecords) {
				if (!studentIds.has(progress.userId)) continue;

				const moduleId = questionToModuleId.get(progress.questionId);
				if (!moduleId) continue;

				const moduleStats = moduleStatsMap.get(moduleId);
				if (!moduleStats) continue;

				const interacted =
					progress.selectedOptions.length > 0 || progress.eliminatedOptions.length > 0;
				if (interacted) {
					moduleStats.questionsInteracted++;
					moduleStats.activeStudentIds.add(progress.userId);
				}
				if (progress.isMastered) moduleStats.questionsMastered++;
				if (progress.isFlagged) moduleStats.questionsFlagged++;
			}
		}

		const rankedModules = modules
			.map((module) => {
				const classItem = classMap.get(module.classId);
				const moduleStats = moduleStatsMap.get(module._id);
				const totalQuestions = module.questionCount ?? 0;
				const possibleInteractions = totalQuestions * totalStudents;
				const questionsInteracted = moduleStats?.questionsInteracted ?? 0;
				const questionsMastered = moduleStats?.questionsMastered ?? 0;
				const questionsFlagged = moduleStats?.questionsFlagged ?? 0;
				const activeStudents = moduleStats?.activeStudentIds.size ?? 0;
				const completion =
					possibleInteractions > 0
						? Math.round((questionsInteracted / possibleInteractions) * 100)
						: 0;
				const mastery =
					possibleInteractions > 0
						? Math.round((questionsMastered / possibleInteractions) * 100)
						: 0;

				return {
					moduleId: module._id,
					moduleTitle: module.title,
					moduleEmoji: module.emoji,
					moduleOrder: module.order,
					classId: module.classId,
					className: classItem?.name ?? 'Unknown',
					totalQuestions,
					totalStudents,
					possibleInteractions,
					questionsInteracted,
					questionsMastered,
					questionsFlagged,
					activeStudents,
					completion,
					mastery
				};
			})
			.sort((a, b) => {
				if (a.completion !== b.completion) return a.completion - b.completion;
				if (a.className !== b.className) return a.className.localeCompare(b.className);
				return a.moduleOrder - b.moduleOrder;
			});

		const averageCompletion =
			rankedModules.length > 0
				? Math.round(
						rankedModules.reduce((sum, module) => sum + module.completion, 0) / rankedModules.length
					)
				: 0;

		const pageModules = rankedModules.slice(offset, offset + limit);
		const hasMore = offset + limit < rankedModules.length;
		const nextOffset = hasMore ? offset + limit : null;

		return {
			totalStudents,
			totalModules: rankedModules.length,
			averageCompletion,
			modules: pageModules,
			page: {
				offset,
				limit,
				hasMore,
				nextOffset
			}
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
				.withIndex('by_moduleId_flagCount', (q) => q.eq('moduleId', module._id))
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

		const involvedClassIds = Array.from(new Set(cohortModules.map((moduleDoc) => moduleDoc.classId)));
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
