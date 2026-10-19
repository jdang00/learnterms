import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { authCuratorMutation } from '../authQueries';
import { requireModuleAccess } from '../access';
import { acceptanceValidator } from '../freeResponseValidators';
import { examFindingsStyleValidator, examFindingsValidator } from '../examFindingsValidators';
import { manualQuestionSource } from '../schema';
import { adjustModuleQuestionCount, shiftQuestionStats } from '../moduleStats';
import { attachQuestionImages, imageAttachment } from '../questionMediaSaving';
import {
	assertPairFormattedAnswers,
	assignMatchingOptionIds,
	assignOptionIds,
	convertQuestionType,
	normalizeMatchingCorrectAnswers,
	normalizeStandardCorrectAnswers
} from './options';
import {
	applyQuestionCreationBadgesForActor,
	checkModuleCapacity,
	computeSearchText,
	manualExamFindings,
	normalizeIncomingRationale,
	prepareAiPublication,
	publishedUnits,
	validateManualSource
} from './shared';

export const insertQuestion = authCuratorMutation({
	returns: v.id('question'),
	args: {
		images: v.optional(v.array(imageAttachment)),
		source: v.optional(manualQuestionSource),
		examFindings: v.optional(examFindingsValidator),
		examFindingsStyle: v.optional(examFindingsStyleValidator),
		moduleId: v.id('module'),
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
		updatedAt: v.number(),
		createdBy: v.optional(
			v.object({
				firstName: v.string(),
				lastName: v.string()
			})
		)
	},
	handler: async (ctx, args) => {
		await requireModuleAccess(ctx, args.moduleId);
		await checkModuleCapacity(ctx, args.moduleId, 1);
		const rationale = normalizeIncomingRationale(args);
		if (!rationale) {
			throw new Error('Question rationale is required');
		}
		const examFindings = manualExamFindings(args.aiGenerated, args.examFindings);

		const { optionsWithIds } = assignOptionIds(args.options);

		const isMatching = convertQuestionType(args.type) === 'matching';
		if (isMatching) assertPairFormattedAnswers(args.correctAnswers);
		const correctAnswerIds = isMatching
			? normalizeMatchingCorrectAnswers(args.correctAnswers, optionsWithIds)
			: normalizeStandardCorrectAnswers(args.correctAnswers, optionsWithIds);

		const searchText = computeSearchText({
			stem: args.stem,
			rationale,
			type: args.type,
			status: args.status,
			aiGenerated: args.aiGenerated,
			options: optionsWithIds,
			correctAnswers: correctAnswerIds,
			metadata: args.metadata,
			examFindings
		});

		const { images, source, ...questionFields } = args;
		const metadata = source
			? { ...args.metadata, source: await validateManualSource(ctx, args.moduleId, source) }
			: args.metadata;
		const id = await ctx.db.insert('question', {
			...questionFields,
			metadata,
			rationale,
			examFindings,
			examFindingsStyle: examFindings ? args.examFindingsStyle : undefined,
			type: convertQuestionType(args.type),
			status: args.status.toLowerCase(),
			options: optionsWithIds,
			correctAnswers: correctAnswerIds,
			searchText
		});
		await attachQuestionImages(ctx, id, images ?? []);
		await adjustModuleQuestionCount(
			ctx,
			args.moduleId,
			1,
			publishedUnits(args.status.toLowerCase())
		);
		await applyQuestionCreationBadgesForActor(ctx, ctx.user, args.moduleId, 1);
		return id;
	}
});

export const createQuestion = authCuratorMutation({
	args: {
		moduleId: v.id('module'),
		type: v.string(),
		stem: v.string(),
		options: v.array(v.object({ id: v.string(), text: v.string() })),
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
	},
	handler: async (ctx, args) => {
		await requireModuleAccess(ctx, args.moduleId);
		await checkModuleCapacity(ctx, args.moduleId, 1);
		const rationale = normalizeIncomingRationale(args);
		if (!rationale) {
			throw new Error('Question rationale is required');
		}

		const identity = ctx.identity;
		const createdBy =
			identity?.givenName && identity?.familyName
				? {
						firstName: identity.givenName,
						lastName: identity.familyName
					}
				: undefined;
		const isMatching = convertQuestionType(args.type) === 'matching';
		if (isMatching) assertPairFormattedAnswers(args.correctAnswers);
		const { optionsWithIds } = assignOptionIds(args.options);
		const normalizedCorrectAnswers = isMatching
			? normalizeMatchingCorrectAnswers(args.correctAnswers, optionsWithIds)
			: normalizeStandardCorrectAnswers(args.correctAnswers, optionsWithIds);

		const searchText = computeSearchText({
			stem: args.stem,
			rationale,
			type: args.type,
			status: args.status,
			aiGenerated: args.aiGenerated,
			options: optionsWithIds,
			correctAnswers: normalizedCorrectAnswers,
			metadata: args.metadata
		});
		const id = await ctx.db.insert('question', {
			...args,
			rationale,
			options: optionsWithIds,
			correctAnswers: normalizedCorrectAnswers,
			searchText,
			...(createdBy && { createdBy })
		});
		await adjustModuleQuestionCount(ctx, args.moduleId, 1, publishedUnits(args.status));
		await applyQuestionCreationBadgesForActor(ctx, ctx.user, args.moduleId, 1);
		return id;
	}
});

export const updateQuestion = authCuratorMutation({
	returns: v.object({ updated: v.boolean() }),
	args: {
		images: v.optional(v.array(imageAttachment)),
		source: v.optional(v.union(manualQuestionSource, v.null())),
		examFindings: v.optional(v.union(examFindingsValidator, v.null())),
		examFindingsStyle: v.optional(v.union(examFindingsStyleValidator, v.null())),
		questionId: v.id('question'),
		moduleId: v.id('module'),
		type: v.string(),
		stem: v.string(),
		options: v.array(v.object({ text: v.string(), id: v.optional(v.string()) })),
		correctAnswers: v.array(v.string()),
		rationale: v.optional(v.string()),
		freeResponseAcceptance: v.optional(acceptanceValidator),
		explanation: v.optional(v.string()),
		status: v.string()
	},
	handler: async (ctx, args) => {
		await requireModuleAccess(ctx, args.moduleId);
		const questionToUpdate = await ctx.db.get(args.questionId);
		if (!questionToUpdate || questionToUpdate.moduleId !== args.moduleId) {
			throw new Error('Question not found or access denied');
		}
		const rationale = normalizeIncomingRationale(args);
		if (!rationale) {
			throw new Error('Question rationale is required');
		}
		const examFindings =
			args.examFindings === undefined
				? questionToUpdate.examFindings
				: manualExamFindings(questionToUpdate.aiGenerated, args.examFindings ?? undefined);
		const examFindingsStyle = !examFindings
			? undefined
			: args.examFindingsStyle === undefined
				? questionToUpdate.examFindingsStyle
				: (args.examFindingsStyle ?? undefined);

		const isMatching = convertQuestionType(args.type) === 'matching';
		const { optionsWithIds, legacyIdMap } = isMatching
			? assignMatchingOptionIds(
					args.options,
					(questionToUpdate.options || []) as Array<{ id: string; text: string }>
				)
			: assignOptionIds(
					args.options,
					(questionToUpdate.options || []) as Array<{ id: string; text: string }>
				);

		if (isMatching) assertPairFormattedAnswers(args.correctAnswers);
		let correctAnswerIds: string[];
		if (isMatching) {
			correctAnswerIds = normalizeMatchingCorrectAnswers(
				args.correctAnswers,
				optionsWithIds,
				legacyIdMap
			);
		} else {
			correctAnswerIds = normalizeStandardCorrectAnswers(
				args.correctAnswers,
				optionsWithIds,
				legacyIdMap
			);
		}

		const publishOptions = await prepareAiPublication(
			ctx,
			{
				...questionToUpdate,
				type: convertQuestionType(args.type),
				options: optionsWithIds,
				correctAnswers: correctAnswerIds
			},
			rationale,
			args.status.toLowerCase()
		);
		const searchText = computeSearchText({
			stem: args.stem,
			rationale,
			type: args.type,
			status: args.status,
			aiGenerated: questionToUpdate.aiGenerated,
			options: publishOptions,
			correctAnswers: correctAnswerIds,
			metadata: questionToUpdate.metadata,
			examFindings
		});

		const metadata = { ...questionToUpdate.metadata };
		if (args.source !== undefined) {
			metadata.source =
				args.source === null
					? undefined
					: await validateManualSource(ctx, args.moduleId, args.source);
		}
		await ctx.db.patch(args.questionId, {
			metadata,
			type: convertQuestionType(args.type),
			stem: args.stem,
			options: publishOptions,
			correctAnswers: correctAnswerIds,
			freeResponseAcceptance:
				convertQuestionType(args.type) === 'free_response'
					? (args.freeResponseAcceptance ?? questionToUpdate.freeResponseAcceptance ?? 'lenient')
					: undefined,
			rationale,
			examFindings,
			examFindingsStyle,
			status: args.status.toLowerCase(),
			updatedAt: Date.now(),
			searchText
		});

		await attachQuestionImages(ctx, args.questionId, args.images ?? []);
		const publishedDelta =
			publishedUnits(args.status.toLowerCase()) - publishedUnits(questionToUpdate.status);
		if (publishedDelta) await adjustModuleQuestionCount(ctx, args.moduleId, 0, publishedDelta);
		if (questionToUpdate.metadata.generation?.jobId)
			await ctx.scheduler.runAfter(0, internal.aiTelemetry.capture, {
				event:
					args.status.toLowerCase() === 'published' && questionToUpdate.status !== 'published'
						? 'question_generation_published'
						: 'question_generation_edited',
				distinctId: ctx.identity.subject,
				properties: {
					job_id: questionToUpdate.metadata.generation.jobId,
					question_id: args.questionId,
					harness_version: questionToUpdate.metadata.generation.harnessVersion
				}
			});
		return { updated: true };
	}
});

export const deleteQuestion = authCuratorMutation({
	args: {
		questionId: v.id('question'),
		moduleId: v.id('module')
	},
	handler: async (ctx, args) => {
		await requireModuleAccess(ctx, args.moduleId, true);
		const questionToDelete = await ctx.db.get(args.questionId);
		if (!questionToDelete || questionToDelete.moduleId !== args.moduleId) {
			throw new Error('Question not found or access denied');
		}

		await shiftQuestionStats(ctx, [questionToDelete]);
		await ctx.db.delete(args.questionId);
		await ctx.scheduler.runAfter(0, internal.stemHighlights.deleteForQuestion, {
			questionId: args.questionId
		});
		await ctx.scheduler.runAfter(0, internal.questionNotes.deleteForQuestion, {
			questionId: args.questionId
		});
		await adjustModuleQuestionCount(
			ctx,
			args.moduleId,
			-1,
			-publishedUnits(questionToDelete.status)
		);
		return { deleted: true };
	}
});
