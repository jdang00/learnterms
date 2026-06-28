import { createOpenAI } from '@ai-sdk/openai';
import { v } from 'convex/values';
import { z } from 'zod/v4';
import type { Doc, Id } from '../_generated/dataModel';

export const QUESTION_STUDIO_FLASH_MODEL = 'deepseek/deepseek-v4-flash';
export const QUESTION_STUDIO_MODEL = QUESTION_STUDIO_FLASH_MODEL;
export const QUESTION_STUDIO_PROVIDER_OPTIONS = {
	openai: {
		reasoningEffort: 'low'
	}
} as const;
export const questionStudioModelValidator = v.string();
export const EMBEDDING_MODEL = 'openai/text-embedding-3-large';
export const EMBEDDING_DIMENSION = 3072;
export const MAX_GENERATED_QUESTIONS = 30;
export const MAX_QUESTIONS_PER_MODULE = 150;
export const MAX_SOURCE_CHARS = 80_000;
export const MAX_TOPIC_SOURCE_CHARS = 60_000;
export const MAX_WORKER_SOURCE_CHARS = 18_000;
export const MAX_WORKER_RAG_CHARS = 5_000;
export const MAX_WORKER_RESEARCH_CHARS = 2_400;
export const MAX_REVIEW_REASON_CHARS = 320;
export const MAX_QUESTIONS_PER_WORKER = 1;
export const MAX_JOB_EVENT_DETAIL_CHARS = 420;
export const WORKER_DRAFT_MAX_OUTPUT_TOKENS = 1_100;
export const MAX_EXTRA_RECOVERY_WORKERS = 6;
export const RECOVERY_WORKER_RATIO = 0.6;

export type ReasoningOrder = 'first' | 'second' | 'third';
export type DuplicateRisk = 'low' | 'medium' | 'high';
export type QuestionStudioModel = string;

export type SourceCitation = {
	citationId: string;
	pageNumber: number;
	noteFile: string;
	chunkTitle: string;
	chunkIndex: number;
};

export type TopicMapItem = {
	topicId: string;
	title: string;
	summary: string;
	pageNumbers: number[];
	learningObjectives: string[];
	keyTerms: string[];
	suggestedOrders: ReasoningOrder[];
	estimatedQuestionCapacity: number;
};

export type CandidateQuestion = {
	type: 'multiple_choice';
	stem: string;
	options: string[];
	correctAnswers: string[];
	rationale: string;
	reasoningOrder: ReasoningOrder;
	topicId: string;
	topicTitle: string;
	sourcePageNumbers: number[];
	sourceCitations?: SourceCitation[];
	duplicateRisk: DuplicateRisk;
	similarQuestionIds: Id<'question'>[];
	metadata: {
		model: string;
		agentThreadId?: string;
		sourceDocumentId: Id<'contentLib'>;
	};
};

export type GenerationPlan = {
	workerBatches: Array<{
		taskId: string;
		label: string;
		plannedCount: number;
		reasoningOrder: ReasoningOrder;
		topicCount: number;
		topicTitles: string[];
		sourcePages: number[];
	}>;
	topicAllocations: Array<{
		taskId: string;
		topicId: string;
		topicTitle: string;
		plannedCount: number;
		reasoningOrder: ReasoningOrder;
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
	counts: Record<ReasoningOrder, number>;
	plannedCount: number;
	reasoningOrder: ReasoningOrder;
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

export type MapDocumentTopicMapResult = {
	threadId: string;
	model: string;
	documentId: Id<'contentLib'>;
	pageRange: { startPage: number; endPage: number };
	topics: TopicMapItem[];
	topicMapId?: Id<'questionStudioTopicMaps'>;
	cached: boolean;
	updatedAt?: number;
	usage: unknown;
};

export type QueuedGenerationResult = {
	requestedCount: number;
	workerCount: number;
	queued: boolean;
};

export type GenerateObjectOptions = {
	prompt: string;
	schema: unknown;
	schemaName?: string;
	schemaDescription?: string;
	providerOptions?: unknown;
	callSettings?: {
		maxOutputTokens?: number;
		temperature?: number;
		maxRetries?: number;
	};
	experimental_repairText?: (options: { text: string; error: unknown }) => Promise<string | null>;
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

export function assertOperatorToken(token?: string) {
	if (!process.env.RAG_MIGRATION_TOKEN || token !== process.env.RAG_MIGRATION_TOKEN) {
		throw new Error('Unauthorized');
	}
}

export function questionStudioProviderOptions(model: QuestionStudioModel) {
	return model === QUESTION_STUDIO_FLASH_MODEL ? QUESTION_STUDIO_PROVIDER_OPTIONS : undefined;
}

export function shouldUseStructuredOutput(model: QuestionStudioModel) {
	return model === QUESTION_STUDIO_FLASH_MODEL;
}

export const reasoningOrderValidator = v.union(
	v.literal('first'),
	v.literal('second'),
	v.literal('third')
);

export const candidateValidator = v.object({
	type: v.literal('multiple_choice'),
	stem: v.string(),
	options: v.array(v.string()),
	correctAnswers: v.array(v.string()),
	rationale: v.string(),
	reasoningOrder: reasoningOrderValidator,
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
				chunkIndex: v.number()
			})
		)
	),
	duplicateRisk: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
	similarQuestionIds: v.array(v.id('question')),
	metadata: v.object({
		model: v.string(),
		agentThreadId: v.optional(v.string()),
		sourceDocumentId: v.id('contentLib')
	})
});

export const generationPlanValidator = v.object({
	workerBatches: v.array(
		v.object({
			taskId: v.string(),
			label: v.string(),
			plannedCount: v.number(),
			reasoningOrder: reasoningOrderValidator,
			topicCount: v.number(),
			topicTitles: v.array(v.string()),
			sourcePages: v.array(v.number())
		})
	),
	topicAllocations: v.array(
		v.object({
			taskId: v.string(),
			topicId: v.string(),
			topicTitle: v.string(),
			plannedCount: v.number(),
			reasoningOrder: reasoningOrderValidator,
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
	suggestedOrders: v.array(reasoningOrderValidator),
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
		first: v.number(),
		second: v.number(),
		third: v.number()
	}),
	plannedCount: v.number(),
	reasoningOrder: reasoningOrderValidator
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
				suggestedOrders: z
					.array(z.enum(['first', 'second', 'third']))
					.min(1)
					.max(3),
				estimatedQuestionCapacity: z.number().int().min(1).max(10)
			})
		)
		.min(1)
		.max(24)
});

export const candidateSchema = z.object({
	questions: z
		.array(
			z.object({
				type: z.literal('multiple_choice'),
				stem: z.string().min(12).max(900),
				options: z.array(z.string().min(1).max(260)).min(3).max(5),
				correctAnswers: z.array(z.string().min(1).max(260)).length(1),
				rationale: z.string().min(20).max(1600),
				reasoningOrder: z.enum(['first', 'second', 'third']),
				topicId: z.string().min(1).max(80),
				topicTitle: z.string().min(2).max(120),
				sourcePageNumbers: z.array(z.number().int().positive()).optional(),
				sourceCitations: z
					.array(
						z.object({
							citationId: z.string().min(1).max(80),
							pageNumber: z.number().int().positive(),
							noteFile: z.string().min(1).max(260),
							chunkTitle: z.string().min(1).max(180),
							chunkIndex: z.number().int().min(0)
						})
					)
					.max(4)
					.optional(),
				duplicateRisk: z.enum(['low', 'medium', 'high']).optional(),
				similarQuestionIds: z.array(z.string()).optional()
			})
		)
		.min(1)
		.max(MAX_GENERATED_QUESTIONS)
});
