import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { publishedQuestionCount } from '../moduleStats';
import { pagedArgs, scheduleNextPage } from './shared';

/**
 * Backfill cohort stats (totalStudents, totalQuestions, totalModules, averageCompletion).
 * Run via CLI: bunx convex run migrations/progressStats:backfillCohortStats '{"cohortId": "..."}'
 *
 * This computes stats by iterating through all users and their progress.
 * For large cohorts, this may take time but should complete within Convex limits.
 */
export const backfillCohortStats = internalMutation({
	args: {
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		const cohort = await ctx.db.get(args.cohortId);
		if (!cohort) {
			return { error: 'Cohort not found' };
		}

		// Get all students in cohort
		const students = await ctx.db
			.query('users')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.filter((q) => q.eq(q.field('deletedAt'), undefined))
			.collect();

		const totalStudents = students.length;

		// Get all classes in cohort
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
				totalQuestions += publishedQuestionCount(module);
			}
		}

		// Calculate average completion (this is expensive but done once)
		let totalProgressSum = 0;

		if (totalQuestions > 0 && totalStudents > 0) {
			for (const student of students) {
				// Use precomputed progressStats if available
				if (student.progressStats) {
					const pct =
						student.progressStats.totalQuestions > 0
							? (student.progressStats.questionsInteracted / student.progressStats.totalQuestions) *
								100
							: 0;
					totalProgressSum += pct;
				} else {
					// Fallback: compute from userProgress (expensive)
					let studentInteracted = 0;
					for (const classItem of classes) {
						const progressRecords = await ctx.db
							.query('userProgress')
							.withIndex('by_user_class', (q) =>
								q.eq('userId', student._id).eq('classId', classItem._id)
							)
							.collect();

						studentInteracted += progressRecords.filter(
							(r) =>
								r.attempts > 0 || r.selectedOptions.length > 0 || r.eliminatedOptions.length > 0
						).length;
					}
					totalProgressSum += (studentInteracted / totalQuestions) * 100;
				}
			}
		}

		const averageCompletion = totalStudents > 0 ? Math.round(totalProgressSum / totalStudents) : 0;

		// Update cohort with stats
		await ctx.db.patch(args.cohortId, {
			stats: {
				totalStudents,
				totalQuestions,
				totalModules,
				averageCompletion,
				updatedAt: Date.now()
			}
		});

		return {
			cohortName: cohort.name,
			stats: {
				totalStudents,
				totalQuestions,
				totalModules,
				averageCompletion
			},
			message: `Backfilled stats for cohort "${cohort.name}"`
		};
	}
});

/**
 * Get all cohorts and their progress stats backfill status.
 * Run via CLI: bunx convex run migrations/progressStats:getAllCohortsStatus --prod
 *
 * Returns information about each cohort and whether it has stats backfilled.
 */
export const getAllCohortsStatus = internalQuery({
	args: {},
	handler: async (ctx) => {
		const cohorts = await ctx.db.query('cohort').collect();
		const schools = await ctx.db.query('school').collect();
		const schoolMap = new Map(schools.map((s) => [s._id, s.name]));

		const cohortStatus = await Promise.all(
			cohorts.map(async (cohort) => {
				// Count students
				const students = await ctx.db
					.query('users')
					.withIndex('by_cohortId', (q) => q.eq('cohortId', cohort._id))
					.filter((q) => q.eq(q.field('deletedAt'), undefined))
					.collect();

				// Count students with progressStats
				const studentsWithStats = students.filter((u) => u.progressStats !== undefined);

				// Count classes
				const classes = await ctx.db
					.query('class')
					.withIndex('by_cohortId', (q) => q.eq('cohortId', cohort._id))
					.collect();

				return {
					cohortId: cohort._id,
					cohortName: cohort.name,
					schoolName: schoolMap.get(cohort.schoolId) ?? 'Unknown',
					hasCohortStats: !!cohort.stats,
					totalStudents: students.length,
					studentsWithProgressStats: studentsWithStats.length,
					totalClasses: classes.length,
					needsBackfill: !cohort.stats || studentsWithStats.length < students.length
				};
			})
		);

		return {
			total: cohorts.length,
			cohorts: cohortStatus.sort((a, b) => a.cohortName.localeCompare(b.cohortName))
		};
	}
});

/**
 * Backfill progress stats for ALL cohorts (orchestrator).
 * Run via CLI: bunx convex run migrations/progressStats:backfillAllCohortsStats --prod
 *
 * This will backfill cohort-level stats for all cohorts.
 * Note: User-level stats must be backfilled separately using backfillUserProgressStatsForAllCohorts
 * because it requires pagination.
 */
export const backfillAllCohortsStats = internalMutation({
	args: {},
	handler: async (ctx) => {
		const cohorts = await ctx.db.query('cohort').collect();

		const results = [];

		for (const cohort of cohorts) {
			// Get all students in cohort
			const students = await ctx.db
				.query('users')
				.withIndex('by_cohortId', (q) => q.eq('cohortId', cohort._id))
				.filter((q) => q.eq(q.field('deletedAt'), undefined))
				.collect();

			const totalStudents = students.length;

			// Get all classes in cohort
			const classes = await ctx.db
				.query('class')
				.withIndex('by_cohortId', (q) => q.eq('cohortId', cohort._id))
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
					totalQuestions += publishedQuestionCount(module);
				}
			}

			// Calculate average completion
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
					} else {
						// Fallback: compute from userProgress (expensive)
						let studentInteracted = 0;
						for (const classItem of classes) {
							const progressRecords = await ctx.db
								.query('userProgress')
								.withIndex('by_user_class', (q) =>
									q.eq('userId', student._id).eq('classId', classItem._id)
								)
								.collect();

							studentInteracted += progressRecords.filter(
								(r) =>
									r.attempts > 0 || r.selectedOptions.length > 0 || r.eliminatedOptions.length > 0
							).length;
						}
						totalProgressSum += totalQuestions > 0 ? (studentInteracted / totalQuestions) * 100 : 0;
					}
				}
			}

			const averageCompletion =
				totalStudents > 0 ? Math.round(totalProgressSum / totalStudents) : 0;

			// Update cohort with stats
			await ctx.db.patch(cohort._id, {
				stats: {
					totalStudents,
					totalQuestions,
					totalModules,
					averageCompletion,
					updatedAt: Date.now()
				}
			});

			results.push({
				cohortId: cohort._id,
				cohortName: cohort.name,
				stats: {
					totalStudents,
					totalQuestions,
					totalModules,
					averageCompletion
				}
			});
		}

		return {
			totalCohorts: cohorts.length,
			results,
			message: `Backfilled cohort stats for ${cohorts.length} cohorts`
		};
	}
});

/**
 * Get the next cohort that needs user progress stats backfilled.
 * Run via CLI: bunx convex run migrations/progressStats:getNextCohortForUserBackfill --prod
 */
export const getNextCohortForUserBackfill = internalQuery({
	args: {},
	handler: async (ctx) => {
		const cohorts = await ctx.db.query('cohort').collect();

		for (const cohort of cohorts) {
			const students = await ctx.db
				.query('users')
				.withIndex('by_cohortId', (q) => q.eq('cohortId', cohort._id))
				.filter((q) => q.eq(q.field('deletedAt'), undefined))
				.collect();

			const studentsWithoutStats = students.filter((u) => !u.progressStats);

			if (studentsWithoutStats.length > 0) {
				return {
					cohortId: cohort._id,
					cohortName: cohort.name,
					totalStudents: students.length,
					studentsNeedingBackfill: studentsWithoutStats.length
				};
			}
		}

		return {
			message: 'All cohorts have user progress stats backfilled!',
			done: true
		};
	}
});

/**
 * Backfill user progress stats for a cohort (paginated).
 * Run via CLI: bunx convex run migrations/progressStats:backfillUserProgressStats '{"cohortId": "..."}'
 *
 * Processes users in batches to avoid timeouts.
 * Schedules its next page automatically unless continueAutomatically is false.
 */
export const backfillUserProgressStats = internalMutation({
	args: { cohortId: v.id('cohort'), ...pagedArgs },
	handler: async (ctx, args) => {
		const batchSize = args.batchSize ?? 20; // Smaller batch due to expensive per-user computation

		const cohort = await ctx.db.get(args.cohortId);
		if (!cohort) {
			return { error: 'Cohort not found', done: true };
		}

		// Get all classes in cohort (needed for each user)
		const classes = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		const classIds = classes.map((c) => c._id);

		// Get total questions in cohort
		let totalQuestionsInCohort = 0;
		for (const classItem of classes) {
			const modules = await ctx.db
				.query('module')
				.withIndex('by_classId', (q) => q.eq('classId', classItem._id))
				.collect();

			for (const module of modules) {
				totalQuestionsInCohort += publishedQuestionCount(module);
			}
		}

		// Get users in cohort, paginated
		const page = await ctx.db
			.query('users')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.paginate({ cursor: args.cursor ?? null, numItems: batchSize });
		const { page: users, isDone, continueCursor } = page;
		await scheduleNextPage(
			ctx,
			internal.migrations.progressStats.backfillUserProgressStats,
			args,
			page
		);

		// Filter out deleted users
		const activeUsers = users.filter((u) => !u.deletedAt);

		if (activeUsers.length === 0) {
			return {
				done: isDone,
				cursor: continueCursor,
				processed: 0,
				updated: 0,
				message: 'No active users in this batch'
			};
		}

		let processed = 0;
		let updated = 0;

		for (const user of activeUsers) {
			let totalInteracted = 0;
			let totalMastered = 0;
			let lastActivityAt: number | undefined = undefined;

			// Get progress across all classes in cohort
			for (const classId of classIds) {
				const progressRecords = await ctx.db
					.query('userProgress')
					.withIndex('by_user_class', (q) => q.eq('userId', user._id).eq('classId', classId))
					.collect();

				for (const record of progressRecords) {
					if (
						record.attempts > 0 ||
						record.selectedOptions.length > 0 ||
						record.eliminatedOptions.length > 0
					) {
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

			// Update user with progress stats
			await ctx.db.patch(user._id, {
				progressStats: {
					questionsInteracted: totalInteracted,
					questionsMastered: totalMastered,
					totalQuestions: totalQuestionsInCohort,
					lastActivityAt,
					updatedAt: Date.now()
				}
			});

			processed++;
			updated++;
		}

		return {
			done: isDone,
			cursor: continueCursor,
			processed,
			updated,
			totalQuestionsInCohort,
			message: `Processed ${processed} users, updated ${updated} progressStats`
		};
	}
});

type CohortStatsResult = {
	results: { cohortId: Id<'cohort'>; cohortName: string }[];
};
type UserStatsPage = { done: boolean; cursor?: string; processed?: number };

/**
 * Backfill every cohort's stats and every user's progress stats in one run.
 * Replaces the old shell loop. Run via CLI: bunx convex run migrations/progressStats:backfillAllProgressStats --prod
 */
export const backfillAllProgressStats = internalAction({
	args: {},
	handler: async (
		ctx
	): Promise<{ cohorts: number; users: { cohortName: string; processed: number }[] }> => {
		const cohorts = (await ctx.runMutation(
			internal.migrations.progressStats.backfillAllCohortsStats,
			{}
		)) as CohortStatsResult;
		const users: { cohortName: string; processed: number }[] = [];
		for (const cohort of cohorts.results) {
			let cursor: string | undefined;
			let processed = 0;
			for (;;) {
				const page = (await ctx.runMutation(
					internal.migrations.progressStats.backfillUserProgressStats,
					{ cohortId: cohort.cohortId, cursor, continueAutomatically: false }
				)) as UserStatsPage;
				processed += page.processed ?? 0;
				if (page.done || !page.cursor) break;
				cursor = page.cursor;
			}
			users.push({ cohortName: cohort.cohortName, processed });
		}
		return { cohorts: cohorts.results.length, users };
	}
});
