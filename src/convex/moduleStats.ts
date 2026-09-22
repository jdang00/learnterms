import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { internal } from './_generated/api';

function hasInteraction(
	record: Pick<Doc<'userProgress'>, 'selectedOptions' | 'eliminatedOptions' | 'attempts'>
) {
	return (
		record.attempts > 0 || record.selectedOptions.length > 0 || record.eliminatedOptions.length > 0
	);
}

export async function applyModuleStatsDelta(
	ctx: MutationCtx,
	args: {
		userId: Id<'users'>;
		moduleId: Id<'module'>;
		classId: Id<'class'>;
		interacted: number;
		mastered: number;
		flagged: number;
		activityAt?: number;
	}
) {
	if (!args.interacted && !args.mastered && !args.flagged && args.activityAt === undefined) return;
	const now = Date.now();
	const existing = await ctx.db
		.query('userModuleStats')
		.withIndex('by_user_module', (q) => q.eq('userId', args.userId).eq('moduleId', args.moduleId))
		.unique();
	const lastActivityAt =
		args.activityAt === undefined
			? existing?.lastActivityAt
			: Math.max(existing?.lastActivityAt ?? 0, args.activityAt);

	if (existing) {
		await ctx.db.patch(existing._id, {
			classId: args.classId,
			questionsInteracted: Math.max(0, existing.questionsInteracted + args.interacted),
			questionsMastered: Math.max(0, existing.questionsMastered + args.mastered),
			questionsFlagged: Math.max(0, existing.questionsFlagged + args.flagged),
			lastActivityAt,
			updatedAt: now
		});
		return;
	}
	await ctx.db.insert('userModuleStats', {
		userId: args.userId,
		moduleId: args.moduleId,
		classId: args.classId,
		questionsInteracted: Math.max(0, args.interacted),
		questionsMastered: Math.max(0, args.mastered),
		questionsFlagged: Math.max(0, args.flagged),
		lastActivityAt,
		updatedAt: now
	});
}

/**
 * Rebuilds userModuleStats from userProgress, one (user, class) pair per transaction.
 * Idempotent: each step overwrites the rows for its pair with exact counts, so it is safe
 * to re-run at any time (for example after questions move between modules).
 *
 * Run via CLI: bunx convex run moduleStats:backfillUserModuleStats
 */
export const backfillUserModuleStats = internalMutation({
	args: {
		cursor: v.optional(v.union(v.string(), v.null())),
		classOffset: v.optional(v.number())
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const cursor = args.cursor ?? null;
		const classOffset = args.classOffset ?? 0;
		const page = await ctx.db.query('users').paginate({ cursor, numItems: 1 });
		const user = page.page[0];
		const classes =
			user && !user.deletedAt && user.cohortId
				? (
						await ctx.db
							.query('class')
							.withIndex('by_cohortId', (q) => q.eq('cohortId', user.cohortId!))
							.collect()
					).sort((a, b) => (a._id < b._id ? -1 : 1))
				: [];
		const classDoc = classes[classOffset];

		if (user && classDoc) {
			const records = await ctx.db
				.query('userProgress')
				.withIndex('by_user_class', (q) => q.eq('userId', user._id).eq('classId', classDoc._id))
				.collect();
			type Totals = {
				interacted: number;
				mastered: number;
				flagged: number;
				lastActivityAt?: number;
			};
			const totals = new Map<Id<'module'>, Totals>();
			const questionModule = new Map<Id<'question'>, Id<'module'> | null>();
			for (const record of records) {
				if (record.deletedAt) continue;
				let moduleId = questionModule.get(record.questionId);
				if (moduleId === undefined) {
					moduleId = (await ctx.db.get(record.questionId))?.moduleId ?? null;
					questionModule.set(record.questionId, moduleId);
				}
				if (!moduleId) continue;
				const entry = totals.get(moduleId) ?? { interacted: 0, mastered: 0, flagged: 0 };
				if (hasInteraction(record)) {
					entry.interacted++;
					const at = record.lastAttemptAt ?? record.updatedAt;
					entry.lastActivityAt = Math.max(entry.lastActivityAt ?? 0, at);
				}
				if (record.isMastered) entry.mastered++;
				if (record.isFlagged) entry.flagged++;
				totals.set(moduleId, entry);
			}

			const existingRows = (
				await ctx.db
					.query('userModuleStats')
					.withIndex('by_user_module', (q) => q.eq('userId', user._id))
					.collect()
			).filter((row) => row.classId === classDoc._id);
			const now = Date.now();
			for (const row of existingRows) {
				if (!totals.has(row.moduleId)) await ctx.db.delete(row._id);
			}
			for (const [moduleId, entry] of totals) {
				const fields = {
					classId: classDoc._id,
					questionsInteracted: entry.interacted,
					questionsMastered: entry.mastered,
					questionsFlagged: entry.flagged,
					lastActivityAt: entry.lastActivityAt,
					updatedAt: now
				};
				const row = existingRows.find((existing) => existing.moduleId === moduleId);
				if (row) await ctx.db.patch(row._id, fields);
				else await ctx.db.insert('userModuleStats', { userId: user._id, moduleId, ...fields });
			}
		}

		if (classOffset + 1 < classes.length) {
			await ctx.scheduler.runAfter(0, internal.moduleStats.backfillUserModuleStats, {
				cursor,
				classOffset: classOffset + 1
			});
		} else if (!page.isDone) {
			await ctx.scheduler.runAfter(0, internal.moduleStats.backfillUserModuleStats, {
				cursor: page.continueCursor,
				classOffset: 0
			});
		} else {
			console.log('backfillUserModuleStats complete');
		}
		return null;
	}
});

type StatsDelta = {
	userId: Id<'users'>;
	moduleId: Id<'module'>;
	classId: Id<'class'>;
	interacted: number;
	mastered: number;
	flagged: number;
	activityAt?: number;
};

/**
 * Keeps userModuleStats in step when questions leave a module: pass `target` for a move,
 * omit it for a delete. Deltas are merged per (user, module) so each row is written once.
 */
export async function shiftQuestionStats(
	ctx: MutationCtx,
	questions: Array<{ _id: Id<'question'>; moduleId: Id<'module'> }>,
	target?: { moduleId: Id<'module'>; classId: Id<'class'> }
) {
	if (questions.length === 0) return;
	const moduleClass = new Map<Id<'module'>, Id<'class'> | null>();
	const classFor = async (moduleId: Id<'module'>) => {
		if (!moduleClass.has(moduleId))
			moduleClass.set(moduleId, (await ctx.db.get(moduleId))?.classId ?? null);
		return moduleClass.get(moduleId) ?? null;
	};

	const deltas = new Map<string, StatsDelta>();
	const add = (delta: StatsDelta) => {
		const key = `${delta.userId}:${delta.moduleId}`;
		const existing = deltas.get(key);
		if (!existing) {
			deltas.set(key, delta);
			return;
		}
		existing.interacted += delta.interacted;
		existing.mastered += delta.mastered;
		existing.flagged += delta.flagged;
		if (delta.activityAt !== undefined)
			existing.activityAt = Math.max(existing.activityAt ?? 0, delta.activityAt);
	};

	for (const question of questions) {
		const sourceClassId = await classFor(question.moduleId);
		const records = await ctx.db
			.query('userProgress')
			.withIndex('by_question_user', (q) => q.eq('questionId', question._id))
			.collect();
		for (const record of records) {
			if (record.deletedAt) continue;
			const interacted = hasInteraction(record) ? 1 : 0;
			const mastered = record.isMastered ? 1 : 0;
			const flagged = record.isFlagged ? 1 : 0;
			if (!interacted && !mastered && !flagged) continue;
			if (sourceClassId) {
				add({
					userId: record.userId,
					moduleId: question.moduleId,
					classId: sourceClassId,
					interacted: -interacted,
					mastered: -mastered,
					flagged: -flagged
				});
			}
			if (target) {
				add({
					userId: record.userId,
					moduleId: target.moduleId,
					classId: target.classId,
					interacted,
					mastered,
					flagged,
					activityAt: interacted ? (record.lastAttemptAt ?? record.updatedAt) : undefined
				});
			}
		}
	}

	for (const delta of deltas.values()) {
		await applyModuleStatsDelta(ctx, delta);
	}
}
