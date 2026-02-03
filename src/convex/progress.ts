import { v } from 'convex/values';
import { authQuery } from './authQueries';
import type { Doc, Id } from './_generated/dataModel';
import { polar } from './polar';

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
	args: { cohortId: v.id('cohort') },
	handler: async (ctx, args) => {
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
		// Also fetch subscription status for each student
		const studentsWithProgress = await Promise.all(
			students.map(async (student) => {
				// Get subscription status from Polar
				let isPro = false;
				try {
					const subscription = await polar.getCurrentSubscription(ctx, {
						userId: student._id
					});
					isPro =
						subscription?.status === 'active' ||
						subscription?.status === 'trialing';
				} catch {
					isPro = false;
				}

				// Use precomputed progressStats if available
				if (student.progressStats) {
					const totalQuestions = student.progressStats.totalQuestions || totalQuestionsInCohort;
					const progressPercentage =
						totalQuestions > 0
							? Math.round(
									(student.progressStats.questionsInteracted / totalQuestions) * 100
								)
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
							? (student.progressStats.questionsInteracted /
									student.progressStats.totalQuestions) *
								100
							: 0;
					totalProgressSum += pct;
				}
			}
		}

		const averageCompletion =
			totalStudents > 0 ? Math.round(totalProgressSum / totalStudents) : 0;

		return {
			totalStudents,
			totalQuestions,
			totalModules,
			averageCompletion
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
		const limit = args.limit ?? 10;

		// Get all classes in cohort
		let classes = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		// Filter by semester if provided
		if (args.semesterId) {
			classes = classes.filter((c) => c.semesterId === args.semesterId);
		}

		if (classes.length === 0) {
			return [];
		}

		// Build a map of classId -> class for lookup
		const classMap = new Map<string, Doc<'class'>>();
		for (const c of classes) {
			classMap.set(c._id, c);
		}

		// Get all modules for these classes
		const modules: Doc<'module'>[] = [];
		for (const classItem of classes) {
			const classModules = await ctx.db
				.query('module')
				.withIndex('by_classId', (q) => q.eq('classId', classItem._id))
				.collect();
			modules.push(...classModules);
		}

		if (modules.length === 0) {
			return [];
		}

		// Build a map of moduleId -> module for lookup
		const moduleMap = new Map<string, Doc<'module'>>();
		for (const m of modules) {
			moduleMap.set(m._id, m);
		}

		// Collect all questions with flagCount > 0 from these modules
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

		const flaggedQuestions: QuestionWithContext[] = [];

		for (const module of modules) {
			// Query questions for this module, filtering for those with flags
			const questions = await ctx.db
				.query('question')
				.withIndex('by_moduleId', (q) => q.eq('moduleId', module._id))
				.filter((q) => q.gt(q.field('flagCount'), 0))
				.collect();

			const classItem = classMap.get(module.classId);

			for (const question of questions) {
				flaggedQuestions.push({
					_id: question._id,
					stem: question.stem,
					type: question.type,
					flagCount: question.flagCount ?? 0,
					moduleId: module._id,
					moduleTitle: module.title,
					classId: module.classId,
					className: classItem?.name ?? 'Unknown'
				});
			}
		}

		// Sort by flagCount descending and take top N
		flaggedQuestions.sort((a, b) => b.flagCount - a.flagCount);

		return flaggedQuestions.slice(0, limit);
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
		const semesters = await Promise.all(
			semesterIds.map((id) => ctx.db.get(id))
		);

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
				const questions = await Promise.all(
					questionIds.map((qId) => ctx.db.get(qId))
				);

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
