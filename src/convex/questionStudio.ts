import { Agent, createTool, stepCountIs } from '@convex-dev/agent';
import { RAG } from '@convex-dev/rag';
import { RateLimiter, MINUTE } from '@convex-dev/rate-limiter';
import { createOpenAI } from '@ai-sdk/openai';
import { v } from 'convex/values';
import {
	action,
	internalAction,
	internalMutation,
	internalQuery,
	mutation,
	query
} from './_generated/server';
import { NoObjectGeneratedError, type ToolSet } from 'ai';
import { components, internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { z } from 'zod/v4';
import { r2 } from './r2Documents';
import { applyQuestionCreationDeltaAndEvaluateBadges } from './badgeEngine';

const QUESTION_STUDIO_FLASH_MODEL = 'deepseek/deepseek-v4-flash';
const QUESTION_STUDIO_MODEL = QUESTION_STUDIO_FLASH_MODEL;
const QUESTION_STUDIO_PROVIDER_OPTIONS = {
	openai: {
		reasoningEffort: 'low'
	}
} as const;
const questionStudioModelValidator = v.string();
const EMBEDDING_MODEL = 'openai/text-embedding-3-large';
const EMBEDDING_DIMENSION = 3072;
const MAX_GENERATED_QUESTIONS = 30;
const MAX_QUESTIONS_PER_MODULE = 150;
const MAX_SOURCE_CHARS = 80_000;
const MAX_TOPIC_SOURCE_CHARS = 60_000;
const MAX_WORKER_SOURCE_CHARS = 18_000;
const MAX_WORKER_RAG_CHARS = 5_000;
const MAX_WORKER_RESEARCH_CHARS = 2_400;
const MAX_REVIEW_REASON_CHARS = 320;
const MAX_QUESTIONS_PER_WORKER = 1;
const MAX_JOB_EVENT_DETAIL_CHARS = 420;
const WORKER_DRAFT_MAX_OUTPUT_TOKENS = 1_100;
const MAX_EXTRA_RECOVERY_WORKERS = 6;
const RECOVERY_WORKER_RATIO = 0.6;

type ReasoningOrder = 'first' | 'second' | 'third';
type DuplicateRisk = 'low' | 'medium' | 'high';
type QuestionStudioModel = string;

type SourceCitation = {
	citationId: string;
	pageNumber: number;
	noteFile: string;
	chunkTitle: string;
	chunkIndex: number;
};

type TopicMapItem = {
	topicId: string;
	title: string;
	summary: string;
	pageNumbers: number[];
	learningObjectives: string[];
	keyTerms: string[];
	suggestedOrders: ReasoningOrder[];
	estimatedQuestionCapacity: number;
};

type CandidateQuestion = {
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

type GenerationPlan = {
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

type LiveWorkerTopicAllocation = {
	topic: TopicMapItem;
	plannedCount: number;
};

type LiveWorkerTask = {
	taskId: string;
	topicAllocations: LiveWorkerTopicAllocation[];
	counts: Record<ReasoningOrder, number>;
	plannedCount: number;
	reasoningOrder: ReasoningOrder;
};

type CandidateReview = {
	candidateIndex: number;
	verdict: 'accept' | 'revise' | 'reject';
	reasons: string[];
	sourceSupport: 'strong' | 'partial' | 'weak';
	answerQuality: 'clear' | 'ambiguous';
	revisedStem?: string;
	revisedRationale?: string;
};

type JobEvent = {
	at: number;
	label: string;
	detail?: string;
};

type GenerationJobSnapshot = Doc<'questionStudioJobs'> & {
	moduleTitle?: string;
	moduleClassId?: Id<'class'>;
	candidates: CandidateQuestion[];
};

type ExistingQuestionSummary = {
	_id: Id<'question'>;
	stem: string;
	options: string[];
	correctAnswers: string[];
	rationale?: string;
	status: string;
	searchText?: string;
};

type GenerationContext = {
	user: { _id: Id<'users'>; role?: 'dev' | 'admin' | 'curator'; cohortId?: Id<'cohort'> };
	document: Doc<'contentLib'>;
	module: Doc<'module'>;
	classDoc: Doc<'class'>;
	existingQuestions: ExistingQuestionSummary[];
};

type DocumentMappingContext = {
	user?: { _id: Id<'users'>; role?: 'dev' | 'admin' | 'curator'; cohortId?: Id<'cohort'> };
	document: Doc<'contentLib'>;
};

type MapDocumentTopicMapResult = {
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

type QueuedGenerationResult = {
	requestedCount: number;
	workerCount: number;
	queued: boolean;
};

type QuestionStudioAgent = ReturnType<typeof createQuestionStudioAgent>;
type GenerateObjectOptions = {
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

type StoredMarkdownPage = {
	pageNumber: number;
	text: string;
};

type DocumentRagFilters = {
	sourceType: string;
	sourceDocumentId: string;
	pageNumber: string;
	chunkType: string;
};

type DocumentRagMetadata = {
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

const questionStudioRateLimiter = new RateLimiter(components.rateLimiter, {
	questionStudioGenerationStart: { kind: 'fixed window', rate: 6, period: 10 * MINUTE },
	questionStudioGlobalGenerationStart: { kind: 'fixed window', rate: 80, period: MINUTE },
	questionStudioTokenUsagePerUser: {
		kind: 'token bucket',
		rate: 120_000,
		period: MINUTE,
		capacity: 240_000
	},
	questionStudioGlobalTokenUsage: {
		kind: 'token bucket',
		rate: 1_000_000,
		period: MINUTE,
		capacity: 2_000_000
	}
});

function openRouter() {
	return createOpenAI({
		name: 'openrouter',
		baseURL: 'https://openrouter.ai/api/v1',
		apiKey: process.env.OPENROUTER_API_KEY ?? 'missing-openrouter-api-key',
		headers: {
			'X-OpenRouter-Title': 'LearnTerms Question Studio'
		}
	});
}

function assertOpenRouterKey() {
	if (!process.env.OPENROUTER_API_KEY) {
		throw new Error('OPENROUTER_API_KEY is not configured');
	}
}

function assertOperatorToken(token?: string) {
	if (!process.env.RAG_MIGRATION_TOKEN || token !== process.env.RAG_MIGRATION_TOKEN) {
		throw new Error('Unauthorized');
	}
}

function normalizeQuestionStudioModel(model?: string): QuestionStudioModel {
	const trimmed = cleanPlainText(model ?? '', 160);
	return trimmed || QUESTION_STUDIO_MODEL;
}

function questionStudioProviderOptions(model: QuestionStudioModel) {
	return model === QUESTION_STUDIO_FLASH_MODEL ? QUESTION_STUDIO_PROVIDER_OPTIONS : undefined;
}

function shouldUseStructuredOutput(model: QuestionStudioModel) {
	return model === QUESTION_STUDIO_FLASH_MODEL;
}

const documentRag = new RAG<DocumentRagFilters, DocumentRagMetadata>(components.rag, {
	textEmbeddingModel: openRouter().embedding(EMBEDDING_MODEL),
	embeddingDimension: EMBEDDING_DIMENSION,
	filterNames: ['sourceType', 'sourceDocumentId', 'pageNumber', 'chunkType']
});

function createQuestionStudioAgent(tools?: ToolSet, model = QUESTION_STUDIO_MODEL) {
	return new Agent(components.agent, {
		name: 'Question Studio Curator',
		languageModel: openRouter().chat(model),
		instructions: [
			'You are a LearnTerms curriculum question curator.',
			'Use only the provided source notes and context.',
			'Prefer precise, teachable medical or course-relevant phrasing.',
			'Never invent facts that are not supported by the retrieved notes.',
			'Multiple choice questions must have one correct answer, plausible distractors, and a concise rationale.'
		].join('\n'),
		tools,
		stopWhen: stepCountIs(4),
		usageHandler: async (ctx, { usage, userId }) => {
			if (!userId || !usage?.totalTokens) return;
			await questionStudioRateLimiter.limit(ctx, 'questionStudioTokenUsagePerUser', {
				key: userId,
				count: usage.totalTokens,
				reserve: true
			});
			await questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalTokenUsage', {
				count: usage.totalTokens,
				reserve: true
			});
		}
	});
}

const reasoningOrderValidator = v.union(
	v.literal('first'),
	v.literal('second'),
	v.literal('third')
);

const candidateValidator = v.object({
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

const generationPlanValidator = v.object({
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

const candidateReviewValidator = v.object({
	candidateIndex: v.number(),
	verdict: v.union(v.literal('accept'), v.literal('revise'), v.literal('reject')),
	reasons: v.array(v.string()),
	sourceSupport: v.union(v.literal('strong'), v.literal('partial'), v.literal('weak')),
	answerQuality: v.union(v.literal('clear'), v.literal('ambiguous')),
	revisedStem: v.optional(v.string()),
	revisedRationale: v.optional(v.string())
});

const topicInputValidator = v.object({
	topicId: v.string(),
	title: v.string(),
	summary: v.string(),
	pageNumbers: v.array(v.number()),
	learningObjectives: v.array(v.string()),
	keyTerms: v.array(v.string()),
	suggestedOrders: v.array(reasoningOrderValidator),
	estimatedQuestionCapacity: v.number()
});

const liveWorkerTaskValidator = v.object({
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

const topicMapSchema = z.object({
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

const candidateSchema = z.object({
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

function documentNamespace(documentId: string) {
	return `document:${documentId}`;
}

function parseStoredMarkdownPages(markdown: string): StoredMarkdownPage[] {
	return markdown
		.split(/\n\n---\n\n/g)
		.map((section) => {
			const match = section.match(/^<!--\s*page:(\d+)\s*-->\s*/);
			if (!match) return null;
			const pageNumber = Number(match[1]);
			const text = section.slice(match[0].length).trim();
			if (!Number.isFinite(pageNumber) || !text) return null;
			return { pageNumber, text };
		})
		.filter((page): page is StoredMarkdownPage => Boolean(page));
}

async function loadMarkdownPages(document: Doc<'contentLib'>): Promise<StoredMarkdownPage[]> {
	const markdownKey = document.metadata?.extractionArtifactKeys?.find((key) => key.endsWith('.md'));
	if (!markdownKey) {
		throw new Error('No extracted markdown is available for this document.');
	}
	const signedUrl = await r2.getUrl(markdownKey, { expiresIn: 60 * 5 });
	const response = await fetch(signedUrl);
	if (!response.ok) {
		throw new Error(`Could not load extracted notes (${response.status})`);
	}
	return parseStoredMarkdownPages(await response.text());
}

function selectPages(
	pages: StoredMarkdownPage[],
	startPage?: number,
	endPage?: number
): StoredMarkdownPage[] {
	const minPage = Math.min(...pages.map((page) => page.pageNumber));
	const maxPage = Math.max(...pages.map((page) => page.pageNumber));
	const start = Math.max(minPage, Math.floor(startPage ?? minPage));
	const end = Math.min(maxPage, Math.floor(endPage ?? maxPage));
	if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
		throw new Error('Invalid page range');
	}
	const selected = pages.filter((page) => page.pageNumber >= start && page.pageNumber <= end);
	if (selected.length === 0) throw new Error('No extracted text found for that page range');
	return selected;
}

function pagesToPromptText(pages: StoredMarkdownPage[], maxChars: number) {
	const text = pages.map((page) => `Page ${page.pageNumber}\n\n${page.text}`).join('\n\n---\n\n');
	return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n[Source clipped]` : text;
}

function normalizeText(value: string) {
	return String(value ?? '')
		.toLowerCase()
		.replace(/<[^>]*>/g, ' ')
		.replace(/&[a-z0-9#]+;/gi, ' ')
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function cleanPlainText(value: string, maxLength: number) {
	return String(value ?? '')
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, maxLength);
}

function tokenize(value: string) {
	const stop = new Set([
		'the',
		'a',
		'an',
		'and',
		'or',
		'of',
		'to',
		'in',
		'for',
		'with',
		'is',
		'are',
		'which',
		'what',
		'best',
		'most',
		'following'
	]);
	return normalizeText(value)
		.split(' ')
		.filter((token) => token.length > 2 && !stop.has(token));
}

function jaccard(a: string[], b: string[]) {
	const left = new Set(a);
	const right = new Set(b);
	if (left.size === 0 || right.size === 0) return 0;
	let intersection = 0;
	for (const token of left) if (right.has(token)) intersection++;
	return intersection / (left.size + right.size - intersection);
}

function stemSimilarity(a: string, b: string) {
	const normalizedA = normalizeText(a);
	const normalizedB = normalizeText(b);
	if (!normalizedA || !normalizedB) return 0;
	if (normalizedA === normalizedB) return 1;
	if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) return 0.92;
	return jaccard(tokenize(normalizedA), tokenize(normalizedB));
}

function answerOverlap(candidate: CandidateQuestion, existing: ExistingQuestionSummary) {
	const candidateAnswer = normalizeText(candidate.correctAnswers.join(' '));
	const existingAnswers = new Set(
		existing.correctAnswers
			.map(
				(answerId) =>
					existing.options.find((option) => option.startsWith(`${answerId}:`)) ?? answerId
			)
			.map(normalizeText)
	);
	if (!candidateAnswer || existingAnswers.size === 0) return 0;
	let best = 0;
	for (const answer of existingAnswers) {
		best = Math.max(best, jaccard(tokenize(candidateAnswer), tokenize(answer)));
	}
	return best;
}

function scoreDuplicateRisk(
	candidate: CandidateQuestion,
	existingQuestions: ExistingQuestionSummary[],
	otherCandidates: CandidateQuestion[] = []
): { risk: DuplicateRisk; similarQuestionIds: Id<'question'>[] } {
	let risk: DuplicateRisk = 'low';
	const similarQuestionIds: Id<'question'>[] = [];

	for (const existing of existingQuestions) {
		const stemScore = stemSimilarity(candidate.stem, existing.stem);
		const answerScore = answerOverlap(candidate, existing);
		const rationaleScore = stemSimilarity(
			candidate.rationale,
			existing.rationale ?? existing.searchText ?? ''
		);

		if (stemScore >= 0.78 || (stemScore >= 0.62 && answerScore >= 0.45)) {
			risk = 'high';
			similarQuestionIds.push(existing._id);
			continue;
		}
		if (stemScore >= 0.5 || answerScore >= 0.65 || rationaleScore >= 0.62) {
			if (risk !== 'high') risk = 'medium';
			similarQuestionIds.push(existing._id);
		}
	}

	for (const other of otherCandidates) {
		const stemScore = stemSimilarity(candidate.stem, other.stem);
		if (stemScore >= 0.78) risk = 'high';
		else if (stemScore >= 0.55 && risk === 'low') risk = 'medium';
	}

	return { risk, similarQuestionIds: [...new Set(similarQuestionIds)].slice(0, 5) };
}

function validateCounts(counts: { first: number; second: number; third: number }) {
	const normalized = {
		first: Math.floor(counts.first || 0),
		second: Math.floor(counts.second || 0),
		third: Math.floor(counts.third || 0)
	};
	if (normalized.first < 0 || normalized.second < 0 || normalized.third < 0) {
		throw new Error('Question counts cannot be negative');
	}
	const total = normalized.first + normalized.second + normalized.third;
	if (total < 1 || total > MAX_GENERATED_QUESTIONS) {
		throw new Error(`Create between 1 and ${MAX_GENERATED_QUESTIONS} questions`);
	}
	return { counts: normalized, total };
}

function addRecoveryWorkerBuffer(
	counts: Record<ReasoningOrder, number>,
	requestedTotal: number
): Record<ReasoningOrder, number> {
	const extraBudget = Math.min(
		MAX_EXTRA_RECOVERY_WORKERS,
		Math.max(0, MAX_GENERATED_QUESTIONS - requestedTotal),
		Math.ceil(requestedTotal * RECOVERY_WORKER_RATIO)
	);
	if (extraBudget <= 0) return counts;
	const buffered = { ...counts };
	const orders = (['first', 'second', 'third'] as const)
		.filter((order) => counts[order] > 0)
		.sort((a, b) => counts[b] - counts[a]);
	if (orders.length === 0) return buffered;
	for (let index = 0; index < extraBudget; index++) {
		buffered[orders[index % orders.length]] += 1;
	}
	return buffered;
}

function existingQuestionStemsToPrompt(questions: ExistingQuestionSummary[]) {
	if (questions.length === 0) return 'No existing questions in this destination module.';
	return questions
		.slice(0, 20)
		.map((question, index) => `${index + 1}. ${cleanPlainText(question.stem, 260)}`)
		.join('\n\n');
}

function buildFocusInstruction(focusNotes?: string) {
	const cleaned = cleanPlainText(focusNotes ?? '', 1800);
	return cleaned
		? [
				'TOP PRIORITY FOCUS NOTES:',
				cleaned,
				'These focus notes outrank the topic allocation when choosing what to emphasize. Use them to decide angle, difficulty, clinical framing, and what to avoid.'
			].join('\n')
		: 'TOP PRIORITY FOCUS NOTES: None provided. Prioritize high-yield board-style coverage from the selected topics.';
}

function formatStructuredOutputError(stage: string, error: unknown) {
	if (NoObjectGeneratedError.isInstance(error)) {
		const sample = error.text ? ` Returned: ${cleanPlainText(error.text, 320)}` : '';
		return `${stage} returned an object that did not match the expected structure.${sample}`;
	}
	return error instanceof Error ? error.message : `${stage} failed with an unknown error.`;
}

function firstBalancedJsonValue(text: string) {
	const objectStart = text.indexOf('{');
	const arrayStart = text.indexOf('[');
	const start =
		objectStart === -1
			? arrayStart
			: arrayStart === -1
				? objectStart
				: Math.min(objectStart, arrayStart);
	if (start === -1) return null;
	const opener = text[start];
	const closer = opener === '{' ? '}' : ']';
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let index = start; index < text.length; index++) {
		const char = text[index];
		if (inString) {
			if (escaped) escaped = false;
			else if (char === '\\') escaped = true;
			else if (char === '"') inString = false;
			continue;
		}
		if (char === '"') {
			inString = true;
			continue;
		}
		if (char === opener) depth += 1;
		if (char === closer) depth -= 1;
		if (depth === 0) return text.slice(start, index + 1);
	}
	return null;
}

function parseModelJsonText(text?: string): unknown | null {
	if (!text) return null;
	const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((match) => match[1]);
	const candidates = [text, ...fenced, firstBalancedJsonValue(text)].filter(
		(candidate): candidate is string => Boolean(candidate?.trim())
	);
	for (const candidate of candidates) {
		const cleaned = candidate.trim().replace(/,\s*([}\]])/g, '$1');
		try {
			return JSON.parse(cleaned);
		} catch {
			// Try the next likely JSON fragment.
		}
	}
	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown) {
	if (Array.isArray(value)) return value;
	if (typeof value === 'string' && value.trim()) return [value];
	return value;
}

function numberArray(value: unknown) {
	const raw = Array.isArray(value) ? value : typeof value === 'number' ? [value] : value;
	return Array.isArray(raw)
		? raw.map((item) => Number(item)).filter((item) => Number.isFinite(item))
		: raw;
}

function normalizeCandidateDraftPayload(value: unknown): unknown {
	if (!isRecord(value)) return value;
	const questions = Array.isArray(value.questions) ? value.questions : value.question;
	if (!Array.isArray(questions)) return value;
	return {
		...value,
		questions: questions.map((question) => {
			if (!isRecord(question)) return question;
			return {
				...question,
				type: question.type ?? 'multiple_choice',
				stem:
					question.stem ??
					question.questionText ??
					question.question ??
					question.prompt ??
					question.itemStem,
				correctAnswers: stringArray(
					question.correctAnswers ??
						question.correctAnswer ??
						question.answer ??
						question.correctOption
				),
				rationale: question.rationale ?? question.explanation ?? question.reasoning,
				sourcePageNumbers: numberArray(
					question.sourcePageNumbers ?? question.pageNumbers ?? question.pages
				),
				sourceCitations:
					question.sourceCitations ?? question.citations ?? question.evidenceCitations
			};
		})
	};
}

function safeParseSchema(schema: unknown, value: unknown): unknown | null {
	const parser = schema as {
		safeParse?: (value: unknown) => { success: boolean; data?: unknown };
	};
	if (typeof parser.safeParse !== 'function') return null;
	const parsed = parser.safeParse(value);
	return parsed.success ? parsed.data : null;
}

function createCandidateDraftRepairText(schema: unknown) {
	return async ({ text }: { text: string; error: unknown }) => {
		const parsed = parseModelJsonText(text);
		if (!parsed) return null;
		const normalized = normalizeCandidateDraftPayload(parsed);
		const validated = safeParseSchema(schema, normalized);
		return validated ? JSON.stringify(validated) : null;
	};
}

function recoverStructuredObjectFromError(error: unknown, schema: unknown) {
	if (!NoObjectGeneratedError.isInstance(error)) return null;
	const parsed = parseModelJsonText(error.text);
	if (!parsed) return null;
	const normalized = normalizeCandidateDraftPayload(parsed);
	const validated = safeParseSchema(schema, normalized);
	return validated ? { object: validated, usage: error.usage ?? null } : null;
}

function buildLiveGenerationWork(
	topics: TopicMapItem[],
	counts: Record<ReasoningOrder, number>
): { plan: GenerationPlan; tasks: LiveWorkerTask[] } {
	const orderCounts = {
		first: 0,
		second: 0,
		third: 0
	};
	const pickTopicPool = (order: ReasoningOrder) => {
		const ranked = [...topics].sort((a, b) => {
			const aPreferred = a.suggestedOrders.includes(order) ? 1 : 0;
			const bPreferred = b.suggestedOrders.includes(order) ? 1 : 0;
			if (aPreferred !== bPreferred) return bPreferred - aPreferred;
			if (a.estimatedQuestionCapacity !== b.estimatedQuestionCapacity) {
				return b.estimatedQuestionCapacity - a.estimatedQuestionCapacity;
			}
			return a.title.localeCompare(b.title);
		});
		const preferred = ranked.filter((topic) => topic.suggestedOrders.includes(order));
		return preferred.length > 0 ? preferred : ranked;
	};

	const tasks: LiveWorkerTask[] = [];
	for (const order of ['first', 'second', 'third'] as const) {
		let remaining = counts[order];
		if (remaining <= 0) continue;
		const pool = pickTopicPool(order);
		let cursor = 0;
		while (remaining > 0) {
			const plannedCount = Math.min(MAX_QUESTIONS_PER_WORKER, remaining);
			const allocationByTopicId = new Map<string, LiveWorkerTopicAllocation>();
			for (let index = 0; index < plannedCount; index++) {
				const topic = pool[(cursor + index) % pool.length];
				const existing = allocationByTopicId.get(topic.topicId);
				if (existing) existing.plannedCount += 1;
				else allocationByTopicId.set(topic.topicId, { topic, plannedCount: 1 });
			}
			orderCounts[order] += 1;
			const topicAllocations = [...allocationByTopicId.values()];
			tasks.push({
				taskId: `${order}:batch:${orderCounts[order]}`,
				topicAllocations,
				counts: {
					first: order === 'first' ? plannedCount : 0,
					second: order === 'second' ? plannedCount : 0,
					third: order === 'third' ? plannedCount : 0
				},
				plannedCount,
				reasoningOrder: order
			});
			cursor += plannedCount;
			remaining -= plannedCount;
		}
	}

	const workerBatches = tasks.map((task) => ({
		taskId: task.taskId,
		label: taskLabel(task),
		plannedCount: task.plannedCount,
		reasoningOrder: task.reasoningOrder,
		topicCount: task.topicAllocations.length,
		topicTitles: task.topicAllocations.map((allocation) => allocation.topic.title),
		sourcePages: taskPageNumbers(task)
	}));
	const topicAllocations = tasks.flatMap((task) =>
		task.topicAllocations.map((allocation) => ({
			taskId: task.taskId,
			topicId: allocation.topic.topicId,
			topicTitle: allocation.topic.title,
			plannedCount: allocation.plannedCount,
			reasoningOrder: task.reasoningOrder,
			sourcePages: allocation.topic.pageNumbers,
			notes: `Assigned to ${taskLabel(task)}.`
		}))
	);
	return {
		tasks,
		plan: {
			workerBatches,
			topicAllocations,
			coverageNotes: [
				`Smart-batched ${tasks.reduce((sum, task) => sum + task.plannedCount, 0)} requested questions into ${tasks.length} worker${tasks.length === 1 ? '' : 's'} with a max of ${MAX_QUESTIONS_PER_WORKER} questions each.`
			],
			riskNotes:
				topics.length === 1 ? ['Only one selected topic, so duplicate pressure may be higher.'] : []
		}
	};
}

function taskTopics(task: LiveWorkerTask) {
	return task.topicAllocations.map((allocation) => allocation.topic);
}

function taskLabel(task: LiveWorkerTask) {
	if (task.topicAllocations.length === 1) {
		return `${task.reasoningOrder}-order: ${task.topicAllocations[0].topic.title}`;
	}
	return `${task.reasoningOrder}-order batch (${task.topicAllocations.length} topics)`;
}

function taskPageNumbers(task: LiveWorkerTask) {
	return [
		...new Set(task.topicAllocations.flatMap((allocation) => allocation.topic.pageNumbers))
	].sort((a, b) => a - b);
}

function pagesForTask(pages: StoredMarkdownPage[], task: LiveWorkerTask) {
	const pageSet = new Set(taskPageNumbers(task));
	const taskPages = pages.filter((page) => pageSet.has(page.pageNumber));
	return taskPages.length > 0 ? taskPages : pages.slice(0, 3);
}

function defaultWorkerRetrievalQuery(task: LiveWorkerTask) {
	return [
		`${task.reasoningOrder} order question batch`,
		task.topicAllocations.map((allocation) => allocation.topic.title).join('; '),
		task.topicAllocations.map((allocation) => allocation.topic.summary).join('\n'),
		task.topicAllocations
			.flatMap((allocation) => allocation.topic.learningObjectives)
			.slice(0, 10)
			.join('; '),
		task.topicAllocations
			.flatMap((allocation) => allocation.topic.keyTerms)
			.slice(0, 24)
			.join(', ')
	]
		.filter(Boolean)
		.join('\n');
}

function reasoningOrderPrompt() {
	return [
		'Reasoning-order definitions:',
		'- First-order: direct recall or recognition of one source-supported fact, term, threshold, association, or definition. Use a concise non-vignette stem; do not introduce a patient case.',
		'- Second-order: one-step application, mechanism, interpretation, calculation, or consequence. Brief context or test data is fine; avoid full patient-case framing.',
		'- Third-order: multi-step integration, comparison, diagnosis, or management. Usually use a compact case/data scenario requiring at least two source-supported facts.'
	].join('\n');
}

function questionWritingSkillPrompt() {
	return [
		'Question-writing skill:',
		'- Match the stem format to the requested reasoning order.',
		'- Use one near-miss distractor that would be right if a key detail changed.',
		'- Make the rationale teach a mechanism, distinction, trap, threshold, or course-relevant pearl.',
		'- Put numbers and thresholds into workflow or scenario context only when the order requires application.',
		'- Keep useful class-memory hooks if they are accurate and not distracting.',
		'- Prefer source-matched framing; use clinical/patient framing only when the source and reasoning order support it.',
		'- Every factual claim must be supported by retrieved citations.',
		'- Student-facing text must never mention the source, notes, document, page, slide, citation, or RAG.',
		'- Store evidence only in sourceCitations; the rationale must stand alone as teaching.'
	].join('\n');
}

function citationKey(citation: SourceCitation) {
	return `${citation.noteFile}:${citation.pageNumber}:${citation.chunkIndex}:${citation.chunkTitle}`;
}

function citationFromChunk(
	chunk: { metadata?: Record<string, unknown> },
	fallback: { noteFile: string; title: string },
	index: number
): SourceCitation | null {
	const metadata = chunk.metadata ?? {};
	const pageNumber = Number(metadata.pageNumber);
	if (!Number.isFinite(pageNumber) || pageNumber <= 0) return null;
	const chunkIndex = Number(metadata.chunkIndex);
	const noteFile = cleanPlainText(
		String(fallback.noteFile ?? metadata.r2Key ?? 'Extracted notes'),
		260
	);
	const chunkTitle = cleanPlainText(
		String(metadata.title ?? fallback.title ?? 'Source chunk'),
		180
	);
	return {
		citationId: `c${index + 1}`,
		pageNumber,
		noteFile,
		chunkTitle,
		chunkIndex: Number.isFinite(chunkIndex) && chunkIndex >= 0 ? chunkIndex : 0
	};
}

function citationsFromSearch(
	search: { results: Array<{ content: Array<{ metadata?: Record<string, unknown> }> }> },
	fallback: { noteFile: string; title: string }
) {
	const citations: SourceCitation[] = [];
	const seen = new Set<string>();
	for (const result of search.results) {
		for (const chunk of result.content) {
			const citation = citationFromChunk(chunk, fallback, citations.length);
			if (!citation) continue;
			const key = citationKey(citation);
			if (seen.has(key)) continue;
			seen.add(key);
			citations.push(citation);
			if (citations.length >= 8) return citations;
		}
	}
	return citations;
}

function normalizeJobEvent(event: JobEvent): JobEvent {
	return {
		at: event.at,
		label: cleanPlainText(event.label, 80),
		detail: event.detail ? cleanPlainText(event.detail, MAX_JOB_EVENT_DETAIL_CHARS) : undefined
	};
}

async function insertGenerationJobEvent(
	ctx: MutationCtx,
	job: Doc<'questionStudioJobs'>,
	event: JobEvent
) {
	await ctx.db.insert('questionStudioJobEvents', {
		jobId: job._id,
		cohortId: job.cohortId,
		...normalizeJobEvent(event)
	});
}

async function deleteGenerationJobRows(ctx: MutationCtx, jobId: Id<'questionStudioJobs'>) {
	const [events, candidates, reviews] = await Promise.all([
		ctx.db
			.query('questionStudioJobEvents')
			.withIndex('by_jobId', (q) => q.eq('jobId', jobId))
			.collect(),
		ctx.db
			.query('questionStudioJobCandidates')
			.withIndex('by_jobId', (q) => q.eq('jobId', jobId))
			.collect(),
		ctx.db
			.query('questionStudioJobReviews')
			.withIndex('by_jobId', (q) => q.eq('jobId', jobId))
			.collect()
	]);
	await Promise.all([
		...events.map((row) => ctx.db.delete(row._id)),
		...candidates.map((row) => ctx.db.delete(row._id)),
		...reviews.map((row) => ctx.db.delete(row._id))
	]);
}

async function hydrateGenerationJob(
	ctx: QueryCtx | MutationCtx,
	job: Doc<'questionStudioJobs'>
): Promise<GenerationJobSnapshot> {
	const module = await ctx.db.get(job.moduleId);
	const eventRows = await ctx.db
		.query('questionStudioJobEvents')
		.withIndex('by_jobId', (q) => q.eq('jobId', job._id))
		.collect();
	const candidateRows = await ctx.db
		.query('questionStudioJobCandidates')
		.withIndex('by_jobId_index', (q) => q.eq('jobId', job._id))
		.collect();
	const candidates =
		candidateRows.length > 0
			? candidateRows.sort((a, b) => a.index - b.index).map((row) => row.candidate)
			: [];
	const completedWorkerCount = eventRows.filter((row) => row.label === 'Worker complete').length;
	const failedWorkerCount = eventRows.filter((row) => row.label === 'Worker failed').length;
	return {
		...job,
		moduleTitle: module?.title,
		moduleClassId: module?.classId,
		eventCount: eventRows.length,
		candidateCount: candidates.length,
		completedWorkerCount,
		failedWorkerCount,
		candidates
	};
}

function hasProvenanceLanguage(text: string) {
	const normalized = text.toLowerCase();
	return [
		/\baccording to\b/,
		/\bthe source\b/,
		/\bsource material\b/,
		/\bsource notes\b/,
		/\bthe notes\b/,
		/\bthese notes\b/,
		/\bthe reference\b/,
		/\breference notes\b/,
		/\bthe document\b/,
		/\bthis document\b/,
		/\bpage\s+\d+\b/,
		/\bslide\s+\d*\b/,
		/\bcitation\b/,
		/\brag\b/
	].some((pattern) => pattern.test(normalized));
}

function candidateHasProvenanceLanguage(candidate: CandidateQuestion) {
	return [
		candidate.stem,
		candidate.rationale,
		...candidate.options,
		...candidate.correctAnswers
	].some(hasProvenanceLanguage);
}

function stemLooksLikePatientCase(stem: string) {
	const normalized = stem.toLowerCase();
	return [
		/\b\d{1,3}[- ]year[- ]old\b/,
		/\bpatient\b/,
		/\bpresents?\s+with\b/,
		/\breports?\b.*\b(symptoms?|diplopia|blurred?|pain|vision|headache)\b/,
		/\bcomplains?\s+of\b/,
		/\bhistory\s+of\b/,
		/\bon\s+examination\b/,
		/\bin\s+clinic\b/,
		/\bcase\b/
	].some((pattern) => pattern.test(normalized));
}

function buildTopicId(title: string, index: number) {
	const slug = normalizeText(title).replace(/\s+/g, '-').slice(0, 48);
	return slug ? `${slug}-${index + 1}` : `topic-${index + 1}`;
}

function clampTopic(topic: TopicMapItem, pages: StoredMarkdownPage[], index: number): TopicMapItem {
	const pageSet = new Set(pages.map((page) => page.pageNumber));
	const pageNumbers = topic.pageNumbers.filter((page) => pageSet.has(page));
	return {
		topicId: topic.topicId || buildTopicId(topic.title, index),
		title: cleanPlainText(topic.title, 120),
		summary: cleanPlainText(topic.summary, 900),
		pageNumbers: pageNumbers.length > 0 ? pageNumbers : [pages[0].pageNumber],
		learningObjectives: topic.learningObjectives
			.map((item) => cleanPlainText(item, 180))
			.slice(0, 6),
		keyTerms: topic.keyTerms.map((item) => cleanPlainText(item, 80)).slice(0, 12),
		suggestedOrders: [...new Set(topic.suggestedOrders)].slice(0, 3),
		estimatedQuestionCapacity: Math.max(
			1,
			Math.min(10, Math.floor(topic.estimatedQuestionCapacity))
		)
	};
}

function coerceGeneratedCandidate(
	raw: z.infer<typeof candidateSchema>['questions'][number],
	topics: TopicMapItem[],
	documentId: Id<'contentLib'>,
	threadId: string,
	model: QuestionStudioModel,
	allowedCitations: SourceCitation[] = []
): CandidateQuestion | null {
	const options = raw.options.map((option) => cleanPlainText(option, 260)).filter(Boolean);
	const uniqueOptions = [
		...new Map(options.map((option) => [normalizeText(option), option])).values()
	];
	const correct = cleanPlainText(raw.correctAnswers[0] ?? '', 260);
	const correctIndex = uniqueOptions.findIndex(
		(option) => normalizeText(option) === normalizeText(correct)
	);
	if (uniqueOptions.length < 3 || uniqueOptions.length > 5 || correctIndex === -1) return null;

	const topic = topics.find((item) => item.topicId === raw.topicId) ?? topics[0];
	const stem = cleanPlainText(raw.stem, 900);
	if (raw.reasoningOrder === 'first' && stemLooksLikePatientCase(stem)) return null;
	const rawSourcePageNumbers = raw.sourcePageNumbers ?? [];
	const rawSourceCitations =
		raw.sourceCitations && raw.sourceCitations.length > 0
			? raw.sourceCitations
			: allowedCitations.slice(0, 1);
	const sourcePages = rawSourcePageNumbers.filter((page) => topic.pageNumbers.includes(page));
	const citationById = new Map(allowedCitations.map((citation) => [citation.citationId, citation]));
	const sourceCitations = rawSourceCitations
		.map((citation) => citationById.get(citation.citationId) ?? citation)
		.filter((citation) =>
			allowedCitations.length > 0 ? citationById.has(citation.citationId) : true
		)
		.map((citation) => ({
			citationId: cleanPlainText(citation.citationId, 80),
			pageNumber: citation.pageNumber,
			noteFile: cleanPlainText(citation.noteFile, 260),
			chunkTitle: cleanPlainText(citation.chunkTitle, 180),
			chunkIndex: citation.chunkIndex
		}))
		.slice(0, 4);
	if (allowedCitations.length > 0 && sourceCitations.length === 0) return null;
	return {
		type: 'multiple_choice',
		stem,
		options: uniqueOptions,
		correctAnswers: [uniqueOptions[correctIndex]],
		rationale: cleanPlainText(raw.rationale, 1600),
		reasoningOrder: raw.reasoningOrder,
		topicId: topic.topicId,
		topicTitle: topic.title,
		sourcePageNumbers:
			sourcePages.length > 0
				? sourcePages
				: sourceCitations.length > 0
					? sourceCitations.map((citation) => citation.pageNumber)
					: topic.pageNumbers,
		sourceCitations,
		duplicateRisk: raw.duplicateRisk ?? 'low',
		similarQuestionIds: [],
		metadata: {
			model,
			agentThreadId: threadId,
			sourceDocumentId: documentId
		}
	};
}

function generateOptionId(used: Set<string>): string {
	let candidate = '';
	do {
		candidate = `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
	} while (used.has(candidate));
	used.add(candidate);
	return candidate;
}

function candidateToQuestionInsert(
	candidate: CandidateQuestion,
	moduleId: Id<'module'>,
	order: number
) {
	const used = new Set<string>();
	const options = candidate.options.map((text) => ({ id: generateOptionId(used), text }));
	const correctText = normalizeText(candidate.correctAnswers[0] ?? '');
	const correctOption = options.find((option) => normalizeText(option.text) === correctText);
	if (!correctOption) throw new Error('Correct answer must match one option');

	const stem = cleanPlainText(candidate.stem, 900);
	const rationale = cleanPlainText(candidate.rationale, 1600);
	const searchText = [
		stem,
		rationale,
		'multiple_choice',
		'draft',
		'ai',
		...options.map((option) => option.text),
		correctOption.text,
		candidate.topicTitle,
		candidate.reasoningOrder,
		QUESTION_STUDIO_MODEL
	]
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();

	return {
		moduleId,
		type: 'multiple_choice',
		stem,
		options,
		correctAnswers: [correctOption.id],
		rationale,
		aiGenerated: true,
		status: 'draft',
		order,
		metadata: {
			generation: {
				model: QUESTION_STUDIO_MODEL,
				focus: 'question_studio',
				customPromptUsed: false,
				sourceDocumentId: candidate.metadata.sourceDocumentId,
				sourcePageNumbers: candidate.sourcePageNumbers,
				sourceCitations: candidate.sourceCitations,
				topicTitle: candidate.topicTitle,
				reasoningOrder: candidate.reasoningOrder,
				duplicateRisk: candidate.duplicateRisk,
				similarQuestionIds: candidate.similarQuestionIds,
				agentThreadId: candidate.metadata.agentThreadId
			}
		},
		updatedAt: Date.now(),
		searchText
	};
}

async function getActor(ctx: Pick<QueryCtx, 'db' | 'auth'>) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error('Unauthorized');
	const user = await ctx.db
		.query('users')
		.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
		.first();
	if (!user) throw new Error('User not found');
	if (!(user.role === 'dev' || user.role === 'admin' || user.role === 'curator')) {
		throw new Error('Unauthorized');
	}
	return { identity, user };
}

async function assertSaveAccess(
	ctx: MutationCtx,
	args: { moduleId: Id<'module'>; documentId: Id<'contentLib'> }
) {
	const { identity, user } = await getActor(ctx);
	const module = await ctx.db.get(args.moduleId);
	if (!module || module.deletedAt) throw new Error('Module not found');
	const classDoc = await ctx.db.get(module.classId);
	if (!classDoc || classDoc.deletedAt) throw new Error('Class not found');
	const document = await ctx.db.get(args.documentId);
	if (!document || document.deletedAt) throw new Error('Document not found');
	if (document.cohortId !== classDoc.cohortId) {
		throw new Error('Source document and destination module must be in the same cohort');
	}
	if (user.role !== 'dev' && user.cohortId !== classDoc.cohortId) {
		throw new Error('Unauthorized for this cohort');
	}
	return { identity, user, module, classDoc, document };
}

export const getGenerationContext = internalQuery({
	args: {
		clerkUserId: v.string(),
		documentId: v.id('contentLib'),
		moduleId: v.id('module')
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
			.first();
		if (!user) throw new Error('User not found');
		if (!(user.role === 'dev' || user.role === 'admin' || user.role === 'curator')) {
			throw new Error('Unauthorized');
		}

		const document = await ctx.db.get(args.documentId);
		if (!document || document.deletedAt) throw new Error('Document not found');
		const ingestionStatus = document.metadata?.ingestionStatus;
		if (
			document.metadata?.storageProvider !== 'r2' ||
			(ingestionStatus !== 'indexed' && ingestionStatus !== 'mapped') ||
			!document.metadata?.ragEntryId
		) {
			throw new Error('Select an indexed or mapped R2 document before using Question Studio');
		}

		const module = await ctx.db.get(args.moduleId);
		if (!module || module.deletedAt) throw new Error('Module not found');
		const classDoc = await ctx.db.get(module.classId);
		if (!classDoc || classDoc.deletedAt) throw new Error('Class not found');
		if (classDoc.cohortId !== document.cohortId) {
			throw new Error('Source document and destination module must be in the same cohort');
		}
		if (user.role !== 'dev' && user.cohortId !== classDoc.cohortId) {
			throw new Error('Unauthorized for this cohort');
		}

		const questions = await ctx.db
			.query('question')
			.withIndex('by_moduleId_order', (q) => q.eq('moduleId', args.moduleId))
			.collect();

		return {
			user: { _id: user._id, role: user.role, cohortId: user.cohortId },
			document,
			module,
			classDoc,
			existingQuestions: questions.map((question) => ({
				_id: question._id,
				stem: question.stem,
				options: question.options.map((option) => `${option.id}:${option.text}`),
				correctAnswers: question.correctAnswers,
				rationale: question.rationale ?? question.explanation,
				status: question.status,
				searchText: question.searchText
			}))
		};
	}
});

export const getDocumentMappingContext = internalQuery({
	args: {
		clerkUserId: v.string(),
		documentId: v.id('contentLib')
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
			.first();
		if (!user) throw new Error('User not found');
		if (!(user.role === 'dev' || user.role === 'admin' || user.role === 'curator')) {
			throw new Error('Unauthorized');
		}

		const document = await ctx.db.get(args.documentId);
		if (!document || document.deletedAt) throw new Error('Document not found');
		const ingestionStatus = document.metadata?.ingestionStatus;
		if (
			document.metadata?.storageProvider !== 'r2' ||
			(ingestionStatus !== 'indexed' && ingestionStatus !== 'mapped') ||
			!document.metadata?.ragEntryId
		) {
			throw new Error('Select an indexed or mapped R2 document before mapping topics');
		}
		if (user.role !== 'dev' && user.cohortId !== document.cohortId) {
			throw new Error('Unauthorized for this cohort');
		}

		return {
			user: { _id: user._id, role: user.role, cohortId: user.cohortId },
			document
		};
	}
});

export const getSavedTopicMapForRange = internalQuery({
	args: {
		documentId: v.id('contentLib'),
		startPage: v.number(),
		endPage: v.number()
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query('questionStudioTopicMaps')
			.withIndex('by_documentId_pageRange', (q) =>
				q
					.eq('documentId', args.documentId)
					.eq('startPage', args.startPage)
					.eq('endPage', args.endPage)
			)
			.filter((q) => q.eq(q.field('deletedAt'), undefined))
			.order('desc')
			.first();
	}
});

export const getLatestSavedTopicMap = query({
	args: {
		documentId: v.id('contentLib'),
		moduleId: v.id('module')
	},
	handler: async (ctx, args) => {
		const { user } = await getActor(ctx);
		const document = await ctx.db.get(args.documentId);
		if (!document || document.deletedAt) throw new Error('Document not found');
		const module = await ctx.db.get(args.moduleId);
		if (!module || module.deletedAt) throw new Error('Module not found');
		const classDoc = await ctx.db.get(module.classId);
		if (!classDoc || classDoc.deletedAt) throw new Error('Class not found');
		if (classDoc.cohortId !== document.cohortId) {
			throw new Error('Source document and destination module must be in the same cohort');
		}
		if (user.role !== 'dev' && user.cohortId !== classDoc.cohortId) {
			throw new Error('Unauthorized for this cohort');
		}

		const maps = await ctx.db
			.query('questionStudioTopicMaps')
			.withIndex('by_documentId', (q) => q.eq('documentId', args.documentId))
			.filter((q) => q.eq(q.field('deletedAt'), undefined))
			.collect();

		const freshMaps = maps.filter((map) =>
			map.sourceIndexedAt
				? map.sourceIndexedAt === document.metadata?.indexedAt
				: map.sourceDocumentUpdatedAt === document.updatedAt
		);
		const latest = freshMaps.sort((a, b) => b.updatedAt - a.updatedAt)[0];
		if (!latest) return null;

		return {
			_id: latest._id,
			documentId: latest.documentId,
			moduleId: args.moduleId,
			startPage: latest.startPage,
			endPage: latest.endPage,
			topics: latest.topics,
			model: latest.model,
			agentThreadId: latest.agentThreadId,
			updatedAt: latest.updatedAt
		};
	}
});

export const saveTopicMapForRange = internalMutation({
	args: {
		documentId: v.id('contentLib'),
		cohortId: v.id('cohort'),
		createdFromModuleId: v.optional(v.id('module')),
		startPage: v.number(),
		endPage: v.number(),
		pageCount: v.number(),
		topics: v.array(topicInputValidator),
		model: v.string(),
		agentThreadId: v.optional(v.string()),
		sourceDocumentUpdatedAt: v.number(),
		sourceIndexedAt: v.optional(v.number()),
		createdByUserId: v.optional(v.id('users'))
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const existing = await ctx.db
			.query('questionStudioTopicMaps')
			.withIndex('by_documentId_pageRange', (q) =>
				q
					.eq('documentId', args.documentId)
					.eq('startPage', args.startPage)
					.eq('endPage', args.endPage)
			)
			.filter((q) => q.eq(q.field('deletedAt'), undefined))
			.collect();

		const [latest, ...older] = existing.sort((a, b) => b.updatedAt - a.updatedAt);
		for (const old of older) {
			await ctx.db.patch(old._id, { deletedAt: now, updatedAt: now });
		}

		if (latest) {
			await ctx.db.patch(latest._id, {
				createdFromModuleId: args.createdFromModuleId,
				pageCount: args.pageCount,
				topics: args.topics,
				model: args.model,
				agentThreadId: args.agentThreadId,
				sourceDocumentUpdatedAt: args.sourceDocumentUpdatedAt,
				sourceIndexedAt: args.sourceIndexedAt,
				createdByUserId: args.createdByUserId,
				updatedAt: now
			});
			return latest._id;
		}

		return await ctx.db.insert('questionStudioTopicMaps', {
			documentId: args.documentId,
			cohortId: args.cohortId,
			createdFromModuleId: args.createdFromModuleId,
			startPage: args.startPage,
			endPage: args.endPage,
			pageCount: args.pageCount,
			topics: args.topics,
			model: args.model,
			agentThreadId: args.agentThreadId,
			sourceDocumentUpdatedAt: args.sourceDocumentUpdatedAt,
			sourceIndexedAt: args.sourceIndexedAt,
			createdByUserId: args.createdByUserId,
			createdAt: now,
			updatedAt: now
		});
	}
});

export const autoMapIndexedDocument = internalAction({
	args: {
		documentId: v.id('contentLib'),
		triggeredByClerkUserId: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const document = (await ctx.runQuery(internal.ragKnowledgeInternal.getDocumentForRagIngestion, {
			documentId: args.documentId
		})) as Doc<'contentLib'> | null;

		if (!document || document.deletedAt) throw new Error('Document not found');
		const ingestionStatus = document.metadata?.ingestionStatus;
		if (
			document.metadata?.storageProvider !== 'r2' ||
			(ingestionStatus !== 'indexed' && ingestionStatus !== 'mapped') ||
			!document.metadata?.ragEntryId
		) {
			throw new Error('Only indexed or mapped R2 documents can be mapped');
		}

		const pages = selectPages(await loadMarkdownPages(document));
		const pageRange = {
			startPage: pages[0].pageNumber,
			endPage: pages[pages.length - 1].pageNumber
		};
		const savedMap = (await ctx.runQuery(internal.questionStudio.getSavedTopicMapForRange, {
			documentId: args.documentId,
			startPage: pageRange.startPage,
			endPage: pageRange.endPage
		})) as Doc<'questionStudioTopicMaps'> | null;
		const savedMapIsFresh = Boolean(
			savedMap &&
			(savedMap.sourceIndexedAt
				? savedMap.sourceIndexedAt === document.metadata?.indexedAt
				: savedMap.sourceDocumentUpdatedAt === document.updatedAt)
		);
		if (savedMap && savedMapIsFresh) {
			if (document.metadata?.ingestionStatus !== 'mapped') {
				await ctx.runMutation(internal.ragKnowledgeInternal.markDocumentMapped, {
					documentId: args.documentId,
					mappedAt: savedMap.updatedAt
				});
			}
			return {
				status: 'cached',
				topicMapId: savedMap._id,
				topicCount: savedMap.topics.length
			};
		}

		assertOpenRouterKey();
		const agentUserId = args.triggeredByClerkUserId ?? `document:${args.documentId}`;
		const creator = args.triggeredByClerkUserId
			? await ctx.runQuery(internal.ragKnowledgeInternal.getUserForRagAccess, {
					clerkUserId: args.triggeredByClerkUserId
				})
			: null;

		await questionStudioRateLimiter.limit(ctx, 'questionStudioGenerationStart', {
			key: agentUserId,
			throws: true
		});
		await questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalGenerationStart', {
			throws: true
		});

		const sourceText = pagesToPromptText(pages, MAX_TOPIC_SOURCE_CHARS);
		const tools = {
			getAllowedSourceText: createTool({
				description:
					'Return the indexed source notes for this document. This tool has no access outside the selected document.',
				inputSchema: z.object({}),
				execute: async () => ({
					documentTitle: document.title,
					pageNumbers: pages.map((page) => page.pageNumber),
					text: pagesToPromptText(pages, MAX_SOURCE_CHARS)
				})
			})
		};
		const agent = createQuestionStudioAgent(tools, QUESTION_STUDIO_FLASH_MODEL);
		const { threadId } = await agent.createThread(ctx, {
			userId: agentUserId,
			title: `Auto map document: ${document.title}`
		});

		const result = await agent.generateObject(
			ctx,
			{ threadId, userId: agentUserId },
			{
				schema: topicMapSchema,
				providerOptions: QUESTION_STUDIO_PROVIDER_OPTIONS,
				prompt: [
					'Map this indexed document into reusable teachable topics for future question generation.',
					'Return coverage-focused topics. Each topic should be narrow enough to support 1-10 questions.',
					'Use page numbers from the source only.',
					reasoningOrderPrompt(),
					'No destination module has been selected yet, so make this a document-level topic map.',
					`Selected pages: ${pages.map((page) => page.pageNumber).join(', ')}`,
					'Source excerpt:',
					sourceText
				].join('\n\n')
			},
			{ storageOptions: { saveMessages: 'promptAndOutput' } }
		);

		const topics = result.object.topics.map((topic, index) => clampTopic(topic, pages, index));
		const topicMapId = (await ctx.runMutation(internal.questionStudio.saveTopicMapForRange, {
			documentId: args.documentId,
			cohortId: document.cohortId,
			startPage: pageRange.startPage,
			endPage: pageRange.endPage,
			pageCount: pages.length,
			topics,
			model: QUESTION_STUDIO_FLASH_MODEL,
			agentThreadId: threadId,
			sourceDocumentUpdatedAt: document.updatedAt,
			sourceIndexedAt: document.metadata?.indexedAt,
			createdByUserId: creator?._id
		})) as Id<'questionStudioTopicMaps'>;
		await ctx.runMutation(internal.ragKnowledgeInternal.markDocumentMapped, {
			documentId: args.documentId,
			mappedAt: Date.now()
		});

		return {
			status: 'mapped',
			topicMapId,
			topicCount: topics.length,
			threadId,
			usage: result.usage
		};
	}
});

export const createGenerationJob = mutation({
	args: {
		documentId: v.id('contentLib'),
		moduleId: v.id('module'),
		requestedCount: v.number(),
		model: v.optional(questionStudioModelValidator)
	},
	handler: async (ctx, args) => {
		const { user, classDoc } = await assertSaveAccess(ctx, {
			moduleId: args.moduleId,
			documentId: args.documentId
		});
		const now = Date.now();
		const model = normalizeQuestionStudioModel(args.model);
		const existingJobs = await ctx.db
			.query('questionStudioJobs')
			.withIndex('by_createdByUserId', (q) => q.eq('createdByUserId', user._id))
			.collect();
		for (const job of existingJobs) {
			await deleteGenerationJobRows(ctx, job._id);
			await ctx.db.delete(job._id);
		}
		const jobId = await ctx.db.insert('questionStudioJobs', {
			documentId: args.documentId,
			moduleId: args.moduleId,
			cohortId: classDoc.cohortId,
			createdByUserId: user._id,
			kind: 'candidate_generation',
			status: 'queued',
			statusText: 'Queued candidate generation.',
			model,
			requestedCount: Math.floor(args.requestedCount),
			blockedDuplicateCount: 0,
			candidateCount: 0,
			reviewCount: 0,
			eventCount: 1,
			completedWorkerCount: 0,
			failedWorkerCount: 0,
			createdAt: now,
			updatedAt: now
		});
		await ctx.db.insert('questionStudioJobEvents', {
			jobId,
			cohortId: classDoc.cohortId,
			at: now,
			label: 'Queued',
			detail: 'Preparing the agent run.'
		});
		return jobId;
	}
});

export const getCurrentGenerationJob = query({
	args: {},
	handler: async (ctx) => {
		const { user } = await getActor(ctx);
		const jobs = await ctx.db
			.query('questionStudioJobs')
			.withIndex('by_createdByUserId', (q) => q.eq('createdByUserId', user._id))
			.collect();
		const job = jobs.sort((a, b) => b.createdAt - a.createdAt)[0];
		if (!job) return null;
		return await hydrateGenerationJob(ctx, job);
	}
});

export const clearCurrentGenerationJob = mutation({
	args: {},
	handler: async (ctx) => {
		const { user } = await getActor(ctx);
		const jobs = await ctx.db
			.query('questionStudioJobs')
			.withIndex('by_createdByUserId', (q) => q.eq('createdByUserId', user._id))
			.collect();
		for (const job of jobs) {
			await deleteGenerationJobRows(ctx, job._id);
			await ctx.db.delete(job._id);
		}
		return { deletedCount: jobs.length };
	}
});

export const getGenerationJob = query({
	args: { jobId: v.id('questionStudioJobs') },
	handler: async (ctx, { jobId }) => {
		const { user } = await getActor(ctx);
		const job = await ctx.db.get(jobId);
		if (!job) return null;
		if (user.role !== 'dev' && user.cohortId !== job.cohortId) {
			throw new Error('Unauthorized for this cohort');
		}
		return await hydrateGenerationJob(ctx, job);
	}
});

// Fetched lazily by the UI when the reviewer phase is expanded — keeps the live job
// subscription light while still exposing per-candidate verdicts on demand.
export const getGenerationJobReviews = query({
	args: { jobId: v.id('questionStudioJobs') },
	handler: async (ctx, { jobId }) => {
		const { user } = await getActor(ctx);
		const job = await ctx.db.get(jobId);
		if (!job) return [];
		if (user.role !== 'dev' && user.cohortId !== job.cohortId) {
			throw new Error('Unauthorized for this cohort');
		}
		const rows = await ctx.db
			.query('questionStudioJobReviews')
			.withIndex('by_jobId_candidateIndex', (q) => q.eq('jobId', jobId))
			.collect();
		return rows.sort((a, b) => a.candidateIndex - b.candidateIndex).map((row) => row.review);
	}
});

export const updateGenerationJob = internalMutation({
	args: {
		jobId: v.id('questionStudioJobs'),
		status: v.optional(
			v.union(v.literal('queued'), v.literal('running'), v.literal('ready'), v.literal('failed'))
		),
		statusText: v.optional(v.string()),
		eventLabel: v.optional(v.string()),
		eventDetail: v.optional(v.string()),
		threadId: v.optional(v.string()),
		plan: v.optional(generationPlanValidator),
		reviews: v.optional(v.array(candidateReviewValidator)),
		candidates: v.optional(v.array(candidateValidator)),
		blockedDuplicateCount: v.optional(v.number()),
		error: v.optional(v.string()),
		completed: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (!job) return;
		const now = Date.now();
		let eventCount = job.eventCount ?? 0;
		if (args.eventLabel) {
			await insertGenerationJobEvent(ctx, job, {
				at: now,
				label: args.eventLabel,
				detail: args.eventDetail
			});
			eventCount += 1;
		}
		const shouldPatchSummary = Boolean(
			args.status ||
			(args.statusText && !args.eventLabel) ||
			args.threadId ||
			args.plan ||
			args.reviews ||
			args.candidates ||
			args.blockedDuplicateCount !== undefined ||
			args.error ||
			args.completed
		);
		if (!shouldPatchSummary) return;
		let candidateCount = job.candidateCount ?? 0;
		if (args.candidates) {
			const existingRows = await ctx.db
				.query('questionStudioJobCandidates')
				.withIndex('by_jobId', (q) => q.eq('jobId', args.jobId))
				.collect();
			await Promise.all(existingRows.map((row) => ctx.db.delete(row._id)));
			await Promise.all(
				args.candidates.map((candidate, index) =>
					ctx.db.insert('questionStudioJobCandidates', {
						jobId: args.jobId,
						cohortId: job.cohortId,
						index,
						candidate,
						createdAt: now
					})
				)
			);
			candidateCount = args.candidates.length;
		}
		let reviewCount = job.reviewCount ?? 0;
		if (args.reviews) {
			const existingRows = await ctx.db
				.query('questionStudioJobReviews')
				.withIndex('by_jobId', (q) => q.eq('jobId', args.jobId))
				.collect();
			await Promise.all(existingRows.map((row) => ctx.db.delete(row._id)));
			await Promise.all(
				args.reviews.map((review) =>
					ctx.db.insert('questionStudioJobReviews', {
						jobId: args.jobId,
						cohortId: job.cohortId,
						candidateIndex: review.candidateIndex,
						review,
						createdAt: now
					})
				)
			);
			reviewCount = args.reviews.length;
		}
		await ctx.db.patch(args.jobId, {
			...(args.status ? { status: args.status } : {}),
			...(args.statusText ? { statusText: args.statusText } : {}),
			...(args.threadId ? { threadId: args.threadId } : {}),
			...(args.plan ? { plan: args.plan } : {}),
			...(args.blockedDuplicateCount !== undefined
				? { blockedDuplicateCount: args.blockedDuplicateCount }
				: {}),
			...(args.error ? { error: args.error } : {}),
			eventCount,
			candidateCount,
			reviewCount,
			updatedAt: now,
			...(args.completed ? { completedAt: now } : {})
		});
	}
});

export const appendGenerationWorkerResult = internalMutation({
	args: {
		jobId: v.id('questionStudioJobs'),
		workerTotal: v.number(),
		workerIndex: v.number(),
		threadId: v.optional(v.string()),
		candidates: v.array(candidateValidator),
		rawReturnedCount: v.number(),
		eventLabel: v.string(),
		eventDetail: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (!job || job.status === 'ready' || job.status === 'failed') {
			return { candidateCount: job?.candidateCount ?? 0 };
		}
		const now = Date.now();
		const acceptedIncoming: CandidateQuestion[] = [];
		for (const candidate of args.candidates as CandidateQuestion[]) {
			const duplicate = scoreDuplicateRisk(candidate, [], acceptedIncoming);
			if (duplicate.risk === 'high') continue;
			acceptedIncoming.push({
				...candidate,
				duplicateRisk: duplicate.risk === 'low' ? candidate.duplicateRisk : duplicate.risk
			});
		}
		const insertedCandidates = acceptedIncoming.slice(0, MAX_QUESTIONS_PER_WORKER);
		for (const [offset, candidate] of insertedCandidates.entries()) {
			await ctx.db.insert('questionStudioJobCandidates', {
				jobId: args.jobId,
				cohortId: job.cohortId,
				index: args.workerIndex * MAX_QUESTIONS_PER_WORKER + offset,
				candidate,
				createdAt: now
			});
		}
		await insertGenerationJobEvent(ctx, job, {
			at: now,
			label: args.eventLabel,
			detail: args.eventDetail
		});
		return { candidateCount: (job.candidateCount ?? 0) + insertedCandidates.length };
	}
});

export const getGenerationJobInternal = internalQuery({
	args: { jobId: v.id('questionStudioJobs') },
	handler: async (ctx, { jobId }) => {
		const job = await ctx.db.get(jobId);
		if (!job) return null;
		return await hydrateGenerationJob(ctx, job);
	}
});

export const generateCandidateWorker = internalAction({
	args: {
		jobId: v.id('questionStudioJobs'),
		documentId: v.id('contentLib'),
		moduleId: v.id('module'),
		clerkUserId: v.string(),
		task: liveWorkerTaskValidator,
		workerIndex: v.number(),
		workerTotal: v.number(),
		model: questionStudioModelValidator,
		focusNotes: v.optional(v.string()),
		startPage: v.optional(v.number()),
		endPage: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const report = async (update: Record<string, unknown>) => {
			try {
				await ctx.runMutation(internal.questionStudio.updateGenerationJob, {
					jobId: args.jobId,
					...update
				});
			} catch {
				// Progress updates are best-effort; final worker result writes are authoritative.
			}
		};
		const generateStructuredObject = async <T>(
			stage: string,
			agent: QuestionStudioAgent,
			threadId: string,
			userId: string,
			model: QuestionStudioModel,
			options: GenerateObjectOptions
		): Promise<T> => {
			if (!shouldUseStructuredOutput(model)) {
				const textResult = await agent.generateText(
					ctx,
					{ threadId, userId },
					{
						prompt: [
							options.prompt,
							'Return one valid JSON object only. Do not wrap it in markdown fences.',
							'The root object must match this shape: {"questions":[{"type":"multiple_choice","stem":"...","options":["..."],"correctAnswers":["..."],"rationale":"...","reasoningOrder":"first|second|third","topicId":"...","topicTitle":"...","sourcePageNumbers":[1],"sourceCitations":[{"citationId":"c1","pageNumber":1,"noteFile":"...","chunkTitle":"...","chunkIndex":0}]}]}.'
						].join('\n\n'),
						maxOutputTokens: options.callSettings?.maxOutputTokens,
						temperature: options.callSettings?.temperature,
						maxRetries: options.callSettings?.maxRetries
					} as unknown as Parameters<QuestionStudioAgent['generateText']>[2],
					{
						storageOptions: { saveMessages: 'promptAndOutput' }
					}
				);
				const parsed = parseModelJsonText(textResult.text);
				const normalized = normalizeCandidateDraftPayload(parsed);
				const validated = safeParseSchema(options.schema, normalized);
				if (validated) {
					await report({
						statusText: `${stage} parsed text output locally.`,
						eventLabel: `${stage} parsed`,
						eventDetail: `${model} returned text JSON that passed local schema validation.`
					});
					return { object: validated, usage: textResult.usage } as T;
				}
				const detail = `${stage} text output did not match the expected JSON shape. Returned: ${cleanPlainText(textResult.text, 320)}`;
				await report({
					statusText: `${stage} returned invalid text JSON.`,
					eventLabel: `${stage} failed`,
					eventDetail: detail
				});
				throw new Error(detail);
			}
			try {
				return (await agent.generateObject(
					ctx,
					{ threadId, userId },
					options as unknown as Parameters<QuestionStudioAgent['generateObject']>[2],
					{
						storageOptions: { saveMessages: 'promptAndOutput' }
					}
				)) as T;
			} catch (error) {
				if (!NoObjectGeneratedError.isInstance(error)) throw error;
				const recovered = recoverStructuredObjectFromError(error, options.schema);
				if (recovered) {
					await report({
						statusText: `${stage} recovered malformed structured output locally.`,
						eventLabel: `${stage} repaired`,
						eventDetail:
							'The model returned usable JSON with minor shape noise, so no model retry was needed.'
					});
					return recovered as T;
				}
				const detail = formatStructuredOutputError(stage, error);
				await report({
					statusText: `${stage} returned malformed output.`,
					eventLabel: `${stage} failed`,
					eventDetail: detail
				});
				throw new Error(detail);
			}
		};

		const task = args.task as LiveWorkerTask;
		try {
			assertOpenRouterKey();
			const label = taskLabel(task);
			const allocations = task.topicAllocations;
			const assignedTopics = taskTopics(task);
			const pageNumbers = taskPageNumbers(task);
			const context = (await ctx.runQuery(internal.questionStudio.getGenerationContext, {
				clerkUserId: args.clerkUserId,
				documentId: args.documentId,
				moduleId: args.moduleId
			})) as GenerationContext;
			const allPages = await loadMarkdownPages(context.document);
			const selectedPages = selectPages(allPages, args.startPage, args.endPage);
			const fallbackTopicText = pagesToPromptText(
				pagesForTask(selectedPages, task),
				MAX_WORKER_SOURCE_CHARS
			);
			const existingQuestionStems = existingQuestionStemsToPrompt(context.existingQuestions);
			const focusInstruction = buildFocusInstruction(args.focusNotes);
			const noteFile = cleanPlainText(
				String(context.document.metadata?.originalFileName ?? context.document.title),
				260
			);
			const retrievedCitations: SourceCitation[] = [];
			const workerAgent = createQuestionStudioAgent(undefined, args.model);
			const workerThread = await workerAgent.createThread(ctx, {
				userId: args.clerkUserId,
				title: `Draft ${task.plannedCount}: ${label}`
			});
			await report({
				threadId: workerThread.threadId,
				statusText: `Worker ${args.workerIndex + 1}/${args.workerTotal}: ${label}`,
				eventLabel: 'Worker started',
				eventDetail: `${task.plannedCount} ${task.reasoningOrder}-order candidate${task.plannedCount === 1 ? '' : 's'} across ${allocations.length} topic${allocations.length === 1 ? '' : 's'} from pages ${pageNumbers.join(', ')}.`
			});
			const retrievalQuery = defaultWorkerRetrievalQuery(task);
			await report({
				statusText: `Searching source for ${label}.`,
				eventLabel: 'Source search',
				eventDetail: retrievalQuery
			});
			await report({
				statusText: `Retrieving RAG context for ${label}.`,
				eventLabel: 'RAG query',
				eventDetail: retrievalQuery
			});
			const search = await documentRag.search(ctx, {
				namespace: documentNamespace(String(args.documentId)),
				query: retrievalQuery,
				limit: 6,
				chunkContext: { before: 1, after: 1 },
				searchType: 'hybrid'
			});
			const citations = citationsFromSearch(search, {
				noteFile,
				title: context.document.title
			});
			for (const citation of citations) {
				if (retrievedCitations.some((item) => citationKey(item) === citationKey(citation))) {
					continue;
				}
				retrievedCitations.push({
					...citation,
					citationId: `c${retrievedCitations.length + 1}`
				});
			}
			const retrievedText = cleanPlainText(search.text, MAX_WORKER_RAG_CHARS);
			await report({
				statusText: `Retrieved ${search.results.length} source chunk groups for ${label}.`,
				eventLabel: 'RAG retrieved',
				eventDetail: retrievedText
					? cleanPlainText(retrievedText, 700)
					: 'No RAG chunks matched; using extracted page fallback.'
			});
			const sourceBrief = cleanPlainText(
				retrievedText || `Fallback extracted page text:\n${fallbackTopicText}`,
				MAX_WORKER_RESEARCH_CHARS
			);
			await report({
				statusText: `Source context ready for ${label}.`,
				eventLabel: 'Source note',
				eventDetail: sourceBrief
			});
			const fallbackCitation: SourceCitation = {
				citationId: 'fallback-p1',
				pageNumber: pageNumbers[0],
				noteFile,
				chunkTitle: 'Extracted page fallback',
				chunkIndex: 0
			};
			const availableCitations =
				retrievedCitations.length > 0 ? retrievedCitations.slice(0, 8) : [fallbackCitation];

			const currentJob = (await ctx.runQuery(internal.questionStudio.getGenerationJobInternal, {
				jobId: args.jobId
			})) as GenerationJobSnapshot | null;
			const alreadyDrafted = (currentJob?.candidates ?? [])
				.map((candidate, index) => `${index + 1}. ${cleanPlainText(candidate.stem, 260)}`)
				.join('\n');

			const result = await generateStructuredObject<{
				object: z.infer<typeof candidateSchema>;
				usage?: unknown;
			}>('Drafting', workerAgent, workerThread.threadId, args.clerkUserId, args.model, {
				schemaName: 'QuestionCandidateDrafts',
				schemaDescription:
					'Multiple-choice question candidates grounded only in the provided notes.',
				schema: candidateSchema,
				providerOptions: questionStudioProviderOptions(args.model),
				callSettings: {
					maxOutputTokens: WORKER_DRAFT_MAX_OUTPUT_TOKENS,
					temperature: 0.2,
					maxRetries: 0
				},
				prompt: [
					'Generate a small batch of NBEO board-style multiple-choice optometry question candidates from this one work order.',
					'Return the final structured object only. Do not include analysis, markdown, or prose outside the object.',
					'Use only the source brief, retrieved context from this thread, and selected topic metadata.',
					focusInstruction,
					reasoningOrderPrompt(),
					questionWritingSkillPrompt(),
					`Create exactly ${task.plannedCount} question${task.plannedCount === 1 ? '' : 's'}: ${task.counts.first} first-order, ${task.counts.second} second-order, ${task.counts.third} third-order.`,
					'Use exact schema field names: stem, options, correctAnswers, rationale, reasoningOrder, topicId, topicTitle, sourcePageNumbers, sourceCitations.',
					'Use exactly one correct answer. The correctAnswers array must contain the exact option text for the correct option.',
					'For each question, sourcePageNumbers must match its evidence and sourceCitations must use 1-4 exact citation objects from Available citations.',
					'Distribute questions according to topicAllocations. Each returned question topicId must match one assigned topic, and each allocation should receive its plannedCount.',
					'Avoid duplicating existing module questions and already drafted candidates listed below.',
					`Work order:\n${JSON.stringify(
						{
							taskId: task.taskId,
							topicAllocations: allocations.map((allocation) => ({
								topic: allocation.topic,
								plannedCount: allocation.plannedCount
							})),
							counts: task.counts,
							plannedCount: task.plannedCount
						},
						null,
						2
					)}`,
					`Available citations:\n${JSON.stringify(availableCitations, null, 2)}`,
					`Existing question count: ${context.existingQuestions.length}`,
					`Existing question stems to avoid:\n${existingQuestionStems}`,
					`Already drafted stems in this run:\n${alreadyDrafted || 'None yet.'}`,
					`Source brief from retrieval worker:\n${sourceBrief || 'No source brief was produced. Use retrieved context available in this thread only.'}`
				].join('\n\n'),
				experimental_repairText: createCandidateDraftRepairText(candidateSchema)
			});

			const accepted: CandidateQuestion[] = [];
			for (const raw of result.object.questions) {
				const coerced = coerceGeneratedCandidate(
					raw,
					assignedTopics,
					args.documentId,
					workerThread.threadId,
					args.model,
					availableCitations
				);
				if (!coerced) continue;
				if (candidateHasProvenanceLanguage(coerced)) continue;
				const duplicate = scoreDuplicateRisk(coerced, context.existingQuestions, accepted);
				coerced.duplicateRisk =
					duplicate.risk === 'high' ? 'high' : (raw.duplicateRisk ?? duplicate.risk);
				if (duplicate.risk !== 'low') coerced.duplicateRisk = duplicate.risk;
				coerced.similarQuestionIds = duplicate.similarQuestionIds;
				if (coerced.duplicateRisk === 'high') continue;
				accepted.push(coerced);
			}

			await ctx.runMutation(internal.questionStudio.appendGenerationWorkerResult, {
				jobId: args.jobId,
				workerTotal: args.workerTotal,
				workerIndex: args.workerIndex,
				threadId: workerThread.threadId,
				candidates: accepted,
				rawReturnedCount: result.object.questions.length,
				eventLabel: 'Worker complete',
				eventDetail: `${accepted.length} candidate${accepted.length === 1 ? '' : 's'} from ${label} passed local checks.`
			});

			await ctx.scheduler.runAfter(1_500, internal.questionStudio.reviewGenerationJob, {
				jobId: args.jobId,
				documentId: args.documentId,
				moduleId: args.moduleId,
				clerkUserId: args.clerkUserId,
				workerTotal: args.workerTotal,
				focusNotes: args.focusNotes,
				startPage: args.startPage,
				endPage: args.endPage
			});
		} catch (error) {
			await ctx.runMutation(internal.questionStudio.appendGenerationWorkerResult, {
				jobId: args.jobId,
				workerTotal: args.workerTotal,
				workerIndex: args.workerIndex,
				candidates: [],
				rawReturnedCount: 0,
				eventLabel: 'Worker failed',
				eventDetail: error instanceof Error ? error.message : 'Unknown worker error'
			});
			await ctx.scheduler.runAfter(1_500, internal.questionStudio.reviewGenerationJob, {
				jobId: args.jobId,
				documentId: args.documentId,
				moduleId: args.moduleId,
				clerkUserId: args.clerkUserId,
				workerTotal: args.workerTotal,
				focusNotes: args.focusNotes,
				startPage: args.startPage,
				endPage: args.endPage
			});
		}
	}
});

export const reviewGenerationJob = internalAction({
	args: {
		jobId: v.id('questionStudioJobs'),
		documentId: v.id('contentLib'),
		moduleId: v.id('module'),
		clerkUserId: v.string(),
		workerTotal: v.number(),
		focusNotes: v.optional(v.string()),
		startPage: v.optional(v.number()),
		endPage: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const report = async (update: Record<string, unknown>) => {
			await ctx.runMutation(internal.questionStudio.updateGenerationJob, {
				jobId: args.jobId,
				...update
			});
		};
		try {
			const job = (await ctx.runQuery(internal.questionStudio.getGenerationJobInternal, {
				jobId: args.jobId
			})) as GenerationJobSnapshot | null;
			if (!job || job.status === 'ready' || job.status === 'failed') return;
			const completedWorkers = (job.completedWorkerCount ?? 0) + (job.failedWorkerCount ?? 0);
			const requestedCount = Math.floor(job.requestedCount || MAX_GENERATED_QUESTIONS);
			const enoughCandidates = (job.candidateCount ?? 0) >= requestedCount;
			if (!enoughCandidates && completedWorkers < args.workerTotal) return;
			const candidates = job.candidates.slice(0, job.requestedCount);
			if (candidates.length === 0) {
				await report({
					status: 'failed',
					statusText: 'No candidates passed worker checks.',
					eventLabel: 'Failed',
					eventDetail: 'All workers finished, but no candidate passed local quality checks.',
					completed: true
				});
				return;
			}

			await report({
				statusText: 'Running local candidate checks.',
				eventLabel: 'Reviewing',
				eventDetail: `${candidates.length} candidates are ready for local source, answer, and provenance checks.`
			});
			const reviews: CandidateReview[] = candidates.map((candidate, index) => {
				const reasons: string[] = [];
				let verdict: CandidateReview['verdict'] = 'accept';
				let sourceSupport: CandidateReview['sourceSupport'] = 'strong';
				let answerQuality: CandidateReview['answerQuality'] = 'clear';
				if (candidateHasProvenanceLanguage(candidate)) {
					verdict = 'reject';
					answerQuality = 'ambiguous';
					reasons.push('Student-facing text includes source/provenance language.');
				}
				if (!candidate.sourceCitations?.length || candidate.sourcePageNumbers.length === 0) {
					verdict = 'reject';
					sourceSupport = 'weak';
					reasons.push('Missing page-level source citations.');
				}
				if (
					candidate.correctAnswers.length !== 1 ||
					!candidate.options.some(
						(option) => normalizeText(option) === normalizeText(candidate.correctAnswers[0] ?? '')
					)
				) {
					verdict = 'reject';
					answerQuality = 'ambiguous';
					reasons.push('Correct answer does not match exactly one option.');
				}
				if (reasons.length === 0) {
					reasons.push('Passed local schema, citation, answer, duplicate, and provenance checks.');
				}
				return {
					candidateIndex: index,
					verdict,
					reasons: reasons.map((reason) => cleanPlainText(reason, MAX_REVIEW_REASON_CHARS)),
					sourceSupport,
					answerQuality
				};
			});
			const reviewByIndex = new Map(reviews.map((review) => [review.candidateIndex, review]));
			const finalCandidates = candidates
				.filter((candidate, index) => reviewByIndex.get(index)?.verdict !== 'reject')
				.slice(0, job.requestedCount);
			await report({
				statusText: 'Review complete.',
				eventLabel: 'Review complete',
				eventDetail: `${reviews.filter((review) => review.verdict === 'reject').length} rejected, ${reviews.filter((review) => review.verdict === 'revise').length} revised.`,
				reviews
			});
			await report({
				status: 'ready',
				statusText:
					finalCandidates.length >= job.requestedCount
						? `Ready: ${finalCandidates.length} candidates to review.`
						: `Partial ready: ${finalCandidates.length}/${job.requestedCount} candidates to review.`,
				eventLabel: 'Ready',
				eventDetail:
					finalCandidates.length >= job.requestedCount
						? 'Draft workers and local review finished.'
						: 'Draft workers finished with partial usable candidates.',
				candidates: finalCandidates,
				completed: true
			});
		} catch (error) {
			await report({
				status: 'failed',
				statusText: 'Review failed.',
				eventLabel: 'Failed',
				eventDetail: error instanceof Error ? error.message : 'Unknown review error',
				error: error instanceof Error ? error.message : 'Unknown review error',
				completed: true
			});
		}
	}
});

export const mapDocumentTopicMap = action({
	args: {
		documentId: v.id('contentLib'),
		force: v.optional(v.boolean()),
		operatorToken: v.optional(v.string())
	},
	handler: async (ctx, args): Promise<MapDocumentTopicMapResult> => {
		const identity = await ctx.auth.getUserIdentity();
		let context: DocumentMappingContext;
		if (identity) {
			context = (await ctx.runQuery(internal.questionStudio.getDocumentMappingContext, {
				clerkUserId: identity.subject,
				documentId: args.documentId
			})) as DocumentMappingContext;
		} else {
			assertOperatorToken(args.operatorToken);
			const document = (await ctx.runQuery(
				internal.ragKnowledgeInternal.getDocumentForRagIngestion,
				{
					documentId: args.documentId
				}
			)) as Doc<'contentLib'> | null;
			if (!document || document.deletedAt) throw new Error('Document not found');
			const ingestionStatus = document.metadata?.ingestionStatus;
			if (
				document.metadata?.storageProvider !== 'r2' ||
				(ingestionStatus !== 'indexed' && ingestionStatus !== 'mapped') ||
				!document.metadata?.ragEntryId
			) {
				throw new Error('Select an indexed or mapped R2 document before mapping topics');
			}
			context = { document };
		}
		const pages = selectPages(await loadMarkdownPages(context.document));
		const pageRange = {
			startPage: pages[0].pageNumber,
			endPage: pages[pages.length - 1].pageNumber
		};
		const savedMap = (await ctx.runQuery(internal.questionStudio.getSavedTopicMapForRange, {
			documentId: args.documentId,
			startPage: pageRange.startPage,
			endPage: pageRange.endPage
		})) as Doc<'questionStudioTopicMaps'> | null;
		const savedMapIsFresh = Boolean(
			savedMap &&
			(savedMap.sourceIndexedAt
				? savedMap.sourceIndexedAt === context.document.metadata?.indexedAt
				: savedMap.sourceDocumentUpdatedAt === context.document.updatedAt)
		);
		if (savedMap && savedMapIsFresh && !args.force) {
			if (context.document.metadata?.ingestionStatus !== 'mapped') {
				await ctx.runMutation(internal.ragKnowledgeInternal.markDocumentMapped, {
					documentId: args.documentId,
					mappedAt: savedMap.updatedAt
				});
			}
			return {
				threadId: savedMap.agentThreadId ?? '',
				model: savedMap.model,
				documentId: args.documentId,
				pageRange,
				topics: savedMap.topics as TopicMapItem[],
				topicMapId: savedMap._id,
				cached: true,
				updatedAt: savedMap.updatedAt,
				usage: null
			};
		}

		assertOpenRouterKey();
		await questionStudioRateLimiter.limit(ctx, 'questionStudioGenerationStart', {
			key: identity?.subject ?? `operator:${args.documentId}`,
			throws: true
		});
		await questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalGenerationStart', {
			throws: true
		});

		const sourceText = pagesToPromptText(pages, MAX_TOPIC_SOURCE_CHARS);

		const tools = {
			getAllowedSourceText: createTool({
				description:
					'Return the selected source notes. This tool has no access outside the selected document and page range.',
				inputSchema: z.object({}),
				execute: async () => ({
					documentTitle: context.document.title,
					pageNumbers: pages.map((page) => page.pageNumber),
					text: pagesToPromptText(pages, MAX_SOURCE_CHARS)
				})
			})
		};
		const agent = createQuestionStudioAgent(tools, QUESTION_STUDIO_FLASH_MODEL);
		const { threadId } = await agent.createThread(ctx, {
			userId: identity?.subject ?? `operator:${args.documentId}`,
			title: `Map notes: ${context.document.title}`
		});

		const result = await agent.generateObject(
			ctx,
			{ threadId, userId: identity?.subject ?? `operator:${args.documentId}` },
			{
				schema: topicMapSchema,
				providerOptions: QUESTION_STUDIO_PROVIDER_OPTIONS,
				prompt: [
					'Map these notes into teachable topics for question generation.',
					'Return coverage-focused topics. Each topic should be narrow enough to support 1-10 questions.',
					'Use page numbers from the source only.',
					reasoningOrderPrompt(),
					'No destination module has been selected, so make this a document-level topic map.',
					`Selected pages: ${pages.map((page) => page.pageNumber).join(', ')}`,
					'Source excerpt:',
					sourceText
				].join('\n\n')
			},
			{ storageOptions: { saveMessages: 'promptAndOutput' } }
		);

		const topics = result.object.topics.map((topic, index) => clampTopic(topic, pages, index));
		const topicMapId = (await ctx.runMutation(internal.questionStudio.saveTopicMapForRange, {
			documentId: args.documentId,
			cohortId: context.document.cohortId,
			startPage: pageRange.startPage,
			endPage: pageRange.endPage,
			pageCount: pages.length,
			topics,
			model: QUESTION_STUDIO_FLASH_MODEL,
			agentThreadId: threadId,
			sourceDocumentUpdatedAt: context.document.updatedAt,
			sourceIndexedAt: context.document.metadata?.indexedAt,
			createdByUserId: context.user?._id
		})) as Id<'questionStudioTopicMaps'>;
		await ctx.runMutation(internal.ragKnowledgeInternal.markDocumentMapped, {
			documentId: args.documentId,
			mappedAt: Date.now()
		});
		return {
			threadId,
			model: QUESTION_STUDIO_FLASH_MODEL,
			documentId: args.documentId,
			pageRange,
			topics,
			topicMapId,
			cached: false,
			updatedAt: Date.now(),
			usage: result.usage
		};
	}
});

export const generateCandidates = action({
	args: {
		documentId: v.id('contentLib'),
		moduleId: v.id('module'),
		startPage: v.optional(v.number()),
		endPage: v.optional(v.number()),
		topics: v.array(topicInputValidator),
		counts: v.object({
			first: v.number(),
			second: v.number(),
			third: v.number()
		}),
		focusNotes: v.optional(v.string()),
		jobId: v.optional(v.id('questionStudioJobs')),
		model: v.optional(questionStudioModelValidator)
	},
	handler: async (ctx, args): Promise<QueuedGenerationResult> => {
		const report = async (update: Record<string, unknown>) => {
			if (!args.jobId) return;
			try {
				await ctx.runMutation(internal.questionStudio.updateGenerationJob, {
					jobId: args.jobId,
					...update
				});
			} catch {
				// Queuing progress is best-effort; scheduled workers own the durable result.
			}
		};
		assertOpenRouterKey();
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');
		if (!args.jobId) throw new Error('A generation job is required for live worker generation.');
		const { counts, total } = validateCounts(args.counts);
		const job = (await ctx.runQuery(internal.questionStudio.getGenerationJobInternal, {
			jobId: args.jobId
		})) as GenerationJobSnapshot | null;
		if (!job) throw new Error('Generation job not found');
		const model = normalizeQuestionStudioModel(job.model ?? args.model);
		if (args.topics.length === 0) throw new Error('Select at least one topic');
		const focusNotes = cleanPlainText(args.focusNotes ?? '', 1800);

		try {
			await report({
				status: 'running',
				statusText: 'Checking limits and destination capacity.',
				eventLabel: 'Started',
				eventDetail: `${total} candidates requested with ${model}.`
			});

			await questionStudioRateLimiter.limit(ctx, 'questionStudioGenerationStart', {
				key: identity.subject,
				throws: true
			});
			await questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalGenerationStart', {
				throws: true
			});

			const context = (await ctx.runQuery(internal.questionStudio.getGenerationContext, {
				clerkUserId: identity.subject,
				documentId: args.documentId,
				moduleId: args.moduleId
			})) as GenerationContext;
			if (
				(context.module.questionCount ?? context.existingQuestions.length) + total >
				MAX_QUESTIONS_PER_MODULE
			) {
				throw new Error(
					`Module limit reached (${MAX_QUESTIONS_PER_MODULE} questions). Please split this module for better learning retention.`
				);
			}

			await report({
				statusText: 'Loading extracted source pages and selected topics.',
				eventLabel: 'Loaded context',
				eventDetail: `${context.existingQuestions.length} existing module questions available for duplicate checks.`
			});

			const allPages = await loadMarkdownPages(context.document);
			const selectedPages = selectPages(allPages, args.startPage, args.endPage);
			const selectedPageSet = new Set(selectedPages.map((page) => page.pageNumber));
			const topics = args.topics.map((topic, index) =>
				clampTopic(
					{
						...topic,
						pageNumbers: topic.pageNumbers.filter((page) => selectedPageSet.has(page))
					},
					selectedPages,
					index
				)
			);

			await report({
				statusText: 'Preparing source-grounded context.',
				eventLabel: 'Prepared context',
				eventDetail: `${topics.length} topics and ${selectedPages.length} pages are in scope.`
			});

			const bufferedCounts = addRecoveryWorkerBuffer(counts, total);
			const { plan, tasks } = buildLiveGenerationWork(topics, bufferedCounts);
			const recoveryWorkerCount = tasks.reduce((sum, task) => sum + task.plannedCount, 0) - total;
			if (recoveryWorkerCount > 0) {
				plan.coverageNotes.push(
					`Added ${recoveryWorkerCount} parallel recovery worker${recoveryWorkerCount === 1 ? '' : 's'} so local validation can still return ${total} usable questions.`
				);
			}

			await report({
				statusText: 'Coverage plan ready; starting smart draft workers.',
				eventLabel: 'Plan ready',
				eventDetail: `${tasks.length} draft worker${tasks.length === 1 ? '' : 's'} queued. Each worker has at most ${MAX_QUESTIONS_PER_WORKER} questions.`,
				plan
			});

			for (const [workerIndex, task] of tasks.entries()) {
				await ctx.scheduler.runAfter(
					500 + workerIndex * 100,
					internal.questionStudio.generateCandidateWorker,
					{
						jobId: args.jobId,
						documentId: args.documentId,
						moduleId: args.moduleId,
						clerkUserId: identity.subject,
						task,
						workerIndex,
						workerTotal: tasks.length,
						model,
						focusNotes,
						startPage: args.startPage,
						endPage: args.endPage
					}
				);
			}
			await report({
				statusText: `${tasks.length} workers launched. Candidates will appear as they finish.`,
				eventLabel: 'Workers launched',
				eventDetail:
					'Each worker retrieves source context with RAG, then drafts one assigned question.'
			});

			return {
				requestedCount: total,
				workerCount: tasks.length,
				queued: true
			};
		} catch (error) {
			await report({
				status: 'failed',
				statusText: 'Generation failed.',
				eventLabel: 'Failed',
				eventDetail: error instanceof Error ? error.message : 'Unknown error',
				error: error instanceof Error ? error.message : 'Unknown error',
				completed: true
			});
			throw error;
		}
	}
});

export const saveSelectedCandidates = mutation({
	args: {
		moduleId: v.id('module'),
		documentId: v.id('contentLib'),
		candidates: v.array(candidateValidator),
		status: v.optional(v.union(v.literal('draft'), v.literal('published'), v.literal('archived')))
	},
	handler: async (ctx, args) => {
		if (args.candidates.length === 0) return { insertedIds: [], insertedCount: 0 };
		if (args.candidates.length > MAX_GENERATED_QUESTIONS) {
			throw new Error(`Save at most ${MAX_GENERATED_QUESTIONS} questions at a time`);
		}
		const { identity, module, classDoc } = await assertSaveAccess(ctx, {
			moduleId: args.moduleId,
			documentId: args.documentId
		});
		if ((module.questionCount ?? 0) + args.candidates.length > MAX_QUESTIONS_PER_MODULE) {
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
			searchText: question.searchText
		}));
		let nextOrder =
			existing.length > 0 ? Math.max(...existing.map((question) => question.order)) + 1 : 0;
		const status = args.status ?? 'draft';
		const insertedIds: Id<'question'>[] = [];

		for (const candidate of args.candidates) {
			if (candidate.metadata.sourceDocumentId !== args.documentId) {
				throw new Error('Candidate source document does not match this save request');
			}
			const duplicate = scoreDuplicateRisk(candidate, existingSummaries);
			if (duplicate.risk === 'high') {
				throw new Error('A selected question is too similar to an existing module question');
			}
			const insert = candidateToQuestionInsert(candidate, args.moduleId, nextOrder);
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
				searchText: insert.searchText
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

		return { insertedIds, insertedCount: insertedIds.length };
	}
});
