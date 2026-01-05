import { v } from 'convex/values';
import { authQuery } from './authQueries';
import type { Doc, Id } from './_generated/dataModel';

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
 * Get students with their progress stats for a specific cohort
 * Aggregates progress data across all classes in the cohort
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

		// Get all classes in the cohort using index
		const classes = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		const classIds = classes.map((c) => c._id);

		// Get total questions across all classes using stored questionCount
		let totalQuestionsInCohort = 0;
		const modulesByClass = new Map<string, string[]>();

		for (const classItem of classes) {
			const modules = await ctx.db
				.query('module')
				.withIndex('by_classId', (q) => q.eq('classId', classItem._id))
				.collect();

			const moduleIds = modules.map((m) => m._id);
			modulesByClass.set(classItem._id, moduleIds);

			// Use stored questionCount instead of fetching all questions
			for (const module of modules) {
				totalQuestionsInCohort += module.questionCount ?? 0;
			}
		}

		// Get progress for each student
		const studentsWithProgress = await Promise.all(
			students.map(async (student) => {
				// Get all progress records for this student across cohort classes
				let totalInteracted = 0;
				let totalMastered = 0;
				let lastActivityAt: number | null = null;

				for (const classId of classIds) {
					const progressRecords = await ctx.db
						.query('userProgress')
						.withIndex('by_user_class', (q) =>
							q.eq('userId', student._id).eq('classId', classId)
						)
						.collect();

					for (const record of progressRecords) {
						if (record.selectedOptions.length > 0 || record.eliminatedOptions.length > 0) {
							totalInteracted++;
						}
						if (record.isMastered) {
							totalMastered++;
						}
						if (record.lastAttemptAt) {
							if (!lastActivityAt || record.lastAttemptAt > lastActivityAt) {
								lastActivityAt = record.lastAttemptAt;
							}
						}
					}
				}

				const progressPercentage =
					totalQuestionsInCohort > 0
						? Math.round((totalInteracted / totalQuestionsInCohort) * 100)
						: 0;

				return {
					_id: student._id,
					name: student.name,
					clerkUserId: student.clerkUserId,
					// Enhanced user fields from Clerk
					firstName: student.firstName,
					lastName: student.lastName,
					email: student.email,
					username: student.username,
					imageUrl: student.imageUrl,
					lastSignInAt: student.lastSignInAt,
					createdAt: student.createdAt,
					// Progress metrics
					progress: progressPercentage,
					questionsInteracted: totalInteracted,
					questionsMastered: totalMastered,
					totalQuestions: totalQuestionsInCohort,
					lastActivityAt
				};
			})
		);

		// Sort by progress descending
		return studentsWithProgress.sort((a, b) => b.progress - a.progress);
	}
});

/**
 * Get cohort overview stats (students, questions, modules, avg completion)
 * Single query that returns all stats needed for the progress dashboard header
 */
export const getCohortProgressStats = authQuery({
	args: { cohortId: v.id('cohort') },
	handler: async (ctx, args) => {
		// Get student count using index
		const students = await ctx.db
			.query('users')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.filter((q) => q.eq(q.field('deletedAt'), undefined))
			.collect();

		const totalStudents = students.length;

		// Get all classes in cohort using index
		const classes = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		// Count modules and questions using stored questionCount
		let totalModules = 0;
		let totalQuestions = 0;

		for (const classItem of classes) {
			const modules = await ctx.db
				.query('module')
				.withIndex('by_classId', (q) => q.eq('classId', classItem._id))
				.collect();

			totalModules += modules.length;

			// Use stored questionCount instead of fetching all questions
			for (const module of modules) {
				totalQuestions += module.questionCount ?? 0;
			}
		}

		// Calculate average completion across all students
		let totalProgressSum = 0;

		if (totalQuestions > 0 && totalStudents > 0) {
			for (const student of students) {
				let studentInteracted = 0;

				for (const classItem of classes) {
					const progressRecords = await ctx.db
						.query('userProgress')
						.withIndex('by_user_class', (q) =>
							q.eq('userId', student._id).eq('classId', classItem._id)
						)
						.collect();

					studentInteracted += progressRecords.filter(
						(r) => r.selectedOptions.length > 0 || r.eliminatedOptions.length > 0
					).length;
				}

				totalProgressSum += (studentInteracted / totalQuestions) * 100;
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
