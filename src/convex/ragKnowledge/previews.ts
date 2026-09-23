'use node';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { action } from '../_generated/server';

import { cleanSourceMarkdown } from '../documentParsing';
import { r2 } from '../r2Documents';
import {
	assertDocumentAccess,
	type DeckPreviewPage,
	loadR2TextArtifact,
	loadOcrDeckPreviewPages
} from './shared';
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
