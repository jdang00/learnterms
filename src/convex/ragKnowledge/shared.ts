'use node';

import { createOpenAI } from '@ai-sdk/openai';
import { RAG } from '@convex-dev/rag';

import { components, internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import type { ActionCtx } from '../_generated/server';

import { DATALAB_MODEL } from '../datalab';

import { MAX_PDF_PAGES } from '../documentParsing';
import { assertDocumentPermission } from '../questionStudio/access';
import { DEFAULT_TEXT_MODEL } from '../questionStudio/shared';
import { r2 } from '../r2Documents';

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

export const EMBEDDING_MODEL = 'openai/text-embedding-3-large';
export const EMBEDDING_DIMENSION = 3072;
export const RAG_TESTER_CHAT_MODEL = DEFAULT_TEXT_MODEL;
export const OCR_MODEL = DATALAB_MODEL;
export const MAX_INDEX_PAGES = MAX_PDF_PAGES;

export function openRouter() {
	return createOpenAI({
		name: 'openrouter',
		baseURL: 'https://openrouter.ai/api/v1',
		apiKey: process.env.OPENROUTER_API_KEY ?? 'missing-openrouter-api-key',
		headers: {
			'X-OpenRouter-Title': 'LearnTerms'
		}
	});
}

export function assertOpenRouterKey() {
	if (!process.env.OPENROUTER_API_KEY) {
		throw new Error('OPENROUTER_API_KEY is not configured');
	}
}

export function assertDatalabKey() {
	if (!process.env.DATALAB_API_KEY) {
		throw new Error('DATALAB_API_KEY is not configured');
	}
}

export const documentRag = new RAG<DocumentRagFilters, DocumentRagMetadata>(components.rag, {
	textEmbeddingModel: openRouter().embedding(EMBEDDING_MODEL),
	embeddingDimension: EMBEDDING_DIMENSION,
	filterNames: ['sourceType', 'sourceDocumentId', 'pageNumber', 'chunkType']
});

export function documentNamespace(documentId: string) {
	return `document:${documentId}`;
}

export async function sha256Hex(input: string): Promise<string> {
	const bytes = new TextEncoder().encode(input);
	const hash = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function definedMetadata<T extends Record<string, unknown>>(input: T): T {
	return Object.fromEntries(
		Object.entries(input).filter(([, value]) => value !== undefined && value !== null)
	) as T;
}

export async function assertCohortAccess(ctx: ActionCtx, cohortId: Id<'cohort'>) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error('Unauthorized');

	const user = await ctx.runQuery(internal.ragKnowledgeInternal.getUserForRagAccess, {
		clerkUserId: identity.subject
	});
	if (!user) throw new Error('User not found');

	assertDocumentPermission(user, cohortId, true);

	return user;
}

export async function assertDocumentAccess(ctx: ActionCtx, document: Doc<'contentLib'>) {
	await assertCohortAccess(ctx, document.cohortId);
}

export type LegacyOcrPage = {
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

export type LegacyOcrResponse = {
	pages?: LegacyOcrPage[];
	model?: string;
	usage_info?: Record<string, unknown>;
};

export type DeckPreviewPage = {
	pageNumber: number;
	heading?: string;
	imageCount: number;
	tableCount: number;
};

export function normalizePageNumber(page: LegacyOcrPage, fallbackIndex: number) {
	if (typeof page.index === 'number') return page.index + 1;
	return fallbackIndex + 1;
}

export function firstMarkdownHeading(markdown: string, fallback: string) {
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

export function splitPageMarkdown(markdown: string, maxChars = 2800) {
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

export function documentIndexArtifactKey(args: {
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

export async function loadR2TextArtifact(key: string) {
	const signedUrl = await r2.getUrl(key, { expiresIn: 60 * 5 });
	const response = await fetch(signedUrl);
	if (!response.ok) {
		throw new Error(`Could not load extracted artifact (${response.status})`);
	}
	return response.text();
}

export async function loadOcrDeckPreviewPages(jsonKey?: string): Promise<DeckPreviewPage[]> {
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
