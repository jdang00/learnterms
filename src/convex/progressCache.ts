import { v } from 'convex/values';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { authQuery, authAdminMutation } from './authQueries';

/**
 * Internal function to compute progress stats for a cohort
 * This contains the expensive logic that we want to cache
 */
export const computeCohortProgress = internalMutation({
	args: { cohortId: v.id('cohort') },
	handler: async (ctx, args) => {
		// Mark as refreshing
		const existingCache = await ctx.db
			.query('cohortProgressCache')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.first();

		if (existingCache) {
			await ctx.db.patch(existingCache._id, {
				refreshStatus: 'refreshing'
			});
		}

		try {
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

			// Count modules and questions
			let totalModules = 0;
			let totalQuestionsInCohort = 0;

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
					totalQuestionsInCohort += questions.length;
				}
			}

			// Get progress for each student
			const studentsProgress = await Promise.all(
				students.map(async (student) => {
					let totalInteracted = 0;
					let totalMastered = 0;
					let lastActivityAt: number | undefined = undefined;

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
						firstName: student.firstName,
						lastName: student.lastName,
						email: student.email,
						username: student.username,
						imageUrl: student.imageUrl,
						lastSignInAt: student.lastSignInAt,
						createdAt: student.createdAt,
						progress: progressPercentage,
						questionsInteracted: totalInteracted,
						questionsMastered: totalMastered,
						totalQuestions: totalQuestionsInCohort,
						lastActivityAt
					};
				})
			);

			// Sort by progress descending
			studentsProgress.sort((a, b) => b.progress - a.progress);

			// Calculate average completion
			const totalProgressSum = studentsProgress.reduce((sum, s) => sum + s.progress, 0);
			const averageCompletion =
				students.length > 0 ? Math.round(totalProgressSum / students.length) : 0;

			// Calculate module completion stats
			const moduleCompletion = [];
			for (const classItem of classes) {
				const modules = await ctx.db
					.query('module')
					.withIndex('by_classId', (q) => q.eq('classId', classItem._id))
					.collect();

				for (const module of modules) {
					const questions = await ctx.db
						.query('question')
						.withIndex('by_moduleId', (q) => q.eq('moduleId', module._id))
						.collect();

					const totalQuestionsInModule = questions.length;
					if (totalQuestionsInModule === 0) continue;

					let moduleProgressSum = 0;
					let studentsCompleted = 0;
					let studentsStarted = 0;

					for (const student of students) {
						// Get all progress for this student in this module
						const progressRecords = await ctx.db
							.query('userProgress')
							.withIndex('by_user_class', (q) =>
								q.eq('userId', student._id).eq('classId', classItem._id)
							)
							.collect();

						const moduleProgress = progressRecords.filter((r) =>
							questions.some((q) => q._id === r.questionId)
						);

						const interactedCount = moduleProgress.filter(
							(r) => r.selectedOptions.length > 0 || r.eliminatedOptions.length > 0
						).length;

						const studentModuleCompletion =
							totalQuestionsInModule > 0 ? (interactedCount / totalQuestionsInModule) * 100 : 0;

						moduleProgressSum += studentModuleCompletion;

						if (studentModuleCompletion === 100) {
							studentsCompleted++;
						}
						if (studentModuleCompletion > 0) {
							studentsStarted++;
						}
					}

					const averageModuleCompletion =
						students.length > 0 ? Math.round(moduleProgressSum / students.length) : 0;

					moduleCompletion.push({
						moduleId: module._id,
						moduleName: module.title,
						className: classItem.name,
						totalQuestions: totalQuestionsInModule,
						averageCompletion: averageModuleCompletion,
						studentsCompleted,
						studentsStarted
					});
				}
			}

			// Sort by average completion ascending (show struggling modules first)
			moduleCompletion.sort((a, b) => a.averageCompletion - b.averageCompletion);

			// Calculate top flagged questions
			const flaggedQuestionsMap = new Map<
				string,
				{ question: any; module: any; class: any; flagCount: number }
			>();

			for (const classItem of classes) {
				const modules = await ctx.db
					.query('module')
					.withIndex('by_classId', (q) => q.eq('classId', classItem._id))
					.collect();

				for (const module of modules) {
					const questions = await ctx.db
						.query('question')
						.withIndex('by_moduleId', (q) => q.eq('moduleId', module._id))
						.collect();

					for (const question of questions) {
						// Count how many students flagged this question
						let flagCount = 0;

						for (const student of students) {
							const progressRecords = await ctx.db
								.query('userProgress')
								.withIndex('by_user_class', (q) =>
									q.eq('userId', student._id).eq('classId', classItem._id)
								)
								.collect();

							const questionProgress = progressRecords.find((r) => r.questionId === question._id);
							if (questionProgress?.isFlagged) {
								flagCount++;
							}
						}

						if (flagCount > 0) {
							flaggedQuestionsMap.set(question._id, {
								question,
								module,
								class: classItem,
								flagCount
							});
						}
					}
				}
			}

			// Convert to array and sort by flag count descending
			const topFlaggedQuestions = Array.from(flaggedQuestionsMap.values())
				.sort((a, b) => b.flagCount - a.flagCount)
				.slice(0, 10) // Top 10 flagged questions
				.map((item) => ({
					questionId: item.question._id,
					stem: item.question.stem,
					moduleName: item.module.title,
					className: item.class.name,
					flagCount: item.flagCount,
					totalStudents: students.length,
					flagPercentage:
						students.length > 0 ? Math.round((item.flagCount / students.length) * 100) : 0
				}));

			const cacheData = {
				cohortId: args.cohortId,
				totalStudents: students.length,
				totalQuestions: totalQuestionsInCohort,
				totalModules,
				averageCompletion,
				studentsProgress,
				moduleCompletion,
				topFlaggedQuestions,
				lastRefreshedAt: Date.now(),
				refreshStatus: 'idle' as const,
				refreshError: undefined
			};

			// Upsert the cache
			if (existingCache) {
				await ctx.db.patch(existingCache._id, cacheData);
			} else {
				await ctx.db.insert('cohortProgressCache', cacheData);
			}

			return { success: true, cohortId: args.cohortId };
		} catch (error) {
			// Mark as error state
			if (existingCache) {
				await ctx.db.patch(existingCache._id, {
					refreshStatus: 'error',
					refreshError: error instanceof Error ? error.message : 'Unknown error'
				});
			}
			throw error;
		}
	}
});

/**
 * Refresh all cohorts' progress caches
 * Called by cron job
 */
export const refreshAllCohorts = internalMutation({
	args: {},
	handler: async (ctx) => {
		// Get all cohorts
		const cohorts = await ctx.db.query('cohort').collect();

		const results = [];
		for (const cohort of cohorts) {
			try {
				// Schedule computation for each cohort
				await ctx.scheduler.runAfter(0, internal.progressCache.computeCohortProgress, {
					cohortId: cohort._id
				});
				results.push({ cohortId: cohort._id, scheduled: true });
			} catch (error) {
				results.push({
					cohortId: cohort._id,
					scheduled: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
			}
		}

		return { refreshedCount: results.filter((r) => r.scheduled).length, results };
	}
});

/**
 * Manual refresh for a specific cohort
 * Callable by admins from the UI
 */
export const manualRefresh = mutation({
	args: { cohortId: v.id('cohort') },
	handler: async (ctx, args) => {
		// Schedule the computation
		await ctx.scheduler.runAfter(0, internal.progressCache.computeCohortProgress, {
			cohortId: args.cohortId
		});

		return { success: true, message: 'Refresh scheduled' };
	}
});

/**
 * Get cached progress stats for a cohort
 * Fast read from pre-computed cache
 */
export const getCachedCohortStats = authQuery({
	args: { cohortId: v.id('cohort') },
	handler: async (ctx, args) => {
		const cache = await ctx.db
			.query('cohortProgressCache')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.first();

		if (!cache) {
			// No cache yet - return null to indicate fresh computation needed
			return null;
		}

		return {
			totalStudents: cache.totalStudents,
			totalQuestions: cache.totalQuestions,
			totalModules: cache.totalModules,
			averageCompletion: cache.averageCompletion,
			lastRefreshedAt: cache.lastRefreshedAt,
			refreshStatus: cache.refreshStatus,
			refreshError: cache.refreshError
		};
	}
});

/**
 * Get cached students with progress for a cohort
 * Fast read from pre-computed cache
 */
export const getCachedStudentsWithProgress = authQuery({
	args: { cohortId: v.id('cohort') },
	handler: async (ctx, args) => {
		const cache = await ctx.db
			.query('cohortProgressCache')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.first();

		if (!cache) {
			return null;
		}

		return {
			students: cache.studentsProgress,
			lastRefreshedAt: cache.lastRefreshedAt,
			refreshStatus: cache.refreshStatus
		};
	}
});

/**
 * Get cached module completion stats for a cohort
 * Fast read from pre-computed cache
 */
export const getCachedModuleCompletion = authQuery({
	args: { cohortId: v.id('cohort') },
	handler: async (ctx, args) => {
		const cache = await ctx.db
			.query('cohortProgressCache')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.first();

		if (!cache) {
			return null;
		}

		return {
			modules: cache.moduleCompletion || [],
			lastRefreshedAt: cache.lastRefreshedAt,
			refreshStatus: cache.refreshStatus
		};
	}
});

/**
 * Get cached top flagged questions for a cohort
 * Fast read from pre-computed cache
 */
export const getCachedFlaggedQuestions = authQuery({
	args: { cohortId: v.id('cohort') },
	handler: async (ctx, args) => {
		const cache = await ctx.db
			.query('cohortProgressCache')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.first();

		if (!cache) {
			return null;
		}

		return {
			questions: cache.topFlaggedQuestions || [],
			lastRefreshedAt: cache.lastRefreshedAt,
			refreshStatus: cache.refreshStatus
		};
	}
});

/**
 * Initialize cache for a cohort if it doesn't exist
 * Called when visiting progress page for the first time
 */
export const initializeCacheIfNeeded = mutation({
	args: { cohortId: v.id('cohort') },
	handler: async (ctx, args) => {
		const existingCache = await ctx.db
			.query('cohortProgressCache')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.first();

		if (!existingCache) {
			// Schedule initial computation
			await ctx.scheduler.runAfter(0, internal.progressCache.computeCohortProgress, {
				cohortId: args.cohortId
			});
			return { initialized: true, existed: false };
		}

		return { initialized: false, existed: true };
	}
});
