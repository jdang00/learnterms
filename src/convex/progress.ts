import { v } from 'convex/values';
import { authQuery } from './authQueries';

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

		// Get total questions across all classes (for percentage calculation)
		let totalQuestionsInCohort = 0;
		const modulesByClass = new Map<string, string[]>();

		for (const classItem of classes) {
			const modules = await ctx.db
				.query('module')
				.withIndex('by_classId', (q) => q.eq('classId', classItem._id))
				.collect();

			const moduleIds = modules.map((m) => m._id);
			modulesByClass.set(classItem._id, moduleIds);

			for (const module of modules) {
				const questions = await ctx.db
					.query('question')
					.withIndex('by_moduleId', (q) => q.eq('moduleId', module._id))
					.collect();
				totalQuestionsInCohort += questions.length;
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

		// Count modules and questions
		let totalModules = 0;
		let totalQuestions = 0;

		for (const classItem of classes) {
			const modules = await ctx.db
				.query('module')
				.withIndex('by_classId', (q) => q.eq('classId', classItem._id))
				.collect();

			totalModules += modules.length;

			for (const module of modules) {
				const questions = await ctx.db
					.query('question')
					.withIndex('by_moduleId', (q) => q.eq('moduleId', module._id))
					.collect();
				totalQuestions += questions.length;
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
