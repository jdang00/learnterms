import { createTool } from '@convex-dev/agent';
import { RAG } from '@convex-dev/rag';
import { NoObjectGeneratedError } from 'ai';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { components } from '../_generated/api';
import { z } from 'zod/v4';
import { r2 } from '../r2Documents';
import {
	EMBEDDING_DIMENSION,
	EMBEDDING_MODEL,
	MAX_EXTRA_RECOVERY_WORKERS,
	MAX_GENERATED_QUESTIONS,
	MAX_JOB_EVENT_DETAIL_CHARS,
	MAX_QUESTIONS_PER_WORKER,
	MAX_WORKER_RAG_CHARS,
	MAX_WORKER_SOURCE_CHARS,
	RECOVERY_WORKER_RATIO,
	candidateSchema,
	openRouter
} from './shared';
import type {
	CandidateQuestion,
	CandidateReview,
	DocumentRagFilters,
	DocumentRagMetadata,
	DuplicateRisk,
	ExistingQuestionSummary,
	GenerationJobSnapshot,
	GenerationPlan,
	JobEvent,
	LiveWorkerTask,
	LiveWorkerTopicAllocation,
	QuestionStudioModel,
	ReasoningOrder,
	SourceCitation,
	StoredMarkdownPage,
	TopicMapItem
} from './shared';

export const documentRag = new RAG<DocumentRagFilters, DocumentRagMetadata>(components.rag, {
	textEmbeddingModel: openRouter().embedding(EMBEDDING_MODEL),
	embeddingDimension: EMBEDDING_DIMENSION,
	filterNames: ['sourceType', 'sourceDocumentId', 'pageNumber', 'chunkType']
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

function uniqueSortedNumbers(values: number[]) {
	return [
		...new Set(values.filter((value) => Number.isFinite(value)).map((value) => Math.floor(value)))
	].sort((a, b) => a - b);
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

function createSourceIntelligenceTools(args: {
	ctx: Parameters<(typeof documentRag)['search']>[0];
	documentId: Id<'contentLib'>;
	documentTitle: string;
	noteFile: string;
	selectedPages: StoredMarkdownPage[];
	topics?: TopicMapItem[];
	existingQuestions?: ExistingQuestionSummary[];
}) {
	const pageByNumber = new Map(args.selectedPages.map((page) => [page.pageNumber, page]));
	const allowedPageNumbers = new Set(pageByNumber.keys());
	const fallback = { noteFile: args.noteFile, title: args.documentTitle };

	return {
		searchSourceChunks: createTool({
			description:
				'Search the selected document for relevant source chunks. Use this to gather precise evidence before drafting or validating a question. This tool cannot access other documents.',
			inputSchema: z.object({
				query: z.string().min(1).max(500),
				limit: z.number().int().min(1).max(8).optional()
			}),
			execute: async (_toolCtx, { query, limit }) => {
				const search = await documentRag.search(args.ctx, {
					namespace: documentNamespace(String(args.documentId)),
					query: cleanPlainText(query, 500),
					limit: limit ?? 4,
					chunkContext: { before: 1, after: 1 },
					searchType: 'hybrid'
				});
				const citations = citationsFromSearch(search, fallback).filter((citation) =>
					allowedPageNumbers.has(citation.pageNumber)
				);
				return {
					documentTitle: args.documentTitle,
					query: cleanPlainText(query, 500),
					resultCount: search.results.length,
					citations,
					text: cleanPlainText(search.text, MAX_WORKER_RAG_CHARS)
				};
			}
		}),
		getSourcePages: createTool({
			description:
				'Return extracted source text for specific allowed page numbers from the selected document. Use this for nearby context after a search result or citation.',
			inputSchema: z.object({
				pageNumbers: z.array(z.number().int().positive()).min(1).max(5)
			}),
			execute: async (_toolCtx, { pageNumbers }) => {
				const pages = uniqueSortedNumbers(pageNumbers)
					.map((pageNumber) => pageByNumber.get(pageNumber))
					.filter((page): page is StoredMarkdownPage => Boolean(page));
				return {
					documentTitle: args.documentTitle,
					pageNumbers: pages.map((page) => page.pageNumber),
					text: pagesToPromptText(pages, MAX_WORKER_SOURCE_CHARS)
				};
			}
		}),
		getTopicCoverageMap: createTool({
			description:
				'Summarize selected topic coverage against existing module questions from this source document. Use this to avoid over-covered pages/topics and find gaps.',
			inputSchema: z.object({}),
			execute: async () => {
				const existing = args.existingQuestions ?? [];
				const topics = args.topics ?? [];
				return {
					documentTitle: args.documentTitle,
					existingQuestionCount: existing.length,
					topics: topics.map((topic) => {
						const topicPages = new Set(topic.pageNumbers);
						const related = existing.filter((question) => {
							const sameDocument =
								!question.sourceDocumentId || question.sourceDocumentId === args.documentId;
							if (!sameDocument) return false;
							const sameTopic =
								question.topicTitle &&
								normalizeText(question.topicTitle) === normalizeText(topic.title);
							const samePage = question.sourcePageNumbers?.some((page) => topicPages.has(page));
							return Boolean(sameTopic || samePage);
						});
						return {
							topicId: topic.topicId,
							title: topic.title,
							pageNumbers: topic.pageNumbers,
							estimatedQuestionCapacity: topic.estimatedQuestionCapacity,
							existingQuestionCount: related.length,
							reasoningOrders: {
								first: related.filter((question) => question.reasoningOrder === 'first').length,
								second: related.filter((question) => question.reasoningOrder === 'second').length,
								third: related.filter((question) => question.reasoningOrder === 'third').length
							},
							exampleStems: related.slice(0, 3).map((question) => question.stem)
						};
					})
				};
			}
		})
	};
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

function mechanicalCandidateGate(candidate: CandidateQuestion): {
	pass: boolean;
	reasons: string[];
	sourceSupport: CandidateReview['sourceSupport'];
	answerQuality: CandidateReview['answerQuality'];
} {
	const reasons: string[] = [];
	let sourceSupport: CandidateReview['sourceSupport'] = 'strong';
	let answerQuality: CandidateReview['answerQuality'] = 'clear';
	if (candidateHasProvenanceLanguage(candidate)) {
		answerQuality = 'ambiguous';
		reasons.push('Student-facing text includes source/provenance language.');
	}
	if (!candidate.sourceCitations?.length || candidate.sourcePageNumbers.length === 0) {
		sourceSupport = 'weak';
		reasons.push('Missing page-level source citations.');
	}
	if (
		candidate.correctAnswers.length !== 1 ||
		!candidate.options.some(
			(option) => normalizeText(option) === normalizeText(candidate.correctAnswers[0] ?? '')
		)
	) {
		answerQuality = 'ambiguous';
		reasons.push('Correct answer does not match exactly one option.');
	}
	return { pass: reasons.length === 0, reasons, sourceSupport, answerQuality };
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
		candidate.metadata.model
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
				model: candidate.metadata.model,
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

export {
	addRecoveryWorkerBuffer,
	buildFocusInstruction,
	buildLiveGenerationWork,
	candidateHasProvenanceLanguage,
	candidateToQuestionInsert,
	citationKey,
	citationsFromSearch,
	clampTopic,
	cleanPlainText,
	coerceGeneratedCandidate,
	createCandidateDraftRepairText,
	createSourceIntelligenceTools,
	defaultWorkerRetrievalQuery,
	deleteGenerationJobRows,
	documentNamespace,
	existingQuestionStemsToPrompt,
	formatStructuredOutputError,
	hydrateGenerationJob,
	insertGenerationJobEvent,
	loadMarkdownPages,
	mechanicalCandidateGate,
	normalizeJobEvent,
	normalizeCandidateDraftPayload,
	normalizeText,
	pagesForTask,
	pagesToPromptText,
	parseModelJsonText,
	questionWritingSkillPrompt,
	reasoningOrderPrompt,
	recoverStructuredObjectFromError,
	safeParseSchema,
	scoreDuplicateRisk,
	selectPages,
	stemLooksLikePatientCase,
	taskLabel,
	taskPageNumbers,
	taskTopics,
	validateCounts
};
