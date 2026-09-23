import { createOpenAI } from '@ai-sdk/openai';
import { v } from 'convex/values';
import { z } from 'zod/v4';
import type { Doc, Id } from '../_generated/dataModel';
import type { QuestionCounts, QuestionType } from './questionTypes';

export const QUESTION_STUDIO_MAPPING_PROVIDER_OPTIONS = {
	openai: {
		reasoningEffort: 'low',
		forceReasoning: true,
		store: true
	}
} as const;
export const questionStudioModelValidator = v.string();
export const MAX_GENERATED_QUESTIONS = 30;
export const MAX_QUESTIONS_PER_MODULE = 150;
export const MAX_SOURCE_CHARS = 80_000;
export const MAX_WORKER_RAG_CHARS = 5_000;
export const MAX_REVIEW_REASON_CHARS = 320;
export const MAX_QUESTIONS_PER_WORKER = 3;
export const LEARN_QUESTIONS_PER_WORKER = 2;
// Separate model batch size from source-coverage groups.
export const LEARN_MODEL_BATCH_SIZE = 2;
export const LEARN_DRAFTING_EFFORT = 'medium' as const;
export const MAX_CONCURRENT_LEARN_WORKERS = 8;
export const MAX_CONCURRENT_QUESTION_WORKERS = 5;
export const MAX_JOB_EVENT_DETAIL_CHARS = 420;

export type ReasoningOrder = 'first' | 'second' | 'third';
export type DuplicateRisk = 'low' | 'medium' | 'high';

export type SourceCitation = {
	citationId: string;
	pageNumber: number;
	noteFile: string;
	chunkTitle: string;
	quote?: string;
	chunkIndex: number;
};

export type TopicMapItem = {
	topicId: string;
	title: string;
	summary: string;
	pageNumbers: number[];
	learningObjectives: string[];
	keyTerms: string[];
	suggestedTypes?: QuestionType[];
	estimatedQuestionCapacity: number;
};

export type CandidateQuestion = {
	type: 'multiple_choice';
	stem: string;
	options: string[];
	correctAnswers: string[];
	rationale: string;
	questionType?: QuestionType;
	reasoningOrder?: ReasoningOrder;
	topicId: string;
	topicTitle: string;
	sourcePageNumbers: number[];
	sourceCitations?: SourceCitation[];
	duplicateRisk: DuplicateRisk;
	similarQuestionIds: Id<'question'>[];
	cognitiveTemplate?: string;
	metadata: {
		model: string;
		agentThreadId?: string;
		jobId?: Id<'questionStudioJobs'>;
		harnessVersion?: string;
		reviewMode?: 'local' | 'independent';
		curatorEditedAt?: number;
		curatorRevision?: number;
		sourceDocumentId: Id<'contentLib'>;
	};
};

export type QuestionBlueprint = {
	slotId: string;
	topicId: string;
	questionType: QuestionType;
	cognitiveTemplate: string;
	targetObjective: string;
	distractorStrategy: string;
};

export type GenerationPlan = {
	workerBatches: Array<{
		taskId: string;
		label: string;
		plannedCount: number;
		questionType?: QuestionType;
		reasoningOrder?: ReasoningOrder;
		topicCount: number;
		topicTitles: string[];
		sourcePages: number[];
		cognitiveTemplate?: string;
		targetObjective?: string;
	}>;
	topicAllocations: Array<{
		taskId: string;
		topicId: string;
		topicTitle: string;
		plannedCount: number;
		questionType?: QuestionType;
		reasoningOrder?: ReasoningOrder;
		sourcePages: number[];
		notes: string;
	}>;
	coverageNotes: string[];
	riskNotes: string[];
};

export type LiveWorkerTopicAllocation = {
	topic: TopicMapItem;
	plannedCount: number;
};

export type LiveWorkerTask = {
	taskId: string;
	topicAllocations: LiveWorkerTopicAllocation[];
	counts: QuestionCounts;
	plannedCount: number;
	questionType: QuestionType;
	blueprints?: QuestionBlueprint[];
	reservedConcepts?: string[];
};

export type CandidateReview = {
	candidateIndex: number;
	verdict: 'accept' | 'revise' | 'reject';
	reasons: string[];
	sourceSupport: 'strong' | 'partial' | 'weak';
	answerQuality: 'clear' | 'ambiguous';
	revisedStem?: string;
	revisedRationale?: string;
};

export type JobEvent = {
	at: number;
	label: string;
	detail?: string;
};

export type GenerationJobSnapshot = Doc<'questionStudioJobs'> & {
	moduleTitle?: string;
	moduleClassId?: Id<'class'>;
	workerNotes?: string[];
	candidates: CandidateQuestion[];
};

export type ExistingQuestionSummary = {
	_id: Id<'question'>;
	stem: string;
	options: string[];
	correctAnswers: string[];
	rationale?: string;
	status: string;
	searchText?: string;
	sourceDocumentId?: Id<'contentLib'>;
	sourcePageNumbers?: number[];
	sourceCitations?: SourceCitation[];
	topicTitle?: string;
	reasoningOrder?: ReasoningOrder;
	questionType?: QuestionType;
};

export type GenerationContext = {
	user: { _id: Id<'users'>; role?: 'dev' | 'admin' | 'curator'; cohortId?: Id<'cohort'> };
	document: Doc<'contentLib'>;
	module: Doc<'module'>;
	classDoc: Doc<'class'>;
	existingQuestions: ExistingQuestionSummary[];
};

export type DocumentMappingContext = {
	user?: { _id: Id<'users'>; role?: 'dev' | 'admin' | 'curator'; cohortId?: Id<'cohort'> };
	document: Doc<'contentLib'>;
};

export type QueuedGenerationResult = {
	requestedCount: number;
	workerCount: number;
	queued: boolean;
};

export type StoredMarkdownPage = {
	pageNumber: number;
	text: string;
};

export type DocumentRagFilters = {
	sourceType: string;
	sourceDocumentId: string;
	pageNumber: string;
	chunkType: string;
};

export type DocumentRagMetadata = {
	cohortId: string;
	documentId: string;
	r2Key: string;
	sourceType: string;
	title: string;
	originalFileName?: string;
	mimeType?: string;
	pageCount: number;
	model: string;
	extractionProvider: string;
	extractionArtifactKeys?: string[];
};

export function questionStudioOpenAI() {
	return createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function assertQuestionStudioKey() {
	if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
}

export function openRouter() {
	return createOpenAI({
		name: 'openrouter',
		baseURL: 'https://openrouter.ai/api/v1',
		apiKey: process.env.OPENROUTER_API_KEY ?? 'missing-openrouter-api-key',
		headers: {
			'X-OpenRouter-Title': 'LearnTerms Question Studio'
		}
	});
}

export function assertOpenRouterKey() {
	if (!process.env.OPENROUTER_API_KEY) {
		throw new Error('OPENROUTER_API_KEY is not configured');
	}
}

export const reasoningOrderValidator = v.union(
	v.literal('first'),
	v.literal('second'),
	v.literal('third')
);

export const questionTypeValidator = v.union(
	v.literal('learn'),
	v.literal('clinical'),
	v.literal('criticalThinking')
);

export const candidateValidator = v.object({
	type: v.literal('multiple_choice'),
	stem: v.string(),
	options: v.array(v.string()),
	correctAnswers: v.array(v.string()),
	rationale: v.string(),
	questionType: v.optional(questionTypeValidator),
	reasoningOrder: v.optional(reasoningOrderValidator),
	topicId: v.string(),
	topicTitle: v.string(),
	sourcePageNumbers: v.array(v.number()),
	sourceCitations: v.optional(
		v.array(
			v.object({
				citationId: v.string(),
				pageNumber: v.number(),
				noteFile: v.string(),
				chunkTitle: v.string(),
				quote: v.optional(v.string()),
				chunkIndex: v.number()
			})
		)
	),
	duplicateRisk: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
	similarQuestionIds: v.array(v.id('question')),
	cognitiveTemplate: v.optional(v.string()),
	metadata: v.object({
		model: v.string(),
		agentThreadId: v.optional(v.string()),
		jobId: v.optional(v.id('questionStudioJobs')),
		harnessVersion: v.optional(v.string()),
		reviewMode: v.optional(v.union(v.literal('local'), v.literal('independent'))),
		curatorEditedAt: v.optional(v.number()),
		curatorRevision: v.optional(v.number()),
		sourceDocumentId: v.id('contentLib')
	})
});

export const blueprintValidator = v.object({
	slotId: v.string(),
	topicId: v.string(),
	questionType: questionTypeValidator,
	cognitiveTemplate: v.string(),
	targetObjective: v.string(),
	distractorStrategy: v.string()
});

export const loopProgressValidator = v.object({
	enabled: v.optional(v.boolean()),
	pass: v.optional(
		v.union(v.literal('plan'), v.literal('draft'), v.literal('gate'), v.literal('done'))
	),
	blueprintCount: v.optional(v.number()),
	blueprintSource: v.optional(v.union(v.literal('llm'), v.literal('fallback'))),
	gatePassedCount: v.optional(v.number()),
	gateRejectedCount: v.optional(v.number()),
	selectedCount: v.optional(v.number()),
	dedupedCount: v.optional(v.number())
});

export const generationPlanValidator = v.object({
	workerBatches: v.array(
		v.object({
			taskId: v.string(),
			label: v.string(),
			plannedCount: v.number(),
			questionType: v.optional(questionTypeValidator),
			reasoningOrder: v.optional(reasoningOrderValidator),
			topicCount: v.number(),
			topicTitles: v.array(v.string()),
			sourcePages: v.array(v.number()),
			cognitiveTemplate: v.optional(v.string()),
			targetObjective: v.optional(v.string())
		})
	),
	topicAllocations: v.array(
		v.object({
			taskId: v.string(),
			topicId: v.string(),
			topicTitle: v.string(),
			plannedCount: v.number(),
			questionType: v.optional(questionTypeValidator),
			reasoningOrder: v.optional(reasoningOrderValidator),
			sourcePages: v.array(v.number()),
			notes: v.string()
		})
	),
	coverageNotes: v.array(v.string()),
	riskNotes: v.array(v.string())
});

export const candidateReviewValidator = v.object({
	candidateIndex: v.number(),
	verdict: v.union(v.literal('accept'), v.literal('revise'), v.literal('reject')),
	reasons: v.array(v.string()),
	sourceSupport: v.union(v.literal('strong'), v.literal('partial'), v.literal('weak')),
	answerQuality: v.union(v.literal('clear'), v.literal('ambiguous')),
	revisedStem: v.optional(v.string()),
	revisedRationale: v.optional(v.string())
});

export const topicInputValidator = v.object({
	topicId: v.string(),
	title: v.string(),
	summary: v.string(),
	pageNumbers: v.array(v.number()),
	learningObjectives: v.array(v.string()),
	keyTerms: v.array(v.string()),
	suggestedTypes: v.optional(v.array(questionTypeValidator)),
	estimatedQuestionCapacity: v.number()
});

export const liveWorkerTaskValidator = v.object({
	taskId: v.string(),
	topicAllocations: v.array(
		v.object({
			topic: topicInputValidator,
			plannedCount: v.number()
		})
	),
	counts: v.object({
		learn: v.number(),
		clinical: v.number(),
		criticalThinking: v.number()
	}),
	plannedCount: v.number(),
	questionType: questionTypeValidator,
	blueprints: v.optional(v.array(blueprintValidator)),
	reservedConcepts: v.optional(v.array(v.string()))
});

export const topicMapSchema = z.object({
	topics: z
		.array(
			z.object({
				topicId: z.string().min(2).max(80),
				title: z.string().min(2).max(120),
				summary: z.string().min(10).max(900),
				pageNumbers: z.array(z.number().int().positive()).min(1),
				learningObjectives: z.array(z.string().min(3).max(180)).min(1).max(6),
				keyTerms: z.array(z.string().min(1).max(80)).max(12),
				suggestedTypes: z
					.array(z.enum(['learn', 'clinical', 'criticalThinking']))
					.min(1)
					.max(3),
				estimatedQuestionCapacity: z.number().int().min(1).max(10)
			})
		)
		.min(1)
		.max(24)
});
