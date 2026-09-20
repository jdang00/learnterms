import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { mutation } from '../_generated/server';
import { applyQuestionCreationDeltaAndEvaluateBadges } from '../badgeEngine';
import { assertSaveAccess, getActor } from './authorization';
import { candidateToQuestionInsert } from './candidates';
import { scoreDuplicateRisk } from './duplicates';
import { hydrateGenerationJob } from './jobRows';
import { answerPosition, assertStandaloneRationale } from './presentation';
import { HARNESS_VERSION } from './quality';
import type { ExistingQuestionSummary } from './shared';
import { MAX_GENERATED_QUESTIONS, MAX_QUESTIONS_PER_MODULE, candidateValidator } from './shared';

/** Curators edit content only; source provenance and the original AI draft stay server-owned. */
export const editCandidate = mutation({
	args: {
		jobId: v.id('questionStudioJobs'),
		candidateIndex: v.number(),
		expectedRevision: v.number(),
		stem: v.string(),
		options: v.array(v.string()),
		answerIndex: v.number(),
		rationale: v.string()
	},
	returns: candidateValidator,
	handler: async (ctx, args) => {
		const { user, identity } = await getActor(ctx);
		const job = await ctx.db.get(args.jobId);
		if (!job || job.createdByUserId !== user._id || job.status !== 'ready' || job.dismissedAt)
			throw new Error('Run is not available for editing');
		await assertSaveAccess(ctx, { moduleId: job.moduleId, documentId: job.documentId });
		const source = await ctx.db.get(job.documentId);
		if (job.sourceIndexedAt !== source?.metadata?.indexedAt)
			throw new Error('Source was reindexed; regenerate before editing');
		if (
			!Number.isInteger(args.candidateIndex) ||
			job.savedCandidateIndexes?.includes(args.candidateIndex)
		)
			throw new Error('This candidate is already saved or unavailable');
		const rows = await ctx.db
			.query('questionStudioJobCandidates')
			.withIndex('by_jobId_index', (q) => q.eq('jobId', args.jobId))
			.take(MAX_GENERATED_QUESTIONS);
		const row = rows[args.candidateIndex];
		if (!row) throw new Error('Candidate not found');
		if ((row.candidate.metadata.curatorRevision ?? 0) !== args.expectedRevision)
			throw new Error(
				'This draft changed in another window. Cancel and reopen the editor to use the latest version.'
			);
		const stem = args.stem.trim(),
			rationale = args.rationale.trim(),
			options = args.options.map((option) => option.trim());
		if (
			!stem ||
			stem.length > 900 ||
			!rationale ||
			rationale.length > 1600 ||
			options.length !== 4 ||
			options.some((option) => !option || option.length > 260) ||
			new Set(options.map((option) => option.normalize('NFKC').toLowerCase())).size !== 4 ||
			!Number.isInteger(args.answerIndex) ||
			args.answerIndex < 0 ||
			args.answerIndex > 3
		)
			throw new Error(
				'Enter a question, rationale, four distinct options, and one correct answer within the field limits.'
			);
		assertStandaloneRationale(rationale);
		const now = Date.now();
		const candidate = {
			...row.candidate,
			stem,
			rationale,
			options,
			correctAnswers: [options[args.answerIndex]],
			metadata: {
				...row.candidate.metadata,
				curatorEditedAt: now,
				curatorRevision: args.expectedRevision + 1
			}
		};
		await ctx.db.patch(row._id, {
			candidate,
			originalCandidate: row.originalCandidate ?? row.candidate
		});
		await ctx.db.patch(job._id, { updatedAt: Math.max(now, job.updatedAt + 1) });
		await ctx.scheduler.runAfter(0, internal.aiTelemetry.capture, {
			event: 'question_generation_edited',
			distinctId: identity.subject,
			properties: {
				job_id: job._id,
				candidate_index: args.candidateIndex,
				edit_stage: 'candidate_review',
				revision: candidate.metadata.curatorRevision,
				harness_version: candidate.metadata.harnessVersion
			}
		});
		return candidate;
	}
});

export const saveSelectedCandidates = mutation({
	args: {
		moduleId: v.id('module'),
		documentId: v.id('contentLib'),
		jobId: v.id('questionStudioJobs'),
		candidateIndexes: v.array(v.number()),
		status: v.optional(v.union(v.literal('draft'), v.literal('published'), v.literal('archived')))
	},
	handler: async (ctx, args) => {
		const { user } = await getActor(ctx);
		const stored = await ctx.db.get(args.jobId);
		if (
			!stored ||
			stored.createdByUserId !== user._id ||
			stored.documentId !== args.documentId ||
			stored.moduleId !== args.moduleId ||
			stored.status !== 'ready' ||
			stored.dismissedAt
		)
			throw new Error('Run is not available for saving');
		const source = await ctx.db.get(args.documentId);
		if (stored.sourceIndexedAt !== source?.metadata?.indexedAt)
			throw new Error('Source was reindexed; regenerate before saving');
		const job = await hydrateGenerationJob(ctx, stored);
		if (
			new Set(args.candidateIndexes).size !== args.candidateIndexes.length ||
			args.candidateIndexes.some(
				(i) =>
					!Number.isInteger(i) ||
					i < 0 ||
					i >= job.candidates.length ||
					stored.savedCandidateIndexes?.includes(i)
			)
		)
			throw new Error('Invalid or already saved selection');
		const candidates = args.candidateIndexes.map((i) => job.candidates[i]);
		if (candidates.some((c) => !c.questionType || c.metadata.harnessVersion !== HARNESS_VERSION))
			throw new Error('These drafts use an older quality harness. Regenerate before saving.');
		await ctx.db.patch(args.jobId, {
			savedCandidateIndexes: [...(stored.savedCandidateIndexes ?? []), ...args.candidateIndexes]
		});
		if (candidates.length === 0) return { insertedIds: [], insertedCount: 0 };
		if (candidates.length > MAX_GENERATED_QUESTIONS) {
			throw new Error(`Save at most ${MAX_GENERATED_QUESTIONS} questions at a time`);
		}
		const { identity, module, classDoc } = await assertSaveAccess(ctx, {
			moduleId: args.moduleId,
			documentId: args.documentId
		});
		if ((module.questionCount ?? 0) + candidates.length > MAX_QUESTIONS_PER_MODULE) {
			throw new Error(
				`Module limit reached (${MAX_QUESTIONS_PER_MODULE} questions). Please split this module for better learning retention.`
			);
		}

		const existing = await ctx.db
			.query('question')
			.withIndex('by_moduleId_order', (q) => q.eq('moduleId', args.moduleId))
			.collect();
		const existingSummaries: ExistingQuestionSummary[] = existing.map((question) => ({
			_id: question._id,
			stem: question.stem,
			options: question.options.map((option) => `${option.id}:${option.text}`),
			correctAnswers: question.correctAnswers,
			rationale: question.rationale ?? question.explanation,
			status: question.status,
			searchText: question.searchText,
			sourceDocumentId: question.metadata.generation?.sourceDocumentId,
			sourcePageNumbers: question.metadata.generation?.sourcePageNumbers,
			sourceCitations: question.metadata.generation?.sourceCitations,
			topicTitle: question.metadata.generation?.topicTitle,
			questionType: question.metadata.generation?.questionType,
			reasoningOrder: question.metadata.generation?.reasoningOrder
		}));
		let nextOrder =
			existing.length > 0 ? Math.max(...existing.map((question) => question.order)) + 1 : 0;
		const status = 'draft';
		const insertedIds: Id<'question'>[] = [];

		const previousPositions = existing
			.filter((q) => !q.deletedAt && q.status !== 'archived')
			.map(answerPosition);
		for (const candidate of candidates) {
			if (candidate.metadata.sourceDocumentId !== args.documentId) {
				throw new Error('Candidate source document does not match this save request');
			}
			const duplicate = scoreDuplicateRisk(candidate, existingSummaries);
			if (duplicate.risk === 'high') {
				throw new Error('A selected question is too similar to an existing module question');
			}
			const insert = candidateToQuestionInsert(
				candidate,
				args.moduleId,
				nextOrder,
				previousPositions
			);
			previousPositions.push(answerPosition(insert));
			const id = await ctx.db.insert('question', {
				...insert,
				status,
				searchText: insert.searchText.replace(' draft ', ` ${status} `)
			});
			insertedIds.push(id);
			existingSummaries.push({
				_id: id,
				stem: insert.stem,
				options: insert.options.map((option) => `${option.id}:${option.text}`),
				correctAnswers: insert.correctAnswers,
				rationale: insert.rationale,
				status,
				searchText: insert.searchText,
				sourceDocumentId: insert.metadata.generation.sourceDocumentId,
				sourcePageNumbers: insert.metadata.generation.sourcePageNumbers,
				sourceCitations: insert.metadata.generation.sourceCitations,
				topicTitle: insert.metadata.generation.topicTitle,
				questionType: insert.metadata.generation.questionType,
				reasoningOrder: insert.metadata.generation.reasoningOrder
			});
			nextOrder++;
		}

		if (insertedIds.length > 0) {
			await ctx.db.patch(args.moduleId, {
				questionCount: Math.max(0, (module.questionCount ?? 0) + insertedIds.length)
			});
			const actor = await ctx.db
				.query('users')
				.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
				.first();
			if (actor) {
				await applyQuestionCreationDeltaAndEvaluateBadges(ctx, {
					userId: actor._id,
					classId: classDoc._id,
					questionsCreatedDelta: insertedIds.length,
					occurredAt: Date.now()
				});
			}
		}

		await ctx.scheduler.runAfter(0, internal.aiTelemetry.capture, {
			event: 'question_generation_saved',
			distinctId: identity.subject,
			properties: {
				job_id: args.jobId,
				selected_count: insertedIds.length,
				accepted_count: job.candidates.length,
				requested_count: job.requestedCount,
				harness_version: HARNESS_VERSION
			}
		});
		return { insertedIds, insertedCount: insertedIds.length };
	}
});
