import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { authCuratorMutation } from '../authQueries';
import { requireModuleAccess } from '../access';
import { acceptanceValidator } from '../freeResponseValidators';
import { adjustModuleQuestionCount, shiftQuestionStats } from '../moduleStats';
import { getRationale } from '../../lib/utils/rationale';
import {
	assertPairFormattedAnswers,
	assignOptionIds,
	convertQuestionType,
	normalizeMatchingCorrectAnswers,
	normalizeStandardCorrectAnswers
} from './options';
import {
	applyQuestionCreationBadgesForActor,
	checkModuleCapacity,
	computeSearchText,
	normalizeIncomingRationale,
	prepareAiPublication,
	publishedUnits
} from './shared';

type BulkQuestionStatus = 'draft' | 'published' | 'archived';

async function updateQuestionStatuses(
	ctx: MutationCtx,
	args: {
		questionIds: Id<'question'>[];
		moduleId: Id<'module'>;
		status: BulkQuestionStatus;
	},
	distinctId: string
) {
	await requireModuleAccess(ctx, args.moduleId);
	let updatedCount = 0;
	let skippedCount = 0;
	let publishedDelta = 0;
	const errors: string[] = [];

	for (const questionId of args.questionIds) {
		try {
			const question = await ctx.db.get(questionId);
			if (!question) {
				errors.push(`Question ${questionId} not found`);
				continue;
			}

			if (question.moduleId !== args.moduleId) {
				errors.push(`Question ${questionId} access denied`);
				continue;
			}

			if (question.status === args.status) {
				skippedCount++;
				continue;
			}

			const options = await prepareAiPublication(
				ctx,
				question,
				getRationale(question),
				args.status
			);
			const searchText = computeSearchText({
				stem: question.stem,
				rationale: question.rationale,
				examFindings: question.examFindings,
				explanation: question.explanation,
				type: question.type,
				status: args.status,
				aiGenerated: question.aiGenerated,
				options,
				correctAnswers: question.correctAnswers || [],
				metadata: question.metadata
			});

			await ctx.db.patch(questionId, {
				status: args.status,
				options,
				updatedAt: Date.now(),
				searchText
			});
			publishedDelta += publishedUnits(args.status) - publishedUnits(question.status);

			if (args.status === 'published' && question.metadata.generation?.jobId)
				await ctx.scheduler.runAfter(0, internal.aiTelemetry.capture, {
					event: 'question_generation_published',
					distinctId,
					properties: {
						job_id: question.metadata.generation.jobId,
						question_id: questionId,
						harness_version: question.metadata.generation.harnessVersion
					}
				});
			updatedCount++;
		} catch (error) {
			errors.push(`Failed to update question ${questionId}: ${error}`);
		}
	}

	if (publishedDelta) await adjustModuleQuestionCount(ctx, args.moduleId, 0, publishedDelta);

	return {
		updatedCount,
		skippedCount,
		errors,
		success: errors.length === 0
	};
}

export const bulkUpdateQuestionStatus = authCuratorMutation({
	args: {
		questionIds: v.array(v.id('question')),
		moduleId: v.id('module'),
		status: v.union(v.literal('draft'), v.literal('published'), v.literal('archived'))
	},
	handler: async (ctx, args) => await updateQuestionStatuses(ctx, args, ctx.identity.subject)
});

// Keep the original endpoint available while older clients transition to the generalized status action.
export const bulkPublishQuestions = authCuratorMutation({
	args: {
		questionIds: v.array(v.id('question')),
		moduleId: v.id('module')
	},
	handler: async (ctx, args) => {
		const result = await updateQuestionStatuses(
			ctx,
			{ ...args, status: 'published' },
			ctx.identity.subject
		);
		return { ...result, publishedCount: result.updatedCount };
	}
});

export const bulkInsertQuestions = authCuratorMutation({
	args: {
		moduleId: v.id('module'),
		questions: v.array(
			v.object({
				type: v.string(),
				stem: v.string(),
				options: v.array(v.object({ text: v.string() })),
				correctAnswers: v.array(v.string()),
				rationale: v.optional(v.string()),
				freeResponseAcceptance: v.optional(acceptanceValidator),
				explanation: v.optional(v.string()),
				aiGenerated: v.boolean(),
				status: v.string(),
				order: v.number(),
				metadata: v.object({
					generation: v.optional(
						v.object({
							model: v.string(),
							focus: v.string(),
							customPromptUsed: v.boolean()
						})
					)
				}),
				updatedAt: v.number()
			})
		)
	},
	handler: async (ctx, { moduleId, questions }) => {
		await requireModuleAccess(ctx, moduleId, true);
		await checkModuleCapacity(ctx, moduleId, questions.length);

		const insertedIds: string[] = [];

		for (const q of questions) {
			const rationale = normalizeIncomingRationale(q);
			if (!rationale) {
				throw new Error('Each imported question must include a rationale');
			}
			const isMatching = convertQuestionType(q.type) === 'matching';
			if (isMatching) assertPairFormattedAnswers(q.correctAnswers);
			const { optionsWithIds } = assignOptionIds(q.options);
			const correctAnswerIds = isMatching
				? normalizeMatchingCorrectAnswers(q.correctAnswers, optionsWithIds)
				: normalizeStandardCorrectAnswers(q.correctAnswers, optionsWithIds);

			const id = await ctx.db.insert('question', {
				moduleId,
				type: convertQuestionType(q.type),
				stem: q.stem,
				options: optionsWithIds,
				correctAnswers: correctAnswerIds,
				rationale,
				aiGenerated: q.aiGenerated,
				status: q.status.toLowerCase(),
				order: q.order,
				metadata: q.metadata,
				updatedAt: q.updatedAt,
				searchText: computeSearchText({
					stem: q.stem,
					rationale,
					type: q.type,
					status: q.status,
					aiGenerated: q.aiGenerated,
					options: optionsWithIds,
					correctAnswers: correctAnswerIds,
					metadata: q.metadata
				})
			});

			insertedIds.push(id);
		}

		if (insertedIds.length > 0) {
			await adjustModuleQuestionCount(
				ctx,
				moduleId,
				insertedIds.length,
				questions.filter((q) => publishedUnits(q.status.toLowerCase())).length
			);
			await applyQuestionCreationBadgesForActor(ctx, ctx.user, moduleId, insertedIds.length);
		}

		return { insertedIds, insertedCount: insertedIds.length };
	}
});

export const bulkDeleteQuestions = authCuratorMutation({
	args: {
		questionIds: v.array(v.id('question')),
		moduleId: v.id('module')
	},
	handler: async (ctx, args) => {
		await requireModuleAccess(ctx, args.moduleId, true);
		let deletedCount = 0;
		let deletedPublished = 0;
		const errors = [];

		for (const questionId of args.questionIds) {
			try {
				const questionToDelete = await ctx.db.get(questionId);
				if (!questionToDelete) {
					errors.push(`Question ${questionId} not found`);
					continue;
				}

				if (questionToDelete.moduleId !== args.moduleId) {
					errors.push(`Question ${questionId} access denied`);
					continue;
				}

				await shiftQuestionStats(ctx, [questionToDelete]);
				await ctx.db.delete(questionId);
				await ctx.scheduler.runAfter(0, internal.stemHighlights.deleteForQuestion, { questionId });
				await ctx.scheduler.runAfter(0, internal.questionNotes.deleteForQuestion, { questionId });
				deletedCount++;
				deletedPublished += publishedUnits(questionToDelete.status);
			} catch (error) {
				errors.push(`Failed to delete question ${questionId}: ${error}`);
			}
		}

		if (deletedCount > 0) {
			await adjustModuleQuestionCount(ctx, args.moduleId, -deletedCount, -deletedPublished);
		}

		return {
			deletedCount,
			errors,
			success: errors.length === 0
		};
	}
});
