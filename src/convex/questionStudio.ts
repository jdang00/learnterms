import { Agent, createTool, stepCountIs, type ToolCtx } from '@convex-dev/agent';
import { RAG } from '@convex-dev/rag';
import { RateLimiter, MINUTE } from '@convex-dev/rate-limiter';
import { createOpenAI } from '@ai-sdk/openai';
import { v } from 'convex/values';
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { components, internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { z } from 'zod/v4';
import { r2 } from './r2Documents';
import { applyQuestionCreationDeltaAndEvaluateBadges } from './badgeEngine';

const QUESTION_STUDIO_PRO_MODEL = 'deepseek/deepseek-v4-pro';
const QUESTION_STUDIO_FLASH_MODEL = 'deepseek/deepseek-v4-flash';
const QUESTION_STUDIO_MODEL = QUESTION_STUDIO_PRO_MODEL;
const EMBEDDING_MODEL = 'openai/text-embedding-3-large';
const EMBEDDING_DIMENSION = 3072;
const MAX_GENERATED_QUESTIONS = 30;
const MAX_QUESTIONS_PER_MODULE = 150;
const MAX_SOURCE_CHARS = 80_000;
const MAX_TOPIC_SOURCE_CHARS = 60_000;

type ReasoningOrder = 'first' | 'second' | 'third';
type DuplicateRisk = 'low' | 'medium' | 'high';

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
	duplicateRisk: DuplicateRisk;
	similarQuestionIds: Id<'question'>[];
	metadata: {
		model: string;
		agentThreadId?: string;
		sourceDocumentId: Id<'contentLib'>;
	};
};

type GenerationPlan = {
	topicAllocations: Array<{
		topicId: string;
		topicTitle: string;
		plannedCount: number;
		reasoningOrders: ReasoningOrder[];
		sourcePages: number[];
		notes: string;
	}>;
	coverageNotes: string[];
	riskNotes: string[];
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

type MapNotesResult = {
	threadId: string;
	model: string;
	documentId: Id<'contentLib'>;
	moduleId: Id<'module'>;
	pageRange: { startPage: number; endPage: number };
	topics: TopicMapItem[];
	topicMapId?: Id<'questionStudioTopicMaps'>;
	cached: boolean;
	updatedAt?: number;
	usage: unknown;
};

type GenerateCandidatesResult = {
	threadId: string;
	model: string;
	requestedCount: number;
	candidates: CandidateQuestion[];
	blockedDuplicateCount: number;
	usage: unknown;
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

const documentRag = new RAG<DocumentRagFilters, DocumentRagMetadata>(components.rag, {
	textEmbeddingModel: openRouter().embedding(EMBEDDING_MODEL),
	embeddingDimension: EMBEDDING_DIMENSION,
	filterNames: ['sourceType', 'sourceDocumentId', 'pageNumber', 'chunkType']
});

function createQuestionStudioAgent(tools?: Record<string, any>, model = QUESTION_STUDIO_PRO_MODEL) {
	return new Agent(components.agent, {
		name: 'Question Studio Curator',
		languageModel: openRouter().chat(model),
		instructions: [
			'You are a LearnTerms curriculum question curator.',
			'Use only the provided source notes and read-only tools.',
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
	duplicateRisk: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
	similarQuestionIds: v.array(v.id('question')),
	metadata: v.object({
		model: v.string(),
		agentThreadId: v.optional(v.string()),
		sourceDocumentId: v.id('contentLib')
	})
});

const generationPlanValidator = v.object({
	topicAllocations: v.array(
		v.object({
			topicId: v.string(),
			topicTitle: v.string(),
			plannedCount: v.number(),
			reasoningOrders: v.array(reasoningOrderValidator),
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
				sourcePageNumbers: z.array(z.number().int().positive()).min(1),
				duplicateRisk: z.enum(['low', 'medium', 'high']).optional(),
				similarQuestionIds: z.array(z.string()).optional()
			})
		)
		.min(1)
		.max(MAX_GENERATED_QUESTIONS)
});

const generationPlanSchema = z.object({
	topicAllocations: z
		.array(
			z.object({
				topicId: z.string().min(1).max(80),
				topicTitle: z.string().min(2).max(120),
				plannedCount: z.number().int().min(0).max(MAX_GENERATED_QUESTIONS),
				reasoningOrders: z.array(z.enum(['first', 'second', 'third'])).min(1).max(3),
				sourcePages: z.array(z.number().int().positive()).min(1),
				notes: z.string().min(1).max(500)
			})
		)
		.min(1)
		.max(24),
	coverageNotes: z.array(z.string().min(1).max(500)).max(8),
	riskNotes: z.array(z.string().min(1).max(500)).max(8)
});

const candidateReviewSchema = z.object({
	reviews: z
		.array(
			z.object({
				candidateIndex: z.number().int().min(0).max(MAX_GENERATED_QUESTIONS - 1),
				verdict: z.enum(['accept', 'revise', 'reject']),
				reasons: z.array(z.string().min(1).max(360)).min(1).max(6),
				sourceSupport: z.enum(['strong', 'partial', 'weak']),
				answerQuality: z.enum(['clear', 'ambiguous']),
				revisedStem: z.string().min(12).max(900).optional(),
				revisedRationale: z.string().min(20).max(1600).optional()
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
	const markdownKey = document.metadata?.extractionArtifactKeys?.find((key) =>
		key.endsWith('.md')
	);
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
			.map((answerId) => existing.options.find((option) => option.startsWith(`${answerId}:`)) ?? answerId)
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
		const rationaleScore = stemSimilarity(candidate.rationale, existing.rationale ?? existing.searchText ?? '');

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
		learningObjectives: topic.learningObjectives.map((item) => cleanPlainText(item, 180)).slice(0, 6),
		keyTerms: topic.keyTerms.map((item) => cleanPlainText(item, 80)).slice(0, 12),
		suggestedOrders: [...new Set(topic.suggestedOrders)].slice(0, 3),
		estimatedQuestionCapacity: Math.max(1, Math.min(10, Math.floor(topic.estimatedQuestionCapacity)))
	};
}

function coerceGeneratedCandidate(
	raw: z.infer<typeof candidateSchema>['questions'][number],
	topics: TopicMapItem[],
	documentId: Id<'contentLib'>,
	threadId: string
): CandidateQuestion | null {
	const options = raw.options.map((option) => cleanPlainText(option, 260)).filter(Boolean);
	const uniqueOptions = [...new Map(options.map((option) => [normalizeText(option), option])).values()];
	const correct = cleanPlainText(raw.correctAnswers[0] ?? '', 260);
	const correctIndex = uniqueOptions.findIndex((option) => normalizeText(option) === normalizeText(correct));
	if (uniqueOptions.length < 3 || uniqueOptions.length > 5 || correctIndex === -1) return null;

	const topic = topics.find((item) => item.topicId === raw.topicId) ?? topics[0];
	const sourcePages = raw.sourcePageNumbers.filter((page) => topic.pageNumbers.includes(page));
	return {
		type: 'multiple_choice',
		stem: cleanPlainText(raw.stem, 900),
		options: uniqueOptions,
		correctAnswers: [uniqueOptions[correctIndex]],
		rationale: cleanPlainText(raw.rationale, 1600),
		reasoningOrder: raw.reasoningOrder,
		topicId: topic.topicId,
		topicTitle: topic.title,
		sourcePageNumbers: sourcePages.length > 0 ? sourcePages : topic.pageNumbers,
		duplicateRisk: raw.duplicateRisk ?? 'low',
		similarQuestionIds: [],
		metadata: {
			model: QUESTION_STUDIO_MODEL,
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

function candidateToQuestionInsert(candidate: CandidateQuestion, moduleId: Id<'module'>, order: number) {
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

async function getActor(ctx: { db: any; auth: any }) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error('Unauthorized');
	const user = await ctx.db
		.query('users')
		.withIndex('by_clerkUserId', (q: any) => q.eq('clerkUserId', identity.subject))
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
		if (
			document.metadata?.storageProvider !== 'r2' ||
			document.metadata?.ingestionStatus !== 'indexed' ||
			!document.metadata?.ragEntryId
		) {
			throw new Error('Select an indexed R2 document before using Question Studio');
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
				q.eq('documentId', args.documentId).eq('startPage', args.startPage).eq('endPage', args.endPage)
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
		createdFromModuleId: v.id('module'),
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
				q.eq('documentId', args.documentId).eq('startPage', args.startPage).eq('endPage', args.endPage)
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

export const createGenerationJob = mutation({
	args: {
		documentId: v.id('contentLib'),
		moduleId: v.id('module'),
		requestedCount: v.number()
	},
	handler: async (ctx, args) => {
		const { user, classDoc } = await assertSaveAccess(ctx, {
			moduleId: args.moduleId,
			documentId: args.documentId
		});
		const now = Date.now();
		return await ctx.db.insert('questionStudioJobs', {
			documentId: args.documentId,
			moduleId: args.moduleId,
			cohortId: classDoc.cohortId,
			createdByUserId: user._id,
			kind: 'candidate_generation',
			status: 'queued',
			statusText: 'Queued candidate generation.',
			events: [{ at: now, label: 'Queued', detail: 'Preparing the agent run.' }],
			model: QUESTION_STUDIO_MODEL,
			requestedCount: Math.floor(args.requestedCount),
			createdAt: now,
			updatedAt: now
		});
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
		return job;
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
		const events = args.eventLabel
			? [
					...job.events,
					{
						at: now,
						label: args.eventLabel,
						detail: args.eventDetail
					}
				].slice(-50)
			: job.events;
		await ctx.db.patch(args.jobId, {
			...(args.status ? { status: args.status } : {}),
			...(args.statusText ? { statusText: args.statusText } : {}),
			...(args.threadId ? { threadId: args.threadId } : {}),
			...(args.plan ? { plan: args.plan } : {}),
			...(args.reviews ? { reviews: args.reviews } : {}),
			...(args.candidates ? { candidates: args.candidates } : {}),
			...(args.blockedDuplicateCount !== undefined
				? { blockedDuplicateCount: args.blockedDuplicateCount }
				: {}),
			...(args.error ? { error: args.error } : {}),
			events,
			updatedAt: now,
			...(args.completed ? { completedAt: now } : {})
		});
	}
});

export const mapNotes = action({
	args: {
		documentId: v.id('contentLib'),
		moduleId: v.id('module'),
		startPage: v.optional(v.number()),
		endPage: v.optional(v.number())
	},
	handler: async (ctx, args): Promise<MapNotesResult> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');

		const context = (await ctx.runQuery((internal as any).questionStudio.getGenerationContext, {
			clerkUserId: identity.subject,
			documentId: args.documentId,
			moduleId: args.moduleId
		})) as GenerationContext;
		const pages = selectPages(await loadMarkdownPages(context.document), args.startPage, args.endPage);
		const pageRange = {
			startPage: pages[0].pageNumber,
			endPage: pages[pages.length - 1].pageNumber
		};
		const savedMap = (await ctx.runQuery((internal as any).questionStudio.getSavedTopicMapForRange, {
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
		if (savedMap && savedMapIsFresh) {
			return {
				threadId: savedMap.agentThreadId ?? '',
				model: savedMap.model,
				documentId: args.documentId,
				moduleId: args.moduleId,
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
			key: identity.subject,
			throws: true
		});
		await questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalGenerationStart', {
			throws: true
		});

		const sourceText = pagesToPromptText(pages, MAX_TOPIC_SOURCE_CHARS);

		const tools = {
			getAllowedSourceText: createTool({
				description: 'Return the selected source notes. This tool has no access outside the selected document and page range.',
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
			userId: identity.subject,
			title: `Map notes: ${context.document.title}`
		});

		const result = await agent.generateObject(
			ctx,
			{ threadId, userId: identity.subject },
			{
				schema: topicMapSchema,
				prompt: [
					'Map these notes into teachable topics for question generation.',
					'Return coverage-focused topics. Each topic should be narrow enough to support 1-10 questions.',
					'Use page numbers from the source only.',
					'Reasoning orders: first = recall; second = mechanism/application; third = multi-step reasoning.',
					`Destination module: ${context.module.title}`,
					`Selected pages: ${pages.map((page) => page.pageNumber).join(', ')}`,
					'Source excerpt:',
					sourceText
				].join('\n\n')
			},
			{ storageOptions: { saveMessages: 'promptAndOutput' } }
		);

		const topics = result.object.topics.map((topic, index) => clampTopic(topic, pages, index));
		const topicMapId = (await ctx.runMutation((internal as any).questionStudio.saveTopicMapForRange, {
			documentId: args.documentId,
			cohortId: context.document.cohortId,
			createdFromModuleId: args.moduleId,
			startPage: pageRange.startPage,
			endPage: pageRange.endPage,
			pageCount: pages.length,
			topics,
			model: QUESTION_STUDIO_FLASH_MODEL,
			agentThreadId: threadId,
			sourceDocumentUpdatedAt: context.document.updatedAt,
			sourceIndexedAt: context.document.metadata?.indexedAt,
			createdByUserId: context.user._id
		})) as Id<'questionStudioTopicMaps'>;
		return {
			threadId,
			model: QUESTION_STUDIO_FLASH_MODEL,
			documentId: args.documentId,
			moduleId: args.moduleId,
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
		jobId: v.optional(v.id('questionStudioJobs'))
	},
	handler: async (ctx, args): Promise<GenerateCandidatesResult> => {
		const report = async (update: Record<string, unknown>) => {
			if (!args.jobId) return;
			await ctx.runMutation((internal as any).questionStudio.updateGenerationJob, {
				jobId: args.jobId,
				...update
			});
		};
		assertOpenRouterKey();
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');
		const { counts, total } = validateCounts(args.counts);
		if (args.topics.length === 0) throw new Error('Select at least one topic');

		try {
			await report({
				status: 'running',
				statusText: 'Checking limits and destination capacity.',
				eventLabel: 'Started',
				eventDetail: `${total} candidates requested with ${QUESTION_STUDIO_MODEL}.`
			});

			await questionStudioRateLimiter.limit(ctx, 'questionStudioGenerationStart', {
				key: identity.subject,
				throws: true
			});
			await questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalGenerationStart', {
				throws: true
			});

			const context = (await ctx.runQuery((internal as any).questionStudio.getGenerationContext, {
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
			const sourcePages = selectedPages.filter((page) =>
				topics.some((topic) => topic.pageNumbers.includes(page.pageNumber))
			);
			const sourceText = pagesToPromptText(
				sourcePages.length > 0 ? sourcePages : selectedPages,
				MAX_SOURCE_CHARS
			);

			const existingQuestions = context.existingQuestions;

			await report({
				statusText: 'Preparing source-grounded tools for the agent.',
				eventLabel: 'Prepared tools',
				eventDetail: `${topics.length} topics and ${selectedPages.length} pages are in scope.`
			});

			const scopedToolCtx = ctx as ToolCtx;
			const tools = {
			getAllowedSourceText: createTool({
				description: 'Return selected source notes only. The input cannot change document access.',
				inputSchema: z.object({}),
				ctx: scopedToolCtx,
				execute: async () => ({
					documentTitle: context.document.title,
					pageNumbers: selectedPages.map((page) => page.pageNumber),
					text: sourceText
				})
			}),
			getExistingModuleQuestions: createTool({
				description: 'Return existing questions in the destination module so duplicates can be avoided.',
				inputSchema: z.object({
					limit: z.number().int().min(1).max(200).optional()
				}),
				ctx: scopedToolCtx,
				execute: async (_ctx, input) => ({
					moduleTitle: context.module.title,
					questions: existingQuestions.slice(0, input.limit ?? 200)
				})
			}),
			searchSourceContext: createTool({
				description: 'Search within the selected indexed source document only.',
				inputSchema: z.object({
					query: z.string().min(3).max(240),
					limit: z.number().int().min(1).max(8).optional()
				}),
				ctx: scopedToolCtx,
				execute: async (_ctx, input) => {
					const search = await documentRag.search(ctx, {
						namespace: documentNamespace(String(args.documentId)),
						query: input.query,
						limit: input.limit ?? 4,
						chunkContext: { before: 1, after: 1 },
						searchType: 'hybrid'
					});
					return { text: search.text.slice(0, 7000) };
				}
			})
		};
			const agent = createQuestionStudioAgent(tools);
			const { threadId } = await agent.createThread(ctx, {
				userId: identity.subject,
				title: `Generate questions: ${context.document.title}`
			});
			await report({ threadId });

			await report({
				statusText: 'DeepSeek is planning coverage.',
				eventLabel: 'Planning',
				eventDetail:
					'The model is choosing topic allocation, reasoning levels, source pages, and risk notes.'
			});

			const planResult = await agent.generateObject(
				ctx,
				{ threadId, userId: identity.subject },
				{
					schema: generationPlanSchema,
					prompt: [
						'Create a compact generation plan before drafting questions.',
						`Target exactly ${total} questions: ${counts.first} first-order, ${counts.second} second-order, ${counts.third} third-order.`,
						'Allocate planned counts across selected topics. Include reasoning orders, source pages, and brief notes for each allocation.',
						'Call out thin source coverage, overlap, ambiguity, or duplicate-risk concerns in riskNotes.',
						'Do not draft questions yet.',
						`Selected topics:\n${JSON.stringify(topics, null, 2)}`,
						`Existing question count: ${existingQuestions.length}`,
						'Source excerpt:',
						sourceText
					].join('\n\n')
				},
				{ storageOptions: { saveMessages: 'promptAndOutput' } }
			);
			const plan = planResult.object as GenerationPlan;
			await report({
				statusText: 'Coverage plan ready.',
				eventLabel: 'Plan ready',
				eventDetail: `${plan.topicAllocations.length} topic allocations, ${plan.riskNotes.length} risk notes.`,
				plan
			});

			await report({
				statusText: 'DeepSeek is drafting candidates from the plan.',
				eventLabel: 'Drafting',
				eventDetail:
					'The model is using source excerpts, selected topics, the coverage plan, and read-only tools. Hidden chain-of-thought is not displayed.'
			});

			const result = await agent.generateObject(
				ctx,
				{ threadId, userId: identity.subject },
				{
					schema: candidateSchema,
					prompt: [
						'Generate multiple-choice LearnTerms question candidates from the selected notes and coverage plan.',
						`Create exactly ${total} questions: ${counts.first} first-order, ${counts.second} second-order, ${counts.third} third-order.`,
						'First-order means direct recall. Second-order means mechanism, interpretation, or simple application. Third-order means multi-step reasoning or comparison.',
						'Every question must be grounded in the source pages and linked to one selected topic.',
						'Use exactly one correct answer. The correctAnswers array must contain the exact option text for the correct option.',
						'Avoid duplicating existing module questions. Use the tools to inspect existing questions and source context.',
						`Coverage plan:\n${JSON.stringify(plan, null, 2)}`,
						`Selected topics:\n${JSON.stringify(topics, null, 2)}`,
						`Existing question count: ${existingQuestions.length}`,
						'Source excerpt:',
						sourceText
					].join('\n\n')
				},
				{ storageOptions: { saveMessages: 'promptAndOutput' } }
			);

			await report({
				statusText: 'Validating structure and checking duplicate risk.',
				eventLabel: 'Validating',
				eventDetail: `${result.object.questions.length} raw candidates returned.`
			});

			const accepted: CandidateQuestion[] = [];
			for (const raw of result.object.questions) {
				const coerced = coerceGeneratedCandidate(raw, topics, args.documentId, threadId);
				if (!coerced) continue;
				const duplicate = scoreDuplicateRisk(coerced, existingQuestions, accepted);
				coerced.duplicateRisk = duplicate.risk === 'high' ? 'high' : raw.duplicateRisk ?? duplicate.risk;
				if (duplicate.risk !== 'low') coerced.duplicateRisk = duplicate.risk;
				coerced.similarQuestionIds = duplicate.similarQuestionIds;
				if (coerced.duplicateRisk === 'high') continue;
				accepted.push(coerced);
			}

			const blockedDuplicateCount = result.object.questions.length - accepted.length;
			await report({
				statusText: 'Draft candidates ready; starting review.',
				eventLabel: 'Draft ready',
				eventDetail: `${accepted.length} candidates passed local checks before model review.`,
				candidates: accepted.slice(0, total),
				blockedDuplicateCount
			});
			await report({
				statusText: 'DeepSeek is reviewing the draft candidates.',
				eventLabel: 'Reviewing',
				eventDetail: `${accepted.length} candidates passed local structure and duplicate checks.`
			});

			let reviews: CandidateReview[] = [];
			if (accepted.length > 0) {
				const reviewResult = await agent.generateObject(
					ctx,
					{ threadId, userId: identity.subject },
					{
						schema: candidateReviewSchema,
						prompt: [
							'Review these drafted multiple-choice questions against the source notes.',
							'Return one review for each candidate index. Use accept, revise, or reject.',
							'Reject if source support is weak, answer choices are ambiguous, rationale is not source-grounded, or the question is too duplicative.',
							'Use revisedStem or revisedRationale only for small fixes. Do not rewrite answer options in this review step.',
							`Candidates:\n${JSON.stringify(accepted, null, 2)}`,
							`Coverage plan:\n${JSON.stringify(plan, null, 2)}`,
							'Source excerpt:',
							sourceText
						].join('\n\n')
					},
					{ storageOptions: { saveMessages: 'promptAndOutput' } }
				);
				reviews = reviewResult.object.reviews as CandidateReview[];
			}

			const reviewByIndex = new Map(reviews.map((review) => [review.candidateIndex, review]));
			const candidates = accepted
				.map((candidate, index) => {
					const review = reviewByIndex.get(index);
					if (!review || review.verdict === 'accept') return candidate;
					if (review.verdict === 'reject') return null;
					return {
						...candidate,
						stem: review.revisedStem ? cleanPlainText(review.revisedStem, 900) : candidate.stem,
						rationale: review.revisedRationale
							? cleanPlainText(review.revisedRationale, 1600)
							: candidate.rationale
					};
				})
				.filter((candidate): candidate is CandidateQuestion => Boolean(candidate))
				.slice(0, total);

			await report({
				statusText: 'Review complete.',
				eventLabel: 'Review complete',
				eventDetail: `${reviews.filter((review) => review.verdict === 'reject').length} rejected, ${reviews.filter((review) => review.verdict === 'revise').length} revised.`,
				reviews
			});

			await report({
				status: 'ready',
				statusText: `Ready: ${candidates.length} candidates to review.`,
				eventLabel: 'Ready',
				eventDetail: blockedDuplicateCount
					? `${blockedDuplicateCount} high-risk duplicate candidates were hidden.`
					: 'No high-risk duplicates were hidden.',
				candidates,
				blockedDuplicateCount,
				completed: true
			});

			return {
				threadId,
				model: QUESTION_STUDIO_MODEL,
				requestedCount: total,
				candidates,
				blockedDuplicateCount,
				usage: result.usage
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
		let nextOrder = existing.length > 0 ? Math.max(...existing.map((question) => question.order)) + 1 : 0;
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
