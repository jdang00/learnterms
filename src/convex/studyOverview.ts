import { v } from 'convex/values';
import { query } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { requireCurrentUser } from './access';

const MAX_CLASSES = 100;
const MAX_MODULES_PER_CLASS = 300;
const MAX_STAT_ROWS = 5000;
const RECENT_LIMIT = 4;

const moduleProgressValidator = v.object({
	moduleId: v.id('module'),
	emoji: v.optional(v.string()),
	total: v.number(),
	answered: v.number(),
	mastered: v.number(),
	flagged: v.number()
});

const recentModuleValidator = v.object({
	moduleId: v.id('module'),
	moduleTitle: v.string(),
	moduleEmoji: v.optional(v.string()),
	classId: v.id('class'),
	classCode: v.string(),
	progress: v.number(),
	remaining: v.number(),
	lastActivityAt: v.number()
});

/**
 * The viewer's progress across their cohort's classes, for the /classes page.
 * Reads only the userModuleStats rollup and module docs (using the stored questionCount),
 * never raw userProgress or question rows, so the cost stays flat as students answer more.
 */
export const getMine = query({
	args: {},
	returns: v.object({
		classes: v.array(
			v.object({
				classId: v.id('class'),
				modules: v.array(moduleProgressValidator)
			})
		),
		recent: v.array(recentModuleValidator)
	}),
	handler: async (ctx) => {
		const user = await requireCurrentUser(ctx);
		const cohortId = user.cohortId;
		if (!cohortId) return { classes: [], recent: [] };

		const [classes, statRows] = await Promise.all([
			ctx.db
				.query('class')
				.withIndex('by_cohortId', (q) => q.eq('cohortId', cohortId))
				.take(MAX_CLASSES),
			ctx.db
				.query('userModuleStats')
				.withIndex('by_user_module', (q) => q.eq('userId', user._id))
				.take(MAX_STAT_ROWS)
		]);
		const stats = new Map(statRows.map((row) => [row.moduleId, row]));

		type Recent = typeof recentModuleValidator.type;
		const recentFor = (
			classDoc: Doc<'class'>,
			moduleDoc: Doc<'module'>,
			total: number,
			answered: number,
			at: number
		): Recent => ({
			moduleId: moduleDoc._id,
			moduleTitle: moduleDoc.title,
			moduleEmoji: moduleDoc.emoji,
			classId: classDoc._id,
			classCode: classDoc.code,
			progress: total ? Math.round((answered / total) * 100) : 0,
			remaining: Math.max(0, total - answered),
			lastActivityAt: at
		});

		const allRecent: Recent[] = [];
		const summaries = await Promise.all(
			classes
				.filter((classDoc) => !classDoc.deletedAt)
				.map(async (classDoc) => {
					const moduleDocs = await ctx.db
						.query('module')
						.withIndex('by_classId', (q) => q.eq('classId', classDoc._id))
						.take(MAX_MODULES_PER_CLASS);
					const published = moduleDocs
						.filter((m) => !m.deletedAt && m.status === 'published')
						.sort((a, b) => a.order - b.order);

					const modules = published.map((moduleDoc) => {
						const row = stats.get(moduleDoc._id);
						const total = moduleDoc.questionCount ?? 0;
						const answered = Math.min(total, row?.questionsInteracted ?? 0);
						if (row?.lastActivityAt && answered > 0) {
							allRecent.push(recentFor(classDoc, moduleDoc, total, answered, row.lastActivityAt));
						}
						return {
							moduleId: moduleDoc._id,
							emoji: moduleDoc.emoji,
							total,
							answered,
							mastered: Math.min(total, row?.questionsMastered ?? 0),
							flagged: row?.questionsFlagged ?? 0
						};
					});
					return { classId: classDoc._id, modules };
				})
		);

		return {
			classes: summaries,
			recent: allRecent.sort((a, b) => b.lastActivityAt - a.lastActivityAt).slice(0, RECENT_LIMIT)
		};
	}
});
