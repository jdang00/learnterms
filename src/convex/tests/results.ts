import { v } from 'convex/values';
import type { Doc } from '../_generated/dataModel';
import { authQuery } from '../authQueries';
import { requireClassAccess } from '../access';
import { getRationale } from '../../lib/utils/rationale';
import { buildCorrectAnswerDisplay } from './scoring';
import { isClassDoc, isModuleDoc, requireAttemptOwner } from './shared';

export const getAttemptResults = authQuery({
	args: { attemptId: v.id('quizAttempts') },
	handler: async (ctx, args) => {
		const user = ctx.user;
		const attempt = await requireAttemptOwner(ctx, user, args.attemptId);
		if (!(attempt.status === 'submitted' || attempt.status === 'timed_out')) {
			throw new Error('Results are not available yet');
		}

		const classDoc = (await ctx.db.get(attempt.classId)) as Doc<'class'> | null;
		const items = (await ctx.db
			.query('quizAttemptItems')
			.withIndex('by_attempt_order', (q) => q.eq('attemptId', args.attemptId))
			.collect()) as Doc<'quizAttemptItems'>[];

		const moduleIds = Array.from(new Set(items.map((item) => item.moduleId)));
		const moduleDocs = await Promise.all(moduleIds.map((moduleId) => ctx.db.get(moduleId)));
		const moduleTitleMap = new Map(
			moduleDocs.filter(isModuleDoc).map((m) => [m._id, { title: m.title, emoji: m.emoji }])
		);

		return {
			attempt: {
				_id: attempt._id,
				classId: attempt.classId,
				className: isClassDoc(classDoc) ? classDoc.name : 'Class',
				status: attempt.status,
				startedAt: attempt.startedAt,
				submittedAt: attempt.submittedAt,
				elapsedMs: attempt.elapsedMs,
				timeLimitSec: attempt.timeLimitSec,
				progressCounters: attempt.progressCounters,
				configSnapshot: attempt.configSnapshot,
				resultSummary: attempt.resultSummary
			},
			reviewItems: items.map((item) => {
				const orderedOptions =
					item.optionOrder && item.optionOrder.length > 0
						? item.optionOrder
								.map((id) => item.questionSnapshot.options.find((o) => o.id === id))
								.filter((o): o is { id: string; text: string } => Boolean(o))
						: item.questionSnapshot.options;

				return {
					_id: item._id,
					order: item.order,
					questionId: item.questionId,
					moduleId: item.moduleId,
					moduleTitle: moduleTitleMap.get(item.moduleId)?.title ?? 'Module',
					moduleEmoji: moduleTitleMap.get(item.moduleId)?.emoji,
					question: {
						type: item.questionSnapshot.type,
						stem: item.questionSnapshot.stem,
						examFindings: item.questionSnapshot.examFindings,
						examFindingsStyle: item.questionSnapshot.examFindingsStyle,
						options: orderedOptions,
						rationale: getRationale(item.questionSnapshot),
						source: item.questionSnapshot.source
					},
					response: item.response,
					score: item.score,
					correctAnswerDisplay: buildCorrectAnswerDisplay(item)
				};
			})
		};
	}
});

export const getUserAttemptsForClass = authQuery({
	args: { classId: v.id('class') },
	handler: async (ctx, args) => {
		const user = ctx.user;
		await requireClassAccess(ctx, user, args.classId);

		const attempts = (await ctx.db
			.query('quizAttempts')
			.withIndex('by_user_class', (q) => q.eq('userId', user._id).eq('classId', args.classId))
			.collect()) as Doc<'quizAttempts'>[];

		return attempts
			.sort((a, b) => b.startedAt - a.startedAt)
			.map((attempt) => ({
				_id: attempt._id,
				status: attempt.status,
				startedAt: attempt.startedAt,
				submittedAt: attempt.submittedAt,
				elapsedMs: attempt.elapsedMs,
				timeLimitSec: attempt.timeLimitSec,
				progressCounters: attempt.progressCounters,
				configSnapshot: attempt.configSnapshot,
				resultSummary: attempt.resultSummary
			}));
	}
});
