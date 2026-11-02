import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { authQuery } from './authQueries';
import { requireCohortStaff } from './access';

// Every checked answer from the cohort since `since`, for the live results page. The client
// subscribes with `since` at the start of the previous hour, so each student's range is small
// and only new answers from cohort members re-run it.

const CHECKS_PER_STUDENT = 150;
const CHECKS_RETURNED = 800;
const QUESTION_LOOKUP_CAP = 400;
const STEM_CHARS = 180;

function stemPreview(html: string) {
	const text = html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/\s+/g, ' ')
		.trim();
	return text.length > STEM_CHARS ? `${text.slice(0, STEM_CHARS - 1)}…` : text;
}

export const getRecentChecks = authQuery({
	args: { cohortId: v.id('cohort'), since: v.number() },
	returns: v.object({
		truncated: v.boolean(),
		checks: v.array(
			v.object({
				_id: v.id('studyChecks'),
				userId: v.id('users'),
				questionId: v.id('question'),
				moduleId: v.id('module'),
				checkedAt: v.number(),
				isCorrect: v.boolean(),
				firstTry: v.boolean()
			})
		),
		questions: v.array(
			v.object({
				questionId: v.id('question'),
				moduleId: v.id('module'),
				order: v.number(),
				type: v.string(),
				stem: v.string()
			})
		)
	}),
	handler: async (ctx, args) => {
		await requireCohortStaff(ctx, args.cohortId);
		const [members, classes] = await Promise.all([
			ctx.db
				.query('users')
				.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
				.collect(),
			ctx.db
				.query('class')
				.withIndex('by_cohortId', (q) => q.eq('cohortId', args.cohortId))
				.collect()
		]);
		const cohortClassIds = new Set(classes.filter((c) => !c.deletedAt).map((c) => c._id));

		let truncated = false;
		const checks: Doc<'studyChecks'>[] = [];
		for (const member of members) {
			if (member.deletedAt) continue;
			const recent = await ctx.db
				.query('studyChecks')
				.withIndex('by_userId_and_checkedAt', (q) =>
					q.eq('userId', member._id).gte('checkedAt', args.since)
				)
				.order('desc')
				.take(CHECKS_PER_STUDENT);
			if (recent.length === CHECKS_PER_STUDENT) truncated = true;
			checks.push(...recent);
		}
		checks.sort((a, b) => b.checkedAt - a.checkedAt);
		if (checks.length > CHECKS_RETURNED) truncated = true;
		const latest = checks.slice(0, CHECKS_RETURNED);

		const questions = new Map<Id<'question'>, Doc<'question'> | null>();
		for (const check of latest) {
			if (questions.has(check.questionId)) continue;
			if (questions.size >= QUESTION_LOOKUP_CAP) {
				truncated = true;
				break;
			}
			questions.set(check.questionId, await ctx.db.get(check.questionId));
		}
		const moduleIds = [
			...new Set([...questions.values()].flatMap((q) => (q?.moduleId ? [q.moduleId] : [])))
		];
		const modules = await Promise.all(moduleIds.map((id) => ctx.db.get(id)));
		// Only answers in this cohort's own classes; a member may also study elsewhere.
		const inCohort = new Set(
			modules.filter((m) => m && cohortClassIds.has(m.classId)).map((m) => m!._id)
		);
		const visible = (question: Doc<'question'> | null | undefined) =>
			!!question?.moduleId && inCohort.has(question.moduleId);

		return {
			truncated,
			checks: latest.flatMap((check) => {
				const question = questions.get(check.questionId);
				if (!visible(question)) return [];
				return [
					{
						_id: check._id,
						userId: check.userId,
						questionId: check.questionId,
						moduleId: question!.moduleId!,
						checkedAt: check.checkedAt,
						isCorrect: check.isCorrect,
						firstTry: check.qualifyingRecall
					}
				];
			}),
			questions: [...questions.values()].flatMap((question) =>
				question && visible(question)
					? [
							{
								questionId: question._id,
								moduleId: question.moduleId!,
								order: question.order,
								type: question.type,
								stem: stemPreview(question.stem)
							}
						]
					: []
			)
		};
	}
});
