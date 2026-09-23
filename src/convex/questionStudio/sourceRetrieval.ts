import { RAG } from '@convex-dev/rag';
import { omit } from 'convex-helpers';
import { components } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { parseStoredPages as parseStoredMarkdownPages } from '../documentParsing';
import { r2 } from '../r2Documents';
import { evidenceForObjective } from './quality';
import type {
	DocumentRagFilters,
	DocumentRagMetadata,
	ExistingQuestionSummary,
	SourceCitation,
	StoredMarkdownPage,
	TopicMapItem
} from './shared';
import { MAX_WORKER_RAG_CHARS, openRouter } from './shared';
import { cleanPlainText, normalizeText, uniqueSortedNumbers } from './text';
import { EMBEDDING_DIMENSION, EMBEDDING_MODEL } from '../aiModels';

export const documentRag = new RAG<DocumentRagFilters, DocumentRagMetadata>(components.rag, {
	textEmbeddingModel: openRouter().embedding(EMBEDDING_MODEL),
	embeddingDimension: EMBEDDING_DIMENSION,
	filterNames: ['sourceType', 'sourceDocumentId', 'pageNumber', 'chunkType']
});

export function documentNamespace(documentId: string) {
	return `document:${documentId}`;
}

export async function loadMarkdownPages(
	document: Doc<'contentLib'>
): Promise<StoredMarkdownPage[]> {
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

export function selectPages(
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

export function pagesToPromptText(pages: StoredMarkdownPage[], maxChars: number) {
	const text = pages.map((page) => `Page ${page.pageNumber}\n\n${page.text}`).join('\n\n---\n\n');
	return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n[Source clipped]` : text;
}

export function createSourceIntelligenceOperations(args: {
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
		searchSourceChunks: async ({ query, limit }: { query: string; limit?: number }) => {
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
			const excerpts = evidenceForObjective(
				args.selectedPages,
				citations.map((c) => c.pageNumber),
				query,
				args.noteFile,
				MAX_WORKER_RAG_CHARS
			);
			return {
				documentTitle: args.documentTitle,
				query: cleanPlainText(query, 500),
				resultCount: search.results.length,
				citations: excerpts.map((excerpt) => omit(excerpt, ['text'])),
				excerpts,
				text: excerpts
					.map((c) => `[${c.citationId} | page ${c.pageNumber}]\n${c.text}`)
					.join('\n\n')
			};
		},
		getSourcePages: async ({ pageNumbers }: { pageNumbers: number[] }) => {
			const pages = uniqueSortedNumbers(pageNumbers)
				.map((pageNumber) => pageByNumber.get(pageNumber))
				.filter((page): page is StoredMarkdownPage => Boolean(page));
			return {
				documentTitle: args.documentTitle,
				pageNumbers: pages.map((page) => page.pageNumber),
				text: pagesToPromptText(pages, MAX_WORKER_RAG_CHARS)
			};
		},
		getTopicCoverageMap: async () => {
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
						questionTypes: {
							learn: related.filter((question) => question.questionType === 'learn').length,
							clinical: related.filter((question) => question.questionType === 'clinical').length,
							criticalThinking: related.filter(
								(question) => question.questionType === 'criticalThinking'
							).length
						},
						exampleStems: related.slice(0, 3).map((question) => question.stem)
					};
				})
			};
		}
	};
}

export function citationKey(citation: SourceCitation) {
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

export function citationsFromSearch(
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
