import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

interface ProcessedChunk {
	title: string;
	summary: string;
	content: string;
	keywords: string[];
	chunk_type: string;
}

export const getChunkByDocumentId = query({
	args: {
		documentId: v.id('contentLib')
	},
	handler: async (ctx, args) => {
		const contentLib = await ctx.db
			.query('chunkContent')
			.filter((q) => q.eq(q.field('documentId'), args.documentId))
			.filter((q) => q.eq(q.field('deletedAt'), undefined))
			.collect();
		return contentLib;
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
		const trimmedTitle = args.title.trim();
		const trimmedSummary = args.summary.trim();
		const trimmedContent = args.content.trim();
		const trimmedChunkType = args.chunk_type.trim();

		if (!trimmedTitle) {
			throw new Error('Chunk title is required and cannot be empty');
		}
		if (!trimmedSummary) {
			throw new Error('Chunk summary is required and cannot be empty');
		}
		if (!trimmedContent) {
			throw new Error('Chunk content is required and cannot be empty');
		}
		if (!trimmedChunkType) {
			throw new Error('Chunk type is required and cannot be empty');
		}

		if (trimmedTitle.length < 2) {
			throw new Error('Chunk title must be at least 2 characters long');
		}
		if (trimmedTitle.length > 200) {
			throw new Error('Chunk title cannot exceed 200 characters');
		}
		if (trimmedSummary.length < 10) {
			throw new Error('Chunk summary must be at least 10 characters long');
		}
		if (trimmedSummary.length > 1000) {
			throw new Error('Chunk summary cannot exceed 1000 characters');
		}
		if (trimmedContent.length < 10) {
			throw new Error('Chunk content must be at least 10 characters long');
		}

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

		const trimmedTitle = args.title.trim();
		const trimmedSummary = args.summary.trim();
		const trimmedContent = args.content.trim();
		const trimmedChunkType = args.chunk_type.trim();

		if (!trimmedTitle) {
			throw new Error('Chunk title is required and cannot be empty');
		}
		if (!trimmedSummary) {
			throw new Error('Chunk summary is required and cannot be empty');
		}
		if (!trimmedContent) {
			throw new Error('Chunk content is required and cannot be empty');
		}
		if (!trimmedChunkType) {
			throw new Error('Chunk type is required and cannot be empty');
		}

		if (trimmedTitle.length < 2) {
			throw new Error('Chunk title must be at least 2 characters long');
		}
		if (trimmedTitle.length > 200) {
			throw new Error('Chunk title cannot exceed 200 characters');
		}
		if (trimmedSummary.length < 10) {
			throw new Error('Chunk summary must be at least 10 characters long');
		}
		if (trimmedSummary.length > 1000) {
			throw new Error('Chunk summary cannot exceed 1000 characters');
		}
		if (trimmedContent.length < 10) {
			throw new Error('Chunk content must be at least 10 characters long');
		}

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
			const response = await fetch('/api/processdoc', {
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
		chunks: v.array(v.object({
			title: v.string(),
			summary: v.string(),
			content: v.string(),
			keywords: v.array(v.string()),
			chunk_type: v.string()
		}))
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
				const trimmedTitle = chunk.title.trim();
				const trimmedSummary = chunk.summary.trim();
				const trimmedContent = chunk.content.trim();
				const trimmedChunkType = chunk.chunk_type.trim();

				if (!trimmedTitle || !trimmedSummary || !trimmedContent || !trimmedChunkType) {
					errors.push(`Chunk "${trimmedTitle || 'Unknown'}" has missing required fields`);
					continue;
				}

				const chunkId = await ctx.db.insert('chunkContent', {
					title: trimmedTitle,
					summary: trimmedSummary,
					content: trimmedContent,
					keywords: chunk.keywords,
					chunk_type: trimmedChunkType,
					documentId: args.documentId,
					metadata: {},
					updatedAt: Date.now()
				});

				insertedChunks.push({ chunkId, title: trimmedTitle });
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
				const response = await fetch('/api/processdoc', {
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
