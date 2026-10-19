import { v } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import { authMutation, authQuery } from '../authQueries';
import { requireClassAccess } from '../access';
import { applyLargeQuizSubmissionDeltaAndEvaluateBadges } from '../badgeEngine';
import {
	clampInt,
	computeAttemptCounters,
	isFitbType,
	normalizeQuestionType,
	redactAttemptItemForRunner,
	scoreAttemptItem
} from './scoring';
import {
	MAX_PATCH_CHANGES,
	isClassDoc,
	isModuleDoc,
	nowTs,
	requireAttemptOwner,
	type AttemptStatus
} from './shared';

export const getAttemptRunnerBundle = authQuery({
	args: { attemptId: v.id('quizAttempts') },
	handler: async (ctx, args) => {
		const user = ctx.user;
		const attempt = await requireAttemptOwner(ctx, user, args.attemptId);
		await requireClassAccess(ctx, user, attempt.classId);

		const items = (await ctx.db
			.query('quizAttemptItems')
			.withIndex('by_attempt_order', (q) => q.eq('attemptId', args.attemptId))
			.collect()) as Doc<'quizAttemptItems'>[];

		const classDoc = (await ctx.db.get(attempt.classId)) as Doc<'class'> | null;
		const modules = await Promise.all(
			Array.from(new Set(items.map((item) => item.moduleId))).map(async (moduleId) => {
				const module = await ctx.db.get(moduleId);
				return module ? { _id: module._id, title: module.title, emoji: module.emoji } : null;
			})
		);

		return {
			attempt: {
				_id: attempt._id,
				classId: attempt.classId,
				className: isClassDoc(classDoc) ? classDoc.name : 'Class',
				status: attempt.status as AttemptStatus,
				startedAt: attempt.startedAt,
				lastActivityAt: attempt.lastActivityAt,
				submittedAt: attempt.submittedAt,
				elapsedMs: attempt.elapsedMs,
				timeLimitSec: attempt.timeLimitSec,
				timeExpiredAt: attempt.timeExpiredAt,
				progressCounters: attempt.progressCounters,
				configSnapshot: attempt.configSnapshot
			},
			modules: modules.filter(Boolean),
			items: items.map(redactAttemptItemForRunner)
		};
	}
});

export const patchAttemptResponses = authMutation({
	args: {
		attemptId: v.id('quizAttempts'),
		elapsedMs: v.optional(v.number()),
		changes: v.array(
			v.object({
				itemId: v.id('quizAttemptItems'),
				selectedOptions: v.optional(v.array(v.string())),
				textResponse: v.optional(v.string()),
				isFlagged: v.optional(v.boolean()),
				markVisited: v.optional(v.boolean()),
				timeSpentDeltaMs: v.optional(v.number())
			})
		)
	},
	handler: async (ctx, args) => {
		if (args.changes.length > MAX_PATCH_CHANGES) {
			throw new Error('Too many changes in one patch');
		}

		const user = ctx.user;
		const attempt = await requireAttemptOwner(ctx, user, args.attemptId);
		if (attempt.status !== 'in_progress') {
			throw new Error('Attempt is not editable');
		}

		const now = nowTs();
		const elapsedMsArg =
			args.elapsedMs !== undefined
				? Math.max(0, clampInt(args.elapsedMs, 0, 7 * 24 * 60 * 60 * 1000))
				: undefined;

		for (const change of args.changes) {
			const item = (await ctx.db.get(change.itemId)) as Doc<'quizAttemptItems'> | null;
			if (!item) continue;
			if (item.attemptId !== args.attemptId || item.userId !== user._id) {
				throw new Error('Invalid attempt item');
			}

			const nextResponse = { ...item.response };
			if (change.selectedOptions !== undefined) {
				nextResponse.selectedOptions = change.selectedOptions;
			}
			if (change.textResponse !== undefined) {
				nextResponse.textResponse = change.textResponse;
			}
			if (change.isFlagged !== undefined) {
				nextResponse.isFlagged = change.isFlagged;
			}
			if (change.markVisited && nextResponse.visitedAt === undefined) {
				nextResponse.visitedAt = now;
			}
			if (change.timeSpentDeltaMs !== undefined) {
				const delta = clampInt(change.timeSpentDeltaMs, 0, 10 * 60_000);
				nextResponse.timeSpentMs = Math.max(0, (nextResponse.timeSpentMs ?? 0) + delta);
			}

			const fitb = isFitbType(item.questionSnapshot.type);
			if (fitb && change.textResponse !== undefined) {
				nextResponse.selectedOptions = change.textResponse ? [change.textResponse] : [];
			}

			const answerPresent = fitb
				? String(nextResponse.textResponse ?? nextResponse.selectedOptions[0] ?? '').trim().length >
					0
				: (nextResponse.selectedOptions || []).length > 0;

			if (answerPresent && nextResponse.answeredAt === undefined) {
				nextResponse.answeredAt = now;
			}
			if (!answerPresent) {
				nextResponse.answeredAt = undefined;
			}
			nextResponse.lastChangedAt = now;
			nextResponse.changeCount = (nextResponse.changeCount ?? 0) + 1;

			await ctx.db.patch(item._id, {
				response: nextResponse,
				updatedAt: now
			});
		}

		const freshItems = (await ctx.db
			.query('quizAttemptItems')
			.withIndex('by_attempt_order', (q) => q.eq('attemptId', args.attemptId))
			.collect()) as Doc<'quizAttemptItems'>[];
		const counters = computeAttemptCounters(freshItems);

		await ctx.db.patch(attempt._id, {
			progressCounters: counters,
			lastActivityAt: now,
			elapsedMs:
				elapsedMsArg !== undefined
					? Math.max(attempt.elapsedMs ?? 0, elapsedMsArg)
					: attempt.elapsedMs,
			updatedAt: now
		});

		return { ok: true, progressCounters: counters };
	}
});

export const heartbeatAttempt = authMutation({
	args: {
		attemptId: v.id('quizAttempts'),
		elapsedMs: v.number()
	},
	handler: async (ctx, args) => {
		const user = ctx.user;
		const attempt = await requireAttemptOwner(ctx, user, args.attemptId);
		if (attempt.status !== 'in_progress') {
			return { ok: true, ignored: true };
		}

		const now = nowTs();
		await ctx.db.patch(attempt._id, {
			lastActivityAt: now,
			elapsedMs: Math.max(
				attempt.elapsedMs ?? 0,
				Math.max(0, clampInt(args.elapsedMs, 0, 7 * 24 * 60 * 60 * 1000))
			),
			updatedAt: now
		});
		return { ok: true };
	}
});

export const submitAttempt = authMutation({
	args: {
		attemptId: v.id('quizAttempts'),
		elapsedMs: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const user = ctx.user;
		const attempt = await requireAttemptOwner(ctx, user, args.attemptId);
		if (attempt.status !== 'in_progress') {
			if (attempt.status === 'submitted' || attempt.status === 'timed_out') {
				return { alreadySubmitted: true, status: attempt.status };
			}
			throw new Error('Attempt is not submittable');
		}

		const now = nowTs();
		const elapsedMsSubmitted =
			args.elapsedMs !== undefined
				? Math.max(0, clampInt(args.elapsedMs, 0, 7 * 24 * 60 * 60 * 1000))
				: undefined;
		const effectiveElapsedMs = Math.max(
			attempt.elapsedMs ?? 0,
			elapsedMsSubmitted ?? 0,
			now - attempt.startedAt
		);
		const expiryAt = attempt.timeLimitSec
			? attempt.startedAt + attempt.timeLimitSec * 1000
			: undefined;
		const timedOut = expiryAt !== undefined && now >= expiryAt;

		const items = (await ctx.db
			.query('quizAttemptItems')
			.withIndex('by_attempt_order', (q) => q.eq('attemptId', args.attemptId))
			.collect()) as Doc<'quizAttemptItems'>[];

		let scoreEarned = 0;
		let scorePossible = 0;
		let correctCount = 0;
		let incorrectCount = 0;
		let unansweredCount = 0;

		const byType = new Map<
			string,
			{
				questionType: string;
				total: number;
				correct: number;
				incorrect: number;
				unanswered: number;
			}
		>();
		const byModule = new Map<
			Id<'module'>,
			{
				moduleId: Id<'module'>;
				total: number;
				correct: number;
				incorrect: number;
				unanswered: number;
			}
		>();

		for (const item of items) {
			const score = scoreAttemptItem(item);
			scoreEarned += score.pointsEarned;
			scorePossible += score.pointsPossible;
			if (score.unanswered) unansweredCount += 1;
			else if (score.isCorrect) correctCount += 1;
			else incorrectCount += 1;

			const typeKey = normalizeQuestionType(item.questionSnapshot.type);
			const typeAcc = byType.get(typeKey) ?? {
				questionType: typeKey,
				total: 0,
				correct: 0,
				incorrect: 0,
				unanswered: 0
			};
			typeAcc.total += 1;
			if (score.unanswered) typeAcc.unanswered += 1;
			else if (score.isCorrect) typeAcc.correct += 1;
			else typeAcc.incorrect += 1;
			byType.set(typeKey, typeAcc);

			const moduleAcc = byModule.get(item.moduleId) ?? {
				moduleId: item.moduleId,
				total: 0,
				correct: 0,
				incorrect: 0,
				unanswered: 0
			};
			moduleAcc.total += 1;
			if (score.unanswered) moduleAcc.unanswered += 1;
			else if (score.isCorrect) moduleAcc.correct += 1;
			else moduleAcc.incorrect += 1;
			byModule.set(item.moduleId, moduleAcc);

			await ctx.db.patch(item._id, {
				score: {
					...item.score,
					isCorrect: score.isCorrect,
					pointsEarned: score.pointsEarned,
					pointsPossible: score.pointsPossible
				},
				updatedAt: now
			});
		}

		const pct = scorePossible > 0 ? Math.round((scoreEarned / scorePossible) * 100) : 0;
		const passThresholdPct = clampInt(attempt.configSnapshot.passThresholdPct, 0, 100);
		const moduleIds = Array.from(byModule.keys());
		const moduleDocs = await Promise.all(moduleIds.map((moduleId) => ctx.db.get(moduleId)));
		const moduleTitleMap = new Map(moduleDocs.filter(isModuleDoc).map((m) => [m._id, m.title]));

		const byModuleSummary = Array.from(byModule.values()).map((row) => ({
			moduleId: row.moduleId,
			moduleTitle: moduleTitleMap.get(row.moduleId) ?? 'Module',
			total: row.total,
			correct: row.correct,
			incorrect: row.incorrect,
			unanswered: row.unanswered,
			accuracyPct: row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0
		}));

		const byTypeSummary = Array.from(byType.values()).map((row) => ({
			questionType: row.questionType,
			total: row.total,
			correct: row.correct,
			incorrect: row.incorrect,
			unanswered: row.unanswered,
			accuracyPct: row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0
		}));

		const resultSummary = {
			scoreEarned,
			scorePossible,
			scorePct: pct,
			correctCount,
			incorrectCount,
			unansweredCount,
			passThresholdPct,
			passed: pct >= passThresholdPct,
			byModule: byModuleSummary.sort((a, b) => a.moduleTitle.localeCompare(b.moduleTitle)),
			byType: byTypeSummary.sort((a, b) => a.questionType.localeCompare(b.questionType)),
			reviewReady: true
		};

		const finalStatus: AttemptStatus = timedOut ? 'timed_out' : 'submitted';
		await ctx.db.patch(attempt._id, {
			status: finalStatus,
			submittedAt: now,
			timeExpiredAt: timedOut ? expiryAt : undefined,
			elapsedMs: effectiveElapsedMs,
			lastActivityAt: now,
			resultSummary,
			updatedAt: now
		});

		if (scorePossible >= 20) {
			await applyLargeQuizSubmissionDeltaAndEvaluateBadges(ctx, {
				userId: user._id,
				classId: attempt.classId,
				largeQuizzesSubmittedDelta: 1,
				occurredAt: now
			});
		}

		return {
			alreadySubmitted: false,
			status: finalStatus,
			resultSummary
		};
	}
});
