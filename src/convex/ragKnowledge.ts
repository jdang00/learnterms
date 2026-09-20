'use node';

import { createOpenAI } from '@ai-sdk/openai';
import { RAG, type EntryId } from '@convex-dev/rag';
import { v } from 'convex/values';
import { components, internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { ActionCtx } from './_generated/server';
import { action, internalAction } from './_generated/server';
import { DATALAB_MODEL } from './datalab';
import type { OcrDocument } from './documentParsing';
import {
	cleanSourceMarkdown,
	MAX_PDF_BYTES,
	MAX_PDF_PAGES,
	parseOcrPages,
	PARSER_VERSION,
	parseStoredPages as parseStoredMarkdownPages
} from './documentParsing';
import { assertDocumentPermission } from './questionStudio/access';
import { DEFAULT_TEXT_MODEL } from './questionStudio/shared';
import { r2 } from './r2Documents';

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

const EMBEDDING_MODEL = 'openai/text-embedding-3-large';
const EMBEDDING_DIMENSION = 3072;
const RAG_TESTER_CHAT_MODEL = DEFAULT_TEXT_MODEL;
const OCR_MODEL = DATALAB_MODEL;
const MAX_INDEX_PAGES = MAX_PDF_PAGES;

function openRouter() {
	return createOpenAI({
		name: 'openrouter',
		baseURL: 'https://openrouter.ai/api/v1',
		apiKey: process.env.OPENROUTER_API_KEY ?? 'missing-openrouter-api-key',
		headers: {
			'X-OpenRouter-Title': 'LearnTerms'
		}
	});
}

function assertOpenRouterKey() {
	if (!process.env.OPENROUTER_API_KEY) {
		throw new Error('OPENROUTER_API_KEY is not configured');
	}
}

function assertDatalabKey() {
	if (!process.env.DATALAB_API_KEY) {
		throw new Error('DATALAB_API_KEY is not configured');
	}
}

const documentRag = new RAG<DocumentRagFilters, DocumentRagMetadata>(components.rag, {
	textEmbeddingModel: openRouter().embedding(EMBEDDING_MODEL),
	embeddingDimension: EMBEDDING_DIMENSION,
	filterNames: ['sourceType', 'sourceDocumentId', 'pageNumber', 'chunkType']
});

function documentNamespace(documentId: string) {
	return `document:${documentId}`;
}

async function sha256Hex(input: string): Promise<string> {
	const bytes = new TextEncoder().encode(input);
	const hash = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function definedMetadata<T extends Record<string, unknown>>(input: T): T {
	return Object.fromEntries(
		Object.entries(input).filter(([, value]) => value !== undefined && value !== null)
	) as T;
}

async function assertCohortAccess(ctx: ActionCtx, cohortId: Id<'cohort'>) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error('Unauthorized');

	const user = await ctx.runQuery(internal.ragKnowledgeInternal.getUserForRagAccess, {
		clerkUserId: identity.subject
	});
	if (!user) throw new Error('User not found');

	assertDocumentPermission(user, cohortId, true);

	return user;
}

async function assertDocumentAccess(ctx: ActionCtx, document: Doc<'contentLib'>) {
	await assertCohortAccess(ctx, document.cohortId);
}

type LegacyOcrPage = {
	index?: number;
	markdown?: string;
	images?: Array<Record<string, unknown>>;
	tables?: Array<Record<string, unknown>>;
	hyperlinks?: Array<Record<string, unknown>>;
	header?: string | null;
	footer?: string | null;
	dimensions?: Record<string, unknown>;
	confidence_scores?: Record<string, unknown> | null;
};

type LegacyOcrResponse = {
	pages?: LegacyOcrPage[];
	model?: string;
	usage_info?: Record<string, unknown>;
};

type DeckPreviewPage = {
	pageNumber: number;
	heading?: string;
	imageCount: number;
	tableCount: number;
};

function normalizePageNumber(page: LegacyOcrPage, fallbackIndex: number) {
	if (typeof page.index === 'number') return page.index + 1;
	return fallbackIndex + 1;
}

function firstMarkdownHeading(markdown: string, fallback: string) {
	const heading = markdown
		.split('\n')
		.map((line) => line.trim())
		.find((line) => /^#{1,4}\s+\S/.test(line));
	return heading
		? heading
				.replace(/^#{1,4}\s+/, '')
				.trim()
				.slice(0, 180)
		: fallback;
}

function splitPageMarkdown(markdown: string, maxChars = 2800) {
	const blocks = markdown
		.split(/\n{2,}/)
		.map((block) => block.trim())
		.filter((block) => block.length > 0);

	const chunks: string[] = [];
	let current = '';
	for (const block of blocks) {
		if (!current) {
			current = block;
			continue;
		}
		if (`${current}\n\n${block}`.length > maxChars) {
			chunks.push(current);
			current = block;
		} else {
			current = `${current}\n\n${block}`;
		}
	}
	if (current) chunks.push(current);

	if (chunks.length > 0) return chunks;
	return markdown.trim().length >= 20 ? [markdown.trim()] : [];
}

function documentIndexArtifactKey(args: {
	cohortId: Id<'cohort'>;
	documentId: Id<'contentLib'>;
	fileName: string;
	kind: string;
	extension: string;
}) {
	const safeName = args.fileName
		.replace(/\.[^/.]+$/, '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
	return [
		'cohorts',
		String(args.cohortId),
		'content-library-index',
		String(args.documentId),
		`${args.kind}-${safeName || 'document'}-${crypto.randomUUID()}${args.extension}`
	].join('/');
}

export const indexR2Document = action({
	args: { documentId: v.id('contentLib') },
	returns: v.object({ status: v.literal('indexing'), jobId: v.id('documentIngestionJobs') }),
	handler: async (
		ctx,
		args
	): Promise<{ status: 'indexing'; jobId: Id<'documentIngestionJobs'> }> => {
		const document = await ctx.runQuery(
			internal.ragKnowledgeInternal.getDocumentForRagIngestion,
			args
		);
		if (!document) throw new Error('Document not found');
		await assertDocumentAccess(ctx, document);
		assertDatalabKey();
		assertOpenRouterKey();
		if (
			document.metadata?.storageProvider !== 'r2' ||
			!document.metadata.r2Key ||
			document.metadata.mimeType !== 'application/pdf'
		)
			throw new Error('Only R2-backed PDFs can be processed');
		if ((document.metadata.sizeBytes ?? 0) > MAX_PDF_BYTES)
			throw new Error('PDF exceeds the 30 MB limit');
		const actor = await ctx.auth.getUserIdentity();
		const jobId: Id<'documentIngestionJobs'> = await ctx.runMutation(
			internal.documentIngestion.begin,
			{ documentId: document._id, actor: actor!.subject }
		);
		return { status: 'indexing', jobId };
	}
});

export const finishDocumentIndex = internalAction({
	args: { jobId: v.id('documentIngestionJobs') },
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const job = await ctx.runQuery(internal.documentIngestion.getJob, args);
		const document = await ctx.runQuery(internal.ragKnowledgeInternal.getDocumentForRagIngestion, {
			documentId: job.documentId
		});
		if (!document || document.metadata?.ingestionJobId !== args.jobId || !job.artifactKey)
			throw new Error('Document processing superseded or removed');
		const startedAt = job.createdAt,
			actor = { subject: job.actor };
		const r2Key = document.metadata.r2Key!,
			mimeType = document.metadata.mimeType;

		const namespace = documentNamespace(String(document._id));

		try {
			const ocr = JSON.parse(await loadR2TextArtifact(job.artifactKey)) as OcrDocument;
			const validatedPages = parseOcrPages(ocr, job.expectedPages);

			const pages = [...(ocr.pages ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
			const pageCount = pages.length;
			if (pageCount === 0) throw new Error('PDF has no pages');
			if (pageCount > MAX_INDEX_PAGES) {
				throw new Error(
					`PDF has ${pageCount} pages. This first pass supports up to ${MAX_INDEX_PAGES}.`
				);
			}

			const chunks = [];
			const originalFileName = document.metadata?.originalFileName ?? document.title;
			const markdownPages: string[] = [];

			for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
				const page = pages[pageIndex];
				const pageNumber = normalizePageNumber(page, pageIndex);
				const markdown = validatedPages[pageIndex].text;
				if (!markdown) continue;

				markdownPages.push(`<!-- page:${pageNumber} -->\n\n${markdown}`);
				const pageChunks = splitPageMarkdown(markdown);
				for (let chunkIndex = 0; chunkIndex < pageChunks.length; chunkIndex++) {
					const chunkMarkdown = pageChunks[chunkIndex];
					const chunkTitle = firstMarkdownHeading(
						chunkMarkdown,
						pageChunks.length === 1
							? `Page ${pageNumber}`
							: `Page ${pageNumber}, chunk ${chunkIndex + 1}`
					);
					const imageCount = page.images?.length ?? 0;
					const tableCount = page.tables?.length ?? 0;
					chunks.push({
						pageContent: [
							`Document: ${document.title}`,
							`File: ${originalFileName}`,
							`Page: ${pageNumber}`,
							`Page section: ${chunkTitle}`,
							tableCount > 0 ? `Tables on page: ${tableCount}` : '',
							chunkMarkdown
						]
							.filter(Boolean)
							.join('\n\n'),
						metadata: {
							documentId: String(document._id),
							cohortId: String(document.cohortId),
							r2Key,
							pageNumber,
							pageLabel: `Page ${pageNumber}`,
							chunkIndex,
							chunkType: 'page_markdown',
							title: chunkTitle,
							imageCount,
							extractionWarningsJson: JSON.stringify(validatedPages[pageIndex].warnings),
							tableCount,
							confidenceJson: page.confidence_scores ? JSON.stringify(page.confidence_scores) : '',
							blocksJson: page.blocks
								? JSON.stringify(page.blocks.map(({ id, type, bbox }) => ({ id, type, bbox })))
								: ''
						}
					});
				}
			}

			if (chunks.length === 0) {
				throw new Error('No indexable text was extracted from this PDF.');
			}

			const ocrJsonKey = job.artifactKey;
			const markdownKey = documentIndexArtifactKey({
				cohortId: document.cohortId,
				documentId: document._id,
				fileName: originalFileName,
				kind: 'datalab-markdown',
				extension: '.md'
			});
			await r2.store(ctx, Buffer.from(markdownPages.join('\n\n---\n\n')), {
				key: markdownKey,
				type: 'text/markdown; charset=utf-8'
			});
			const extractionArtifactKeys = [ocrJsonKey, markdownKey];

			const contentHash = await sha256Hex(
				JSON.stringify({
					documentId: document._id,
					r2Key,
					parserVersion: PARSER_VERSION,
					model: ocr.model ?? OCR_MODEL,
					chunks: chunks.map((chunk) => chunk.pageContent)
				})
			);

			const result = await documentRag.add(ctx, {
				namespace,
				key: `document:${document._id}`,
				title: document.title,
				chunks,
				contentHash,
				filterValues: [
					{ name: 'sourceType', value: 'r2Document' },
					{ name: 'sourceDocumentId', value: String(document._id) },
					{ name: 'pageNumber', value: 'all' },
					{ name: 'chunkType', value: 'all' }
				],
				metadata: definedMetadata({
					cohortId: String(document.cohortId),
					documentId: String(document._id),
					r2Key,
					sourceType: 'r2Document',
					title: document.title,
					originalFileName,
					mimeType,
					pageCount,
					model: ocr.model ?? OCR_MODEL,
					extractionProvider: 'datalab',
					extractionArtifactKeys
				})
			});

			await ctx.runMutation(internal.ragKnowledgeInternal.updateDocumentIngestion, {
				documentId: document._id,
				status: 'indexed',
				ragNamespace: namespace,
				ragEntryId: result.entryId,
				extractionArtifactKeys,
				extractionProvider: 'datalab',
				extractionModel: ocr.model ?? OCR_MODEL,
				indexedAt: Date.now(),
				indexError: undefined,
				pageCount,
				triggeredByClerkUserId: actor!.subject,
				ingestionJobId: args.jobId
			});

			await ctx.runAction(internal.aiTelemetry.capture, {
				event: 'document_parsing_completed',
				distinctId: actor!.subject,
				properties: {
					document_id: document._id,
					page_count: pageCount,
					warning_page_count: validatedPages.filter((p) => p.warnings.length).length,
					latency_ms: Date.now() - startedAt,
					parser_version: PARSER_VERSION,
					provider: 'datalab',
					cost_cents: job.costCents ?? null
				}
			});

			await ctx.runMutation(internal.documentIngestion.progress, {
				jobId: args.jobId,
				status: 'complete'
			});
			return null;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Indexing failed';
			await ctx.runAction(internal.aiTelemetry.capture, {
				event: 'document_parsing_failed',
				distinctId: actor!.subject,
				properties: { document_id: document._id, latency_ms: Date.now() - startedAt }
			});
			await ctx.runMutation(internal.ragKnowledgeInternal.updateDocumentIngestion, {
				documentId: document._id,
				status: document.metadata?.ragEntryId ? 'indexed' : 'failed',
				ragNamespace: namespace,
				indexError: message,
				ingestionJobId: args.jobId
			});
			throw error;
		}
	}
});

async function loadR2TextArtifact(key: string) {
	const signedUrl = await r2.getUrl(key, { expiresIn: 60 * 5 });
	const response = await fetch(signedUrl);
	if (!response.ok) {
		throw new Error(`Could not load extracted artifact (${response.status})`);
	}
	return response.text();
}

async function loadOcrDeckPreviewPages(jsonKey?: string): Promise<DeckPreviewPage[]> {
	if (!jsonKey) return [];
	try {
		const text = await loadR2TextArtifact(jsonKey);
		const ocr = JSON.parse(text) as LegacyOcrResponse;
		return (ocr.pages ?? []).map((page, index) => {
			const pageNumber = normalizePageNumber(page, index);
			const markdown = (page.markdown ?? '').trim();
			return {
				pageNumber,
				heading: firstMarkdownHeading(markdown, `Page ${pageNumber}`),
				imageCount: page.images?.length ?? 0,
				tableCount: page.tables?.length ?? 0
			};
		});
	} catch {
		return [];
	}
}

export const previewR2DocumentPageRange = action({
	args: {
		documentId: v.id('contentLib'),
		startPage: v.number(),
		endPage: v.number()
	},
	handler: async (
		ctx,
		args
	): Promise<{
		documentId: Id<'contentLib'>;
		startPage: number;
		endPage: number;
		text: string;
		pages: Array<{ pageNumber: number; text: string }>;
		truncated: boolean;
	}> => {
		const document = await ctx.runQuery(internal.ragKnowledgeInternal.getDocumentForRagIngestion, {
			documentId: args.documentId
		});
		if (!document) throw new Error('Document not found');
		await assertDocumentAccess(ctx, document);

		const startPage = Math.max(1, Math.floor(args.startPage));
		const endPage = Math.max(startPage, Math.floor(args.endPage));
		const markdownKey = document.metadata?.extractionArtifactKeys?.find((key: string) =>
			key.endsWith('.md')
		);
		if (!markdownKey) {
			throw new Error('No extracted markdown preview is available for this document');
		}

		const signedUrl = await r2.getUrl(markdownKey, { expiresIn: 60 * 5 });
		const response = await fetch(signedUrl);
		if (!response.ok) {
			throw new Error(`Could not load extracted markdown preview (${response.status})`);
		}

		const markdown = cleanSourceMarkdown(await response.text());
		const pages = parseStoredMarkdownPages(markdown)
			.filter((page) => page.pageNumber >= startPage && page.pageNumber <= endPage)
			.map((page) => ({
				pageNumber: page.pageNumber,
				text: page.text.slice(0, 1800)
			}));

		const combined = pages
			.map((page) => `Page ${page.pageNumber}\n\n${page.text}`)
			.join('\n\n---\n\n');
		const maxChars = 5200;

		return {
			documentId: args.documentId,
			startPage,
			endPage,
			text: combined.slice(0, maxChars),
			pages,
			truncated: combined.length > maxChars || pages.some((page) => page.text.length >= 1800)
		};
	}
});

export const getR2DocumentMarkdownPreview = action({
	args: {
		documentId: v.id('contentLib')
	},
	handler: async (
		ctx,
		args
	): Promise<{
		documentId: Id<'contentLib'>;
		text: string;
		truncated: boolean;
		pageCount?: number;
	}> => {
		const document = await ctx.runQuery(internal.ragKnowledgeInternal.getDocumentForRagIngestion, {
			documentId: args.documentId
		});
		if (!document) throw new Error('Document not found');
		await assertDocumentAccess(ctx, document);

		const markdownKey = document.metadata?.extractionArtifactKeys?.find((key: string) =>
			key.endsWith('.md')
		);
		if (!markdownKey) {
			throw new Error('No extracted markdown is available for this document yet');
		}

		const signedUrl = await r2.getUrl(markdownKey, { expiresIn: 60 * 5 });
		const response = await fetch(signedUrl);
		if (!response.ok) {
			throw new Error(`Could not load extracted markdown (${response.status})`);
		}

		const markdown = cleanSourceMarkdown(await response.text());
		const maxChars = 180_000;
		return {
			documentId: args.documentId,
			text: markdown.slice(0, maxChars),
			truncated: markdown.length > maxChars,
			pageCount: document.metadata?.pageCount
		};
	}
});

export const getR2DocumentDeckPreview = action({
	args: {
		documentId: v.id('contentLib')
	},
	handler: async (
		ctx,
		args
	): Promise<{
		documentId: Id<'contentLib'>;
		text: string;
		truncated: boolean;
		pageCount?: number;
		pages: DeckPreviewPage[];
	}> => {
		const document = await ctx.runQuery(internal.ragKnowledgeInternal.getDocumentForRagIngestion, {
			documentId: args.documentId
		});
		if (!document) throw new Error('Document not found');
		await assertDocumentAccess(ctx, document);

		const artifactKeys = document.metadata?.extractionArtifactKeys ?? [];
		const markdownKey = artifactKeys.find((key: string) => key.endsWith('.md'));
		if (!markdownKey) {
			throw new Error('No extracted markdown is available for this document yet');
		}

		const jsonKey = artifactKeys.find((key: string) => key.endsWith('.json'));
		const [markdown, pages] = await Promise.all([
			loadR2TextArtifact(markdownKey),
			loadOcrDeckPreviewPages(jsonKey)
		]);
		const maxChars = 180_000;
		const topicTitleByPage = new Map<number, string>();
		for (const topic of document.metadata?.topics ?? []) {
			for (const pageNumber of topic.pageNumbers) {
				if (!topicTitleByPage.has(pageNumber) && !/^Page \d+$/i.test(topic.title)) {
					topicTitleByPage.set(pageNumber, topic.title);
				}
			}
		}

		return {
			documentId: args.documentId,
			text: cleanSourceMarkdown(markdown).slice(0, maxChars),
			truncated: markdown.length > maxChars,
			pageCount: document.metadata?.pageCount,
			pages: pages.map((page) => ({
				...page,
				heading:
					page.heading && !/^Page \d+$/i.test(page.heading)
						? page.heading
						: (topicTitleByPage.get(page.pageNumber) ?? page.heading)
			}))
		};
	}
});

export const clearR2DocumentIndexes = action({
	args: {
		documentIds: v.optional(v.array(v.id('contentLib')))
	},
	handler: async (
		ctx,
		{ documentIds }
	): Promise<{
		clearedCount: number;
		cleared: Array<{ documentId: Id<'contentLib'>; title: string }>;
	}> => {
		const documents: Array<Doc<'contentLib'> | null> = documentIds
			? await Promise.all(
					documentIds.map((documentId) =>
						ctx.runQuery(internal.ragKnowledgeInternal.getDocumentForRagIngestion, {
							documentId
						})
					)
				)
			: await ctx.runQuery(internal.ragKnowledgeInternal.getIndexedR2Documents);

		const cleared = [];
		for (const document of documents) {
			if (!document || document.deletedAt) continue;
			await assertDocumentAccess(ctx, document);

			const metadata = document.metadata ?? {};
			const artifactKeys = metadata.extractionArtifactKeys ?? [];
			if (
				metadata.storageProvider !== 'r2' ||
				(!metadata.ragEntryId && artifactKeys.length === 0)
			) {
				continue;
			}

			if (metadata.ragEntryId) {
				await documentRag.delete(ctx, { entryId: metadata.ragEntryId as EntryId });
			}
			for (const artifactKey of artifactKeys) {
				await r2.deleteObject(ctx, artifactKey);
			}
			await ctx.runMutation(internal.ragKnowledgeInternal.clearDocumentIngestion, {
				documentId: document._id
			});

			cleared.push({ documentId: document._id, title: document.title });
		}

		return { clearedCount: cleared.length, cleared };
	}
});

export const deleteR2DocumentCompletely = action({
	args: {
		documentId: v.id('contentLib')
	},
	handler: async (ctx, args): Promise<{ deleted: true; documentId: Id<'contentLib'> }> => {
		const document = await ctx.runQuery(internal.ragKnowledgeInternal.getDocumentForRagIngestion, {
			documentId: args.documentId
		});
		if (!document) throw new Error('Document not found');
		await assertDocumentAccess(ctx, document);

		const metadata = document.metadata ?? {};
		if (metadata.storageProvider !== 'r2') {
			throw new Error('Only R2-backed documents can be fully deleted from this flow.');
		}

		if (metadata.ragEntryId) {
			await documentRag.delete(ctx, { entryId: metadata.ragEntryId as EntryId });
		}

		for (const artifactKey of metadata.extractionArtifactKeys ?? []) {
			await r2.deleteObject(ctx, artifactKey);
		}

		if (metadata.r2Key) {
			await r2.deleteObject(ctx, metadata.r2Key);
		}
		await ctx.runMutation(internal.ragKnowledgeInternal.markDocumentDeleted, {
			documentId: document._id
		});

		return { deleted: true, documentId: document._id };
	}
});

export const askCohort = action({
	args: {
		cohortId: v.id('cohort'),
		prompt: v.string(),
		sourceDocumentId: v.optional(v.id('contentLib')),
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		assertOpenRouterKey();
		if (!args.sourceDocumentId) {
			throw new Error('Select an indexed or mapped R2 document before asking the RAG tester.');
		}
		const document = await ctx.runQuery(internal.ragKnowledgeInternal.getDocumentForRagIngestion, {
			documentId: args.sourceDocumentId
		});
		if (!document) throw new Error('Document not found');
		if (!document.metadata?.ragEntryId) {
			throw new Error('This document has not been indexed for AI yet.');
		}
		await assertDocumentAccess(ctx, document);

		const limit = Math.min(Math.max(args.limit ?? 8, 1), 20);
		const chatModel = RAG_TESTER_CHAT_MODEL;
		const namespace = documentNamespace(String(args.sourceDocumentId));

		const result = await documentRag.generateText(ctx, {
			search: {
				namespace,
				query: args.prompt,
				limit,
				chunkContext: { before: 1, after: 1 },
				searchType: 'hybrid'
			},
			model: openRouter().chat(chatModel),
			system:
				'You are a concise study assistant for LearnTerms curators. Answer only from the retrieved cohort knowledge. If the context does not contain the answer, say that the cohort knowledge base does not include enough information yet.',
			prompt: args.prompt
		});

		return {
			answer: result.text,
			context: result.context,
			usage: result.usage,
			diagnostics: {
				model: chatModel,
				embeddingModel: EMBEDDING_MODEL,
				namespace,
				source: 'r2Document',
				sourceDocumentId: String(args.sourceDocumentId),
				search: {
					limit,
					searchType: 'hybrid',
					chunkContext: { before: 1, after: 1 },
					filters: []
				},
				retrievedGroupCount: result.context.results.length,
				entryCount: result.context.entries.length,
				contextTextLength: result.context.text.length
			}
		};
	}
});
