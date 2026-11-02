import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { authQuery } from './authQueries';
import { requireCohortStaff } from './access';
import { publishedQuestionCount } from './moduleStats';

// Who is studying which module, read from userModuleStats (one row per student per module).
// Every saved answer bumps the row's lastActivityAt, so a range on that field is a cheap,
// reactive "recently studied" read.

const RECENT_ROW_CAP_PER_CLASS = 2000;
const CLASS_ROW_CAP = 8000;
const MODULE_ROW_CAP = 2000;

const studyRowValidator = v.object({
	userId: v.id('users'),
	moduleId: v.id('module'),
	classId: v.id('class'),
	questionsInteracted: v.number(),
	lastActivityAt: v.union(v.number(), v.null())
});

async function cohortStudentIds(ctx: QueryCtx, cohortId: Id<'cohort'>) {
	const members = await ctx.db
		.query('users')
		.withIndex('by_cohortId', (q) => q.eq('cohortId', cohortId))
		.collect();
	return new Set(members.filter((member) => !member.deletedAt).map((member) => member._id));
}

async function requireCohortClass(ctx: QueryCtx, cohortId: Id<'cohort'>, classId: Id<'class'>) {
	const classItem = await ctx.db.get(classId);
	if (!classItem || classItem.deletedAt || classItem.cohortId !== cohortId) {
		throw new Error('Class is not part of the selected cohort');
	}
	return classItem;
}

function toStudyRow(row: Doc<'userModuleStats'>) {
	return {
		userId: row.userId,
		moduleId: row.moduleId,
		classId: row.classId,
		questionsInteracted: row.questionsInteracted,
		lastActivityAt: row.lastActivityAt ?? null
	};
}

/**
 * Student-module pairs studied in [since, until). The dashboard subscribes with `since` at the
 * start of the current hour (small and live) and fetches the closed week before it once an hour.
 */
export const getRecentModuleActivity = authQuery({
	args: { cohortId: v.id('cohort'), since: v.number(), until: v.optional(v.number()) },
	returns: v.object({ truncated: v.boolean(), rows: v.array(studyRowValidator) }),
	handler: async (ctx, args) => {
		await requireCohortStaff(ctx, args.cohortId);
		const studentIds = await cohortStudentIds(ctx, args.cohortId);
		const classes = await ctx.db
			.query('class')
			.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
			.collect();

		let truncated = false;
		const rows: ReturnType<typeof toStudyRow>[] = [];
		for (const classItem of classes) {
			if (classItem.deletedAt) continue;
			const recent = await ctx.db
				.query('userModuleStats')
				.withIndex('by_classId_and_lastActivityAt', (q) => {
					const lower = q.eq('classId', classItem._id).gte('lastActivityAt', args.since);
					return args.until === undefined ? lower : lower.lt('lastActivityAt', args.until);
				})
				.order('desc')
				.take(RECENT_ROW_CAP_PER_CLASS);
			if (recent.length === RECENT_ROW_CAP_PER_CLASS) truncated = true;
			for (const row of recent) {
				if (studentIds.has(row.userId) && row.questionsInteracted > 0) rows.push(toStudyRow(row));
			}
		}
		return { truncated, rows };
	}
});

/** Every student-module row in one class, for the class grid. Fetched as a snapshot. */
export const getClassModuleGrid = authQuery({
	args: { cohortId: v.id('cohort'), classId: v.id('class') },
	returns: v.object({ truncated: v.boolean(), rows: v.array(studyRowValidator) }),
	handler: async (ctx, args) => {
		await requireCohortStaff(ctx, args.cohortId);
		await requireCohortClass(ctx, args.cohortId, args.classId);
		const studentIds = await cohortStudentIds(ctx, args.cohortId);
		const rows = await ctx.db
			.query('userModuleStats')
			.withIndex('by_classId_and_lastActivityAt', (q) => q.eq('classId', args.classId))
			.take(CLASS_ROW_CAP);
		return {
			truncated: rows.length === CLASS_ROW_CAP,
			rows: rows
				.filter((row) => studentIds.has(row.userId) && row.questionsInteracted > 0)
				.map(toStudyRow)
		};
	}
});

/** One module and every student's row in it. Reactive: only answers in this module re-run it. */
export const getModuleRoster = authQuery({
	args: { cohortId: v.id('cohort'), moduleId: v.id('module') },
	returns: v.object({
		module: v.object({
			_id: v.id('module'),
			title: v.string(),
			emoji: v.union(v.string(), v.null()),
			status: v.string(),
			classId: v.id('class'),
			className: v.string(),
			totalQuestions: v.number()
		}),
		rows: v.array(
			v.object({
				userId: v.id('users'),
				questionsInteracted: v.number(),
				questionsFlagged: v.number(),
				lastActivityAt: v.union(v.number(), v.null())
			})
		)
	}),
	handler: async (ctx, args) => {
		await requireCohortStaff(ctx, args.cohortId);
		const module = await ctx.db.get(args.moduleId);
		if (!module || module.deletedAt) throw new Error('Module not found');
		const classItem = await requireCohortClass(ctx, args.cohortId, module.classId);
		const studentIds = await cohortStudentIds(ctx, args.cohortId);
		const rows = await ctx.db
			.query('userModuleStats')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', args.moduleId))
			.take(MODULE_ROW_CAP);
		return {
			module: {
				_id: module._id,
				title: module.title,
				emoji: module.emoji ?? null,
				status: module.status,
				classId: classItem._id,
				className: classItem.name,
				totalQuestions: publishedQuestionCount(module)
			},
			rows: rows
				.filter(
					(row) =>
						studentIds.has(row.userId) && (row.questionsInteracted > 0 || row.questionsFlagged > 0)
				)
				.map((row) => ({
					userId: row.userId,
					questionsInteracted: row.questionsInteracted,
					questionsFlagged: row.questionsFlagged,
					lastActivityAt: row.lastActivityAt ?? null
				}))
		};
	}
});
