'use node';

import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

const MODEL = 'gemini-3-flash-preview';
const TEMPERATURE = 1.0;
const MAX_TOKENS_PDF = 12288;
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

type Chunk = {
	title: string;
	summary: string;
	content: string;
	keywords: string[];
	chunk_type: 'paragraph' | 'slide_group' | 'diagram' | 'table' | 'list';
};

export const cleanupUploadthingFile = internalAction({
	args: {},
	handler: async (_, args: { fileKey: string }) => {
		try {
			const { UTApi } = await import('uploadthing/server');
			const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });
			await utapi.deleteFiles(args.fileKey);
		} catch (e) {
			console.error('UploadThing cleanup failed:', e);
		}
	}
});

export const processNextJob = internalAction({
	args: {},
	handler: async (ctx) => {
		const pendingJob = await ctx.runQuery(internal.pdfJobs.getNextPendingJob, {});
		if (!pendingJob) return { processed: false, reason: 'No pending jobs' };

		await ctx.runMutation(internal.pdfJobs.markJobProcessing, { jobId: pendingJob._id });

		try {
			const chunks = await processWithRetry(
				ctx,
				pendingJob._id,
				pendingJob.pdfUrl,
				pendingJob.retryCount
			);

			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i];
				await ctx.runMutation(internal.pdfJobs.insertChunk, {
					documentId: pendingJob.documentId,
					title: chunk.title,
					summary: chunk.summary,
					content: chunk.content,
					keywords: chunk.keywords,
					chunk_type: chunk.chunk_type
				});

				await ctx.runMutation(internal.pdfJobs.updateJobProgress, {
					jobId: pendingJob._id,
					chunksProcessed: i + 1,
					totalChunks: chunks.length,
					currentStep: `Saved chunk ${i + 1} of ${chunks.length}`
				});
			}

			await ctx.runMutation(internal.pdfJobs.markJobCompleted, {
				jobId: pendingJob._id,
				chunksCount: chunks.length
			});

			if (pendingJob.fileKey) {
				try {
					const { UTApi } = await import('uploadthing/server');
					const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });
					await utapi.deleteFiles(pendingJob.fileKey);
				} catch (e) {
					console.error('UploadThing cleanup failed:', e);
				}
			}

			await ctx.scheduler.runAfter(100, internal.pdfJobsAction.processNextJob, {});
			return { processed: true, chunksCount: chunks.length };
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			await ctx.runMutation(internal.pdfJobs.markJobFailed, {
				jobId: pendingJob._id,
				error: errorMsg
			});
			await ctx.scheduler.runAfter(100, internal.pdfJobsAction.processNextJob, {});
			return { processed: false, error: errorMsg };
		}
	}
});

function pdfPrompt() {
	return `You are extracting educational content from a PDF into logical, study-friendly chunks.

CHUNKING STRATEGY - Adapt to the document type:
- Lecture slides: Group 1-3 related slides per chunk (don't split a concept across chunks)
- Dense text/paragraphs: One chunk per major section or topic (aim for 200-800 words per chunk)
- Mixed pages: Split by logical topic boundaries, not page breaks
- Tables: Keep tables intact; split only if exceeds 15 rows
- Lists/bullet points: Group related items together

OUTPUT: JSON array of chunks, ordered as they appear in the document.

FOR EACH CHUNK:
- title: Descriptive title capturing the main topic (e.g., "Mitosis Phases Overview")
- summary: 1-2 sentences explaining what this chunk teaches
- content: VERBATIM text extraction - preserve exact wording, formatting, and terminology
- keywords: 3-5 searchable terms from the content
- chunk_type: "paragraph" | "slide_group" | "table" | "list" | "diagram"

CRITICAL RULES:
- NEVER paraphrase or rewrite - extract text exactly as written
- Preserve technical terms, formulas, and specialized vocabulary
- Keep related concepts together (don't orphan a definition from its explanation)
- Skip pages/sections with less than 10 characters of meaningful text
- For tables: use Markdown format with | separators
- Include diagram/figure captions when present

The goal is creating chunks that make sense as standalone study units while preserving the source material exactly.`;
}

async function fetchPdfAsBase64(url: string): Promise<string> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);
	const ct = res.headers.get('content-type') || '';
	if (!ct.includes('application/pdf')) throw new Error('File is not a PDF');
	const buf = await res.arrayBuffer();
	return Buffer.from(buf).toString('base64');
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processWithRetry(
	ctx: any,
	jobId: Id<'pdfProcessingJobs'>,
	pdfUrl: string,
	initialRetryCount: number
): Promise<Chunk[]> {
	const { GoogleGenAI, Type, ThinkingLevel } = await import('@google/genai');
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

	const ai = new GoogleGenAI({ apiKey });

	await ctx.runMutation(internal.pdfJobs.updateJobProgress, {
		jobId,
		chunksProcessed: 0,
		currentStep: 'Fetching PDF...'
	});

	const pdfBase64 = await fetchPdfAsBase64(pdfUrl);

	const chunkArraySchema = {
		type: Type.ARRAY,
		items: {
			type: Type.OBJECT,
			properties: {
				title: { type: Type.STRING },
				summary: { type: Type.STRING },
				content: { type: Type.STRING },
				keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
				chunk_type: {
					type: Type.STRING,
					enum: ['paragraph', 'slide_group', 'diagram', 'table', 'list']
				}
			},
			required: ['title', 'summary', 'content', 'keywords', 'chunk_type']
		}
	};

	let lastError: Error | null = null;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			await ctx.runMutation(internal.pdfJobs.updateJobProgress, {
				jobId,
				chunksProcessed: 0,
				currentStep: attempt > 0 ? `Retrying (${attempt + 1}/${MAX_RETRIES})...` : 'Processing PDF with AI...'
			});

			const result = await ai.models.generateContent({
				model: MODEL,
				contents: [
					{ text: pdfPrompt() },
					{ inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }
				],
				config: {
					temperature: TEMPERATURE,
					maxOutputTokens: MAX_TOKENS_PDF,
					thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
					responseMimeType: 'application/json',
					responseSchema: chunkArraySchema as any
				}
			});

			const responseText = result.text;
			if (!responseText) throw new Error('Empty response from AI model');

			const chunks = JSON.parse(responseText.trim()) as Chunk[];
			if (!Array.isArray(chunks) || chunks.length === 0) {
				throw new Error('No chunks returned from AI model');
			}

			return chunks;
		} catch (error: any) {
			lastError = error instanceof Error ? error : new Error(String(error));
			const isRateLimit =
				error?.status === 429 ||
				error?.message?.includes('429') ||
				error?.message?.includes('RESOURCE_EXHAUSTED');
			const isRetryable = isRateLimit || error?.status >= 500;

			if (isRetryable && attempt < MAX_RETRIES - 1) {
				const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 32000);
				const jitter = delay * 0.2 * (Math.random() - 0.5);
				const waitTime = Math.round(delay + jitter);

				await ctx.runMutation(internal.pdfJobs.updateJobProgress, {
					jobId,
					chunksProcessed: 0,
					currentStep: `Rate limited. Waiting ${Math.round(waitTime / 1000)}s...`
				});

				await sleep(waitTime);
				continue;
			}

			throw lastError;
		}
	}

	throw lastError || new Error('Max retries exceeded');
}
