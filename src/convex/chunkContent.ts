import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { authQuery } from './authQueries';

const APP_BASE_URL = process.env.APP_BASE_URL;

interface ProcessedChunk {
	title: string;
	summary: string;
	content: string;
	keywords: string[];
	chunk_type: string;
}

type ChunkFieldInput = {
	title: string;
	summary: string;
	content: string;
	chunk_type: string;
};

function validateAndTrimChunkFields(input: ChunkFieldInput): ChunkFieldInput {
	const title = input.title.trim();
	const summary = input.summary.trim();
	const content = input.content.trim();
	const chunk_type = input.chunk_type.trim();

	if (!title) {
		throw new Error('Chunk title is required and cannot be empty');
	}
	if (!summary) {
		throw new Error('Chunk summary is required and cannot be empty');
	}
	if (!content) {
		throw new Error('Chunk content is required and cannot be empty');
	}
	if (!chunk_type) {
		throw new Error('Chunk type is required and cannot be empty');
	}

	if (title.length < 2) {
		throw new Error('Chunk title must be at least 2 characters long');
	}
	if (title.length > 200) {
		throw new Error('Chunk title cannot exceed 200 characters');
	}
	if (summary.length < 10) {
		throw new Error('Chunk summary must be at least 10 characters long');
	}
	if (summary.length > 1000) {
		throw new Error('Chunk summary cannot exceed 1000 characters');
	}
	if (content.length < 10) {
		throw new Error('Chunk content must be at least 10 characters long');
	}

	return { title, summary, content, chunk_type };
}

export const getChunkByDocumentId = authQuery({
	args: {
		documentId: v.id('contentLib')
	},
	handler: async (ctx, args) => {
		const chunkContents = await ctx.db
			.query('chunkContent')
			.withIndex('by_documentId', (q) => q.eq('documentId', args.documentId))
			.filter((q) => q.eq(q.field('deletedAt'), undefined))
			.collect();
		return chunkContents;
	}
});

export const insertChunkContent = mutation({
	args: {
		title: v.string(),
		summary: v.string(),
		content: v.string(),
		keywords: v.array(v.string()),
		chunk_type: v.string(),
		documentId: v.id('contentLib'),
		metadata: v.optional(v.object({})),
		updatedAt: v.number()
	},
	handler: async (ctx, args) => {
		const {
			title: trimmedTitle,
			summary: trimmedSummary,
			content: trimmedContent,
			chunk_type: trimmedChunkType
		} = validateAndTrimChunkFields(args);

		const document = await ctx.db.get(args.documentId);
		if (!document) {
			throw new Error('Document does not exist');
		}

		const id = await ctx.db.insert('chunkContent', {
			...args,
			title: trimmedTitle,
			summary: trimmedSummary,
			content: trimmedContent,
			chunk_type: trimmedChunkType
		});
		return id;
	}
});

export const deleteChunkContent = mutation({
	args: {
		chunkId: v.id('chunkContent'),
		documentId: v.id('contentLib')
	},
	handler: async (ctx, args) => {
		const chunkToDelete = await ctx.db.get(args.chunkId);
		if (!chunkToDelete || chunkToDelete.documentId !== args.documentId) {
			throw new Error('Chunk not found or access denied');
		}

		await ctx.db.delete(args.chunkId);
		return { deleted: true };
	}
});

export const updateChunkContent = mutation({
	args: {
		chunkId: v.id('chunkContent'),
		documentId: v.id('contentLib'),
		title: v.string(),
		summary: v.string(),
		content: v.string(),
		keywords: v.array(v.string()),
		chunk_type: v.string(),
		metadata: v.optional(v.object({}))
	},
	handler: async (ctx, args) => {
		const chunkToUpdate = await ctx.db.get(args.chunkId);
		if (!chunkToUpdate || chunkToUpdate.documentId !== args.documentId) {
			throw new Error('Chunk not found or access denied');
		}

		const {
			title: trimmedTitle,
			summary: trimmedSummary,
			content: trimmedContent,
			chunk_type: trimmedChunkType
		} = validateAndTrimChunkFields(args);

		await ctx.db.patch(args.chunkId, {
			title: trimmedTitle,
			summary: trimmedSummary,
			content: trimmedContent,
			keywords: args.keywords,
			chunk_type: trimmedChunkType,
			metadata: args.metadata,
			updatedAt: Date.now()
		});

		return { updated: true };
	}
});

export const processDocumentAndCreateChunks = mutation({
	args: {
		documentId: v.id('contentLib'),
		material: v.string()
	},
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document) {
			throw new Error('Document not found');
		}

		try {
			if (!APP_BASE_URL) {
				throw new Error('APP_BASE_URL environment variable not set');
			}
			const processDocUrl = new URL('/api/processdoc', APP_BASE_URL).toString();

			const response = await fetch(processDocUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ material: args.material })
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`API call failed: ${response.status} - ${errorText}`);
			}

			const processedChunk: ProcessedChunk = await response.json();

			const chunkId = await ctx.db.insert('chunkContent', {
				title: processedChunk.title,
				summary: processedChunk.summary,
				content: processedChunk.content,
				keywords: processedChunk.keywords,
				chunk_type: processedChunk.chunk_type,
				documentId: args.documentId,
				metadata: {},
				updatedAt: Date.now()
			});

			return { success: true, chunkId, chunk: processedChunk };
		} catch (error) {
			console.error('Error processing document:', error);
			throw new Error(`Failed to process document: ${error}`);
		}
	}
});

export const bulkCreateChunks = mutation({
	args: {
		documentId: v.id('contentLib'),
		chunks: v.array(
			v.object({
				title: v.string(),
				summary: v.string(),
				content: v.string(),
				keywords: v.array(v.string()),
				chunk_type: v.string()
			})
		)
	},
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document) {
			throw new Error('Document not found');
		}

		const insertedChunks = [];
		const errors = [];

		for (const chunk of args.chunks) {
			try {
				const { title, summary, content, chunk_type } = validateAndTrimChunkFields(chunk);

				const chunkId = await ctx.db.insert('chunkContent', {
					title,
					summary,
					content,
					keywords: chunk.keywords,
					chunk_type,
					documentId: args.documentId,
					metadata: {},
					updatedAt: Date.now()
				});

				insertedChunks.push({ chunkId, title });
			} catch (error) {
				errors.push(`Failed to insert chunk "${chunk.title}": ${error}`);
			}
		}

		return {
			success: errors.length === 0,
			insertedCount: insertedChunks.length,
			insertedChunks,
			errors
		};
	}
});

export const processMultipleChunks = mutation({
	args: {
		documentId: v.id('contentLib'),
		materials: v.array(v.string())
	},
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document) {
			throw new Error('Document not found');
		}

		const processedChunks = [];
		const errors = [];

		for (const material of args.materials) {
			try {
				if (!APP_BASE_URL) {
					throw new Error('APP_BASE_URL environment variable not set');
				}
				const processDocUrl = new URL('/api/processdoc', APP_BASE_URL).toString();

				const response = await fetch(processDocUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ material })
				});

				if (!response.ok) {
					const errorText = await response.text();
					errors.push(`API call failed for chunk: ${response.status} - ${errorText}`);
					continue;
				}

				const processedChunk: ProcessedChunk = await response.json();

				const chunkId = await ctx.db.insert('chunkContent', {
					title: processedChunk.title,
					summary: processedChunk.summary,
					content: processedChunk.content,
					keywords: processedChunk.keywords,
					chunk_type: processedChunk.chunk_type,
					documentId: args.documentId,
					metadata: {},
					updatedAt: Date.now()
				});

				processedChunks.push({ chunkId, chunk: processedChunk });
			} catch (error) {
				errors.push(`Failed to process chunk: ${error}`);
			}
		}

		return {
			success: errors.length === 0,
			processedCount: processedChunks.length,
			processedChunks,
			errors
		};
	}
});

export const processPdfUrlAndCreateChunks = mutation({
	args: {
		documentId: v.id('contentLib'),
		pdfUrl: v.string(),
		fileKey: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document) {
			throw new Error('Document not found');
		}

		if (!APP_BASE_URL) {
			throw new Error('APP_BASE_URL environment variable not set');
		}

		const processDocUrl = new URL('/api/processdoc', APP_BASE_URL).toString();

		const response = await fetch(processDocUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ pdfUrl: args.pdfUrl, fileKey: args.fileKey })
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`API call failed: ${response.status} - ${errorText}`);
		}

		const result = (await response.json()) as { success?: boolean; chunks?: ProcessedChunk[] };
		if (!result.success || !Array.isArray(result.chunks)) {
			throw new Error('Failed to process PDF - no chunks returned');
		}

		const insertedIds: string[] = [];
		for (const chunk of result.chunks) {
			const { title, summary, content, chunk_type } = validateAndTrimChunkFields(chunk);
			const id = await ctx.db.insert('chunkContent', {
				title,
				summary,
				content,
				keywords: chunk.keywords,
				chunk_type,
				documentId: args.documentId,
				metadata: {},
				updatedAt: Date.now()
			});
			insertedIds.push(id);
		}

		return { success: true, processedCount: insertedIds.length, insertedIds };
	}
});
