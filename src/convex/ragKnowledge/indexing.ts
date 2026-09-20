'use node';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { action, internalAction } from '../_generated/server';

import type { OcrDocument } from '../documentParsing';
import { MAX_PDF_BYTES, parseOcrPages, PARSER_VERSION } from '../documentParsing';
import { r2 } from '../r2Documents';
import {
	OCR_MODEL,
	MAX_INDEX_PAGES,
	assertOpenRouterKey,
	assertDatalabKey,
	documentRag,
	documentNamespace,
	sha256Hex,
	definedMetadata,
	assertDocumentAccess,
	normalizePageNumber,
	firstMarkdownHeading,
	splitPageMarkdown,
	documentIndexArtifactKey,
	loadR2TextArtifact
} from './shared';
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
