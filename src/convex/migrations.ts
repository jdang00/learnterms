import { internalMutation, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { authAdminMutation } from './authQueries';

/**
 * Get stats about questions and userProgress for migration planning (paginated).
 * Run via CLI: bunx convex run migrations:getStats
 */
export const getStats = query({
	args: {
		cursor: v.optional(v.string()),
		type: v.optional(v.union(v.literal('questions'), v.literal('progress')))
	},
	handler: async (ctx, args) => {
		const type = args.type ?? 'questions';
		const batchSize = 1000;

		if (type === 'questions') {
			const { page, isDone, continueCursor } = await ctx.db
				.query('question')
				.paginate({ cursor: args.cursor ?? null, numItems: batchSize });

			const withFlagCount = page.filter((q) => q.flagCount !== undefined && q.flagCount !== null);
			const needingBackfill = page.filter(
				(q) => q.flagCount === undefined || q.flagCount === null
			);

			return {
				type: 'questions',
				batchCount: page.length,
				withFlagCount: withFlagCount.length,
				needingBackfill: needingBackfill.length,
				done: isDone,
				cursor: continueCursor
			};
		} else {
			const { page, isDone, continueCursor } = await ctx.db
				.query('userProgress')
				.paginate({ cursor: args.cursor ?? null, numItems: batchSize });

			const flagged = page.filter((p) => p.isFlagged === true);

			return {
				type: 'progress',
				batchCount: page.length,
				flaggedCount: flagged.length,
				done: isDone,
				cursor: continueCursor
			};
		}
	}
});

/**
 * Find a class by name (for debugging/lookups).
 * Run via CLI: bunx convex run migrations:findClassByName '{"name": "Ocular Disease"}'
 */
export const findClassByName = query({
	args: {
		search: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const classes = await ctx.db.query('class').collect();
		if (!args.search) {
			// Return all classes if no search provided
			return classes.map((c) => ({
				id: c._id,
				name: c.name
			}));
		}
		const searchLower = args.search!.toLowerCase();
		const matches = classes.filter(
			(c) => c.name && c.name.toLowerCase().includes(searchLower)
		);
		return matches.map((c) => ({
			id: c._id,
			name: c.name
		}));
	}
});

/**
 * Backfill flagCount for all questions based on existing userProgress records.
 * Run via CLI: bunx convex run migrations:backfillFlagCounts
 *
 * This processes questions in batches to avoid timeouts.
 * Run multiple times if needed until it returns { done: true }.
 */
export const backfillFlagCounts = mutation({
	args: {
		batchSize: v.optional(v.number()),
		cursor: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const batchSize = args.batchSize ?? 100;

		// Get all questions, paginated
		const {
			page: questions,
			isDone,
			continueCursor
		} = await ctx.db
			.query('question')
			.paginate({ cursor: args.cursor ?? null, numItems: batchSize });

		if (questions.length === 0) {
			return { done: true, processed: 0, message: 'No more questions to process' };
		}

		let processed = 0;
		let updated = 0;

		for (const question of questions) {
			// Count flagged userProgress records for this question
			const flaggedRecords = await ctx.db
				.query('userProgress')
				.withIndex('by_question_user', (q) => q.eq('questionId', question._id))
				.filter((q) => q.eq(q.field('isFlagged'), true))
				.collect();

			const flagCount = flaggedRecords.length;

			// Only update if flagCount differs or wasn't set
			if (question.flagCount !== flagCount) {
				await ctx.db.patch(question._id, { flagCount });
				updated++;
			}

			processed++;
		}

		return {
			done: isDone,
			cursor: continueCursor,
			processed,
			updated,
			message: `Processed ${processed} questions, updated ${updated} flagCounts`
		};
	}
});

/**
 * Backfill all questions in one go (for smaller datasets).
 * Run via CLI: bunx convex run migrations:backfillAllFlagCounts
 *
 * WARNING: May timeout on large datasets. Use backfillFlagCounts for large datasets.
 */
export const backfillAllFlagCounts = mutation({
	args: {},
	handler: async (ctx) => {
		// Get all questions
		const questions = await ctx.db.query('question').collect();

		// Get all flagged userProgress records
		const allProgress = await ctx.db
			.query('userProgress')
			.filter((q) => q.eq(q.field('isFlagged'), true))
			.collect();

		// Count flags per question
		const flagCounts = new Map<string, number>();
		for (const progress of allProgress) {
			const questionId = progress.questionId;
			flagCounts.set(questionId, (flagCounts.get(questionId) ?? 0) + 1);
		}

		let updated = 0;

		// Update each question with its flagCount
		for (const question of questions) {
			const flagCount = flagCounts.get(question._id) ?? 0;

			// Only update if flagCount differs or wasn't set
			if (question.flagCount !== flagCount) {
				await ctx.db.patch(question._id, { flagCount });
				updated++;
			}
		}

		return {
			totalQuestions: questions.length,
			totalFlaggedProgress: allProgress.length,
			updated,
			message: `Backfilled ${updated} questions with flagCounts`
		};
	}
});

/**
 * Reset all flagCounts to 0 (utility for testing).
 * Run via CLI: bunx convex run migrations:resetFlagCounts
 */
export const resetFlagCounts = mutation({
	args: {},
	handler: async (ctx) => {
		const questions = await ctx.db.query('question').collect();

		let updated = 0;
		for (const question of questions) {
			if (question.flagCount !== 0 && question.flagCount !== undefined) {
				await ctx.db.patch(question._id, { flagCount: 0 });
				updated++;
			}
		}

		return {
			totalQuestions: questions.length,
			reset: updated,
			message: `Reset ${updated} questions to flagCount=0`
		};
	}
});

/**
 * Update all questions in a specific class to have a specific author.
 * Run via CLI: bunx convex run migrations:updateQuestionAuthorForClass --classId "jn78h93750gr8svhbfrys3fcb57pbp8v" --firstName "Brayden" --lastName "Dyer"
 */
export const updateQuestionAuthorForClass = mutation({
	args: {
		classId: v.id('class'),
		firstName: v.string(),
		lastName: v.string()
	},
	handler: async (ctx, args) => {
		// Get all modules for this class
		const modules = await ctx.db
			.query('module')
			.withIndex('by_classId', (q) => q.eq('classId', args.classId))
			.collect();

		if (modules.length === 0) {
			return {
				modulesFound: 0,
				questionsUpdated: 0,
				message: 'No modules found for this class'
			};
		}

		let totalUpdated = 0;

		// For each module, get all questions and update their author
		for (const module of modules) {
			const questions = await ctx.db
				.query('question')
				.withIndex('by_moduleId', (q) => q.eq('moduleId', module._id))
				.collect();

			for (const question of questions) {
				await ctx.db.patch(question._id, {
					createdBy: {
						firstName: args.firstName,
						lastName: args.lastName
					},
					updatedAt: Date.now()
				});
				totalUpdated++;
			}
		}

		return {
			modulesFound: modules.length,
			questionsUpdated: totalUpdated,
			message: `Updated ${totalUpdated} questions across ${modules.length} modules to be authored by ${args.firstName} ${args.lastName}`
		};
	}
});

/**
 * Find a cohort by name (for debugging/lookups).
 * Run via CLI: bunx convex run migrations:findCohortByName '{"search": "NSUOCO"}'
 */
export const findCohortByName = query({
	args: {
		search: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const cohorts = await ctx.db.query('cohort').collect();

		// Get school names for context
		const schools = await ctx.db.query('school').collect();
		const schoolMap = new Map(schools.map((s) => [s._id, s.name]));

		const formatCohort = (c: (typeof cohorts)[0]) => ({
			id: c._id,
			name: c.name,
			school: schoolMap.get(c.schoolId) ?? 'Unknown',
			hasStats: !!c.stats
		});

		if (!args.search) {
			return cohorts.map(formatCohort);
		}

		const searchLower = args.search.toLowerCase();
		const matches = cohorts.filter(
			(c) =>
				(c.name && c.name.toLowerCase().includes(searchLower)) ||
				(schoolMap.get(c.schoolId)?.toLowerCase().includes(searchLower) ?? false)
		);
		return matches.map(formatCohort);
	}
});

/**
 * Backfill cohort stats (totalStudents, totalQuestions, totalModules, averageCompletion).
 * Run via CLI: bunx convex run migrations:backfillCohortStats '{"cohortId": "..."}'
 *
 * This computes stats by iterating through all users and their progress.
 * For large cohorts, this may take time but should complete within Convex limits.
 */
export const backfillCohortStats = mutation({
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
				totalQuestions += module.questionCount ?? 0;
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
							(r) => r.selectedOptions.length > 0 || r.eliminatedOptions.length > 0
						).length;
					}
					totalProgressSum += (studentInteracted / totalQuestions) * 100;
				}
			}
		}

		const averageCompletion =
			totalStudents > 0 ? Math.round(totalProgressSum / totalStudents) : 0;

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
 * Backfill user progress stats for a cohort (paginated).
 * Run via CLI: bunx convex run migrations:backfillUserProgressStats '{"cohortId": "..."}'
 *
 * Processes users in batches to avoid timeouts.
 * Run multiple times if needed until it returns { done: true }.
 */
export const backfillUserProgressStats = mutation({
	args: {
		cohortId: v.id('cohort'),
		batchSize: v.optional(v.number()),
		cursor: v.optional(v.string())
	},
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
				totalQuestionsInCohort += module.questionCount ?? 0;
			}
		}

		// Get users in cohort, paginated
		const {
			page: users,
			isDone,
			continueCursor
		} = await ctx.db
			.query('users')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.paginate({ cursor: args.cursor ?? null, numItems: batchSize });

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

/**
 * Get all cohorts and their progress stats backfill status.
 * Run via CLI: bunx convex run migrations:getAllCohortsStatus --prod
 *
 * Returns information about each cohort and whether it has stats backfilled.
 */
export const getAllCohortsStatus = query({
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
					needsBackfill:
						!cohort.stats || studentsWithStats.length < students.length
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
 * Run via CLI: bunx convex run migrations:backfillAllCohortsStats --prod
 *
 * This will backfill cohort-level stats for all cohorts.
 * Note: User-level stats must be backfilled separately using backfillUserProgressStatsForAllCohorts
 * because it requires pagination.
 */
export const backfillAllCohortsStats = mutation({
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
					totalQuestions += module.questionCount ?? 0;
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
								(r) => r.selectedOptions.length > 0 || r.eliminatedOptions.length > 0
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
 * Run via CLI: bunx convex run migrations:getNextCohortForUserBackfill --prod
 */
export const getNextCohortForUserBackfill = query({
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

export const bootstrapAdmin = authAdminMutation({
	args: {
		clerkUserId: v.string()
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
			.first();

		if (!user) throw new Error('User not found');

		await ctx.db.patch(user._id, { role: 'admin', updatedAt: Date.now() });
		return { success: true, userId: user._id };
	}
});

export const bootstrapDev = authAdminMutation({
	args: {
		clerkUserId: v.string()
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
			.first();

		if (!user) throw new Error('User not found');

		await ctx.db.patch(user._id, { role: 'dev', updatedAt: Date.now() });
		return { success: true, userId: user._id };
	}
});

/**
 * Clear the deprecated `plan` field from all users.
 * Pro status is now determined by Polar subscription status.
 *
 * Run via CLI: bunx convex run migrations:clearPlanField
 * After running, you can remove the `plan` field from schema.ts
 */
export const clearPlanField = mutation({
	args: {
		batchSize: v.optional(v.number()),
		cursor: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const batchSize = args.batchSize ?? 100;

		const {
			page: users,
			isDone,
			continueCursor
		} = await ctx.db
			.query('users')
			.paginate({ cursor: args.cursor ?? null, numItems: batchSize });

		let processed = 0;
		let cleared = 0;

		for (const user of users) {
			processed++;
			// Check if user has a plan field set
			if ((user as any).plan !== undefined) {
				await ctx.db.patch(user._id, { plan: undefined } as any);
				cleared++;
			}
		}

		return {
			done: isDone,
			cursor: continueCursor,
			processed,
			cleared,
			message: `Processed ${processed} users, cleared plan from ${cleared}`
		};
	}
});
