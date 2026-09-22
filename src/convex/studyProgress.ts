import { freeResponseGradeValidator } from './freeResponseValidators';
import { MAX_RESPONSE_CHARACTERS, type FreeResponseGrade } from '../lib/utils/freeResponse';
import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { api } from './_generated/api';
import { requireCurrentUser, requireClassAccess } from './access';
import { answerStatus } from '../lib/utils/moduleCompletion';
import { questionVersion, recordRecall, type StudyEvidence } from '../lib/utils/studyMastery';
import { studyEvidenceValidator } from './studyValidators';

const MAX_MODULE_QUESTIONS = 2000;
async function access(ctx: QueryCtx | MutationCtx, questionId: Id<'question'>) {
	const user = await requireCurrentUser(ctx);
	const question = await ctx.db.get(questionId);
	const module = question ? await ctx.db.get(question.moduleId) : null;
	if (
		!question ||
		question.deletedAt ||
		question.status !== 'published' ||
		!module ||
		module.deletedAt
	)
		throw new Error('Question unavailable');
	await requireClassAccess(ctx, user, module.classId);
	return { user, question, module };
}
function evidence(
	questionId: Id<'question'>,
	saved: Doc<'studyQuestionState'> | null,
	version: string
) {
	if (!saved || saved.version !== version)
		return { questionId, cleanRecallCount: 0, needsFreshEvidence: !!saved };
	return {
		questionId,
		activeAttemptChecks: saved.activeAttemptChecks ?? 0,
		activeAttemptRevealed: saved.activeAttemptRevealed ?? false,
		checkedAt: saved.checkedAt,
		latestCorrect: saved.latestCorrect,
		cleanRecallCount: saved.cleanRecallCount,
		firstCleanAt: saved.firstCleanAt,
		masteredAt: saved.masteredAt,
		lastMasteredAt: saved.lastMasteredAt,
		needsFreshEvidence: saved.needsFreshEvidence ?? false
	};
}

export const getForModule = query({
	args: { moduleId: v.id('module') },
	returns: v.array(studyEvidenceValidator),
	handler: async (ctx, { moduleId }) => {
		const user = await requireCurrentUser(ctx);
		const module = await ctx.db.get(moduleId);
		if (!module || module.deletedAt) throw new Error('Module unavailable');
		await requireClassAccess(ctx, user, module.classId);
		const questions = await ctx.db
			.query('question')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', moduleId))
			.take(MAX_MODULE_QUESTIONS + 1);
		const states = await ctx.db
			.query('studyQuestionState')
			.withIndex('by_userId_moduleId', (q) => q.eq('userId', user._id).eq('moduleId', moduleId))
			.take(MAX_MODULE_QUESTIONS + 1);
		if (questions.length > MAX_MODULE_QUESTIONS || states.length > MAX_MODULE_QUESTIONS)
			throw new Error('Module exceeds supported question count');
		const byQuestion = new Map(states.map((s) => [s.questionId, s]));
		return await Promise.all(
			questions
				.filter((q) => !q.deletedAt && q.status === 'published')
				.map(async (q) => evidence(q._id, byQuestion.get(q._id) ?? null, await questionVersion(q)))
		);
	}
});

export const open = mutation({
	args: { questionId: v.id('question') },
	returns: v.object({
		attemptId: v.id('studyAttempts'),
		selectedOptions: v.array(v.string()),
		checks: v.number(),
		freeResponseGrade: v.optional(freeResponseGradeValidator),
		revealed: v.boolean(),
		evidence: studyEvidenceValidator
	}),
	handler: async (ctx, { questionId }) => {
		const { user, question } = await access(ctx, questionId);
		const version = await questionVersion(question);
		const saved = await ctx.db
			.query('studyQuestionState')
			.withIndex('by_userId_questionId', (q) =>
				q.eq('userId', user._id).eq('questionId', questionId)
			)
			.unique();
		const existing = saved?.activeAttemptId ? await ctx.db.get(saved.activeAttemptId) : null;
		if (existing && existing.version === version && saved?.version === version) {
			return {
				attemptId: existing._id,
				selectedOptions: existing.selectedOptions,
				checks: existing.checks,
				freeResponseGrade: existing.freeResponseGrade,
				revealed: existing.revealedAt !== undefined,
				evidence: evidence(questionId, saved, version)
			};
		}
		const attemptId = await ctx.db.insert('studyAttempts', {
			userId: user._id,
			questionId,
			moduleId: question.moduleId,
			version,
			startedAt: Date.now(),
			checks: 0,
			selectedOptions: []
		});
		if (saved) {
			await ctx.db.patch(
				saved._id,
				saved.version === version
					? {
							activeAttemptId: attemptId,
							activeAttemptChecks: 0,
							activeAttemptRevealed: false,
							activeAttemptFirstCorrect: undefined,
							activeAttemptRecallRecorded: false
						}
					: {
							version,
							activeAttemptId: attemptId,
							activeAttemptChecks: 0,
							activeAttemptRevealed: false,
							activeAttemptFirstCorrect: undefined,
							activeAttemptRecallRecorded: false,
							needsFreshEvidence: true,
							checkedAt: undefined,
							latestCorrect: undefined,
							cleanRecallCount: 0,
							firstCleanAt: undefined,
							masteredAt: undefined,
							checks: 0
						}
			);
		} else
			await ctx.db.insert('studyQuestionState', {
				userId: user._id,
				questionId,
				moduleId: question.moduleId,
				version,
				activeAttemptId: attemptId,
				activeAttemptChecks: 0,
				activeAttemptRevealed: false,
				cleanRecallCount: 0,
				checks: 0
			});
		return {
			attemptId,
			selectedOptions: [],
			checks: 0,
			revealed: false,
			evidence: {
				...evidence(questionId, saved, version),
				activeAttemptChecks: 0,
				activeAttemptRevealed: false
			}
		};
	}
});

export async function activeAttempt(ctx: QueryCtx | MutationCtx, attemptId: Id<'studyAttempts'>) {
	const attempt = await ctx.db.get(attemptId);
	if (!attempt) throw new Error('Attempt unavailable');
	const { user, question, module } = await access(ctx, attempt.questionId);
	if (user._id !== attempt.userId) throw new Error('Unauthorized');
	const saved = await ctx.db
		.query('studyQuestionState')
		.withIndex('by_userId_questionId', (q) =>
			q.eq('userId', user._id).eq('questionId', question._id)
		)
		.unique();
	if (
		!saved ||
		saved.activeAttemptId !== attemptId ||
		attempt.version !== (await questionVersion(question))
	)
		throw new Error('This module has been reset or the question changed. Reload to continue.');
	return { user, question, module, attempt, saved };
}

// Credit each question once per completed module run. Reset only clears the run's
// answers and attempt tokens, so earned evidence carries into the next run.
async function recordCompletedRun(ctx: MutationCtx, userId: Id<'users'>, module: Doc<'module'>) {
	const questions = await ctx.db
		.query('question')
		.withIndex('by_moduleId', (q) => q.eq('moduleId', module._id))
		.take(MAX_MODULE_QUESTIONS + 1);
	const states = await ctx.db
		.query('studyQuestionState')
		.withIndex('by_userId_moduleId', (q) => q.eq('userId', userId).eq('moduleId', module._id))
		.take(MAX_MODULE_QUESTIONS + 1);
	if (questions.length > MAX_MODULE_QUESTIONS || states.length > MAX_MODULE_QUESTIONS)
		throw new Error('Module exceeds supported question count');
	const published = questions.filter((q) => !q.deletedAt && q.status === 'published');
	const byQuestion = new Map(states.map((s) => [s.questionId, s]));
	const current: Doc<'studyQuestionState'>[] = [];
	for (const question of published) {
		const state = byQuestion.get(question._id);
		if (
			!state ||
			state.checkedAt === undefined ||
			state.version !== (await questionVersion(question))
		)
			return;
		current.push(state);
	}
	const now = Date.now();
	for (const state of current) {
		if (state.activeAttemptRecallRecorded) continue;
		const next = recordRecall(
			evidence(state.questionId, state, state.version),
			state.latestCorrect === true,
			state.activeAttemptFirstCorrect === true && !state.activeAttemptRevealed,
			now
		);
		await ctx.db.patch(state._id, {
			activeAttemptRecallRecorded: true,
			cleanRecallCount: next.cleanRecallCount,
			firstCleanAt: next.firstCleanAt,
			masteredAt: next.masteredAt,
			lastMasteredAt: next.lastMasteredAt
		});
		if (next.masteredAt !== state.masteredAt) {
			await ctx.runMutation(api.userProgress.saveUserProgress, {
				userId,
				classId: module.classId,
				questionId: state.questionId
			});
		}
	}
}

export const reveal = mutation({
	args: { attemptId: v.id('studyAttempts') },
	returns: v.null(),
	handler: async (ctx, { attemptId }) => {
		const { attempt, saved } = await activeAttempt(ctx, attemptId);
		if (attempt.revealedAt === undefined) await ctx.db.patch(attemptId, { revealedAt: Date.now() });
		if (attempt.checks === 0) await ctx.db.patch(saved._id, { activeAttemptRevealed: true });
		return null;
	}
});

export const check = mutation({
	args: {
		attemptId: v.id('studyAttempts'),
		submissionId: v.string(),
		selectedOptions: v.array(v.string())
	},
	returns: v.object({ isCorrect: v.boolean(), evidence: studyEvidenceValidator }),
	handler: (ctx, args) => recordCheck(ctx, args)
});

// Server-only helper: client calls can never supply their own grade.
export async function recordCheck(
	ctx: MutationCtx,
	{
		attemptId,
		submissionId,
		selectedOptions
	}: { attemptId: Id<'studyAttempts'>; submissionId: string; selectedOptions: string[] },
	grade?: FreeResponseGrade
) {
	if (
		!submissionId ||
		submissionId.length > 100 ||
		selectedOptions.length > 500 ||
		selectedOptions.some((a) => a.length > (grade ? MAX_RESPONSE_CHARACTERS : 10000))
	)
		throw new Error('Invalid answer');
	const { user, question, module, attempt, saved } = await activeAttempt(ctx, attemptId);
	if (question.type === 'free_response' && !grade)
		throw new Error('Submit free responses for AI grading.');
	const status = grade
		? grade.isCorrect
			? 'correct'
			: 'incorrect'
		: answerStatus(question, selectedOptions);
	if (status === 'unanswered') throw new Error('Choose an answer before checking.');
	const previous = await ctx.db
		.query('studyChecks')
		.withIndex('by_attemptId_submissionId', (q) =>
			q.eq('attemptId', attemptId).eq('submissionId', submissionId)
		)
		.unique();
	const isCorrect = status === 'correct';
	const answerKey = JSON.stringify([...selectedOptions].sort());
	if (previous)
		return {
			isCorrect: previous.isCorrect,
			evidence: evidence(question._id, saved, attempt.version)
		};
	if (attempt.lastAnswerKey === answerKey)
		return { isCorrect, evidence: evidence(question._id, saved, attempt.version) };
	const now = Date.now();
	const qualifyingRecall = isCorrect && attempt.checks === 0 && attempt.revealedAt === undefined;
	const next: StudyEvidence = recordRecall(
		evidence(question._id, saved, attempt.version),
		isCorrect,
		false,
		now
	);
	await ctx.db.insert('studyChecks', {
		userId: user._id,
		questionId: question._id,
		attemptId,
		submissionId,
		checkedAt: now,
		selectedOptions,
		isCorrect,
		qualifyingRecall,
		...(grade ? { freeResponseGrade: grade } : {})
	});
	await ctx.db.patch(attemptId, {
		checks: attempt.checks + 1,
		...(grade ? { freeResponseGrade: grade, grading: undefined } : {}),
		lastAnswerKey: answerKey,
		selectedOptions
	});
	await ctx.db.patch(saved._id, {
		needsFreshEvidence: false,
		checkedAt: next.checkedAt,
		latestCorrect: next.latestCorrect,
		cleanRecallCount: next.cleanRecallCount,
		firstCleanAt: next.firstCleanAt,
		masteredAt: next.masteredAt,
		lastMasteredAt: next.lastMasteredAt,
		activeAttemptChecks: attempt.checks + 1,
		activeAttemptFirstCorrect: attempt.checks === 0 ? isCorrect : saved.activeAttemptFirstCorrect,
		checks: saved.checks + 1
	});
	if (attempt.checks === 0) await recordCompletedRun(ctx, user._id, module);
	await ctx.runMutation(api.userProgress.saveUserProgress, {
		userId: user._id,
		classId: module.classId,
		questionId: question._id,
		selectedOptions
	});
	return {
		isCorrect,
		evidence: evidence(question._id, await ctx.db.get(saved._id), attempt.version)
	};
}
