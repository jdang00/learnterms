import type { RequestHandler } from '@sveltejs/kit';
import { GEMINI_API_KEY } from '$env/static/private';

type Chunk = {
	title: string;
	summary: string;
	content: string;
	keywords: string[];
	chunk_type: 'paragraph' | 'slide_group' | 'diagram' | 'table' | 'list';
};

const MODEL = 'gemini-3-flash-preview';
const TEMPERATURE = 1.0;
const MAX_TOKENS_PDF = 12288;

type GType = { ARRAY: unknown; OBJECT: unknown; STRING: unknown } & Record<string, unknown>;

function chunkArraySchema(Type: GType) {
	return {
		type: (Type as unknown as { ARRAY: unknown }).ARRAY,
		items: {
			type: (Type as unknown as { OBJECT: unknown }).OBJECT,
			properties: {
				title: { type: (Type as unknown as { STRING: unknown }).STRING },
				summary: { type: (Type as unknown as { STRING: unknown }).STRING },
				content: { type: (Type as unknown as { STRING: unknown }).STRING },
				keywords: {
					type: (Type as unknown as { ARRAY: unknown }).ARRAY,
					items: { type: (Type as unknown as { STRING: unknown }).STRING }
				},
				chunk_type: {
					type: (Type as unknown as { STRING: unknown }).STRING,
					enum: ['paragraph', 'slide_group', 'diagram', 'table', 'list']
				}
			},
			required: ['title', 'summary', 'content', 'keywords', 'chunk_type']
		}
	} as unknown;
}

function tableGuidelines() {
	return `For tables or table-like content:
- Use GitHub-flavored Markdown tables with a concise header row
- Split long tables across multiple chunks by rows (target 5–15 rows per chunk) while keeping the same columns
- Optionally group rows by a logical theme and create one chunk per group
- Prefer chunk_type = 'table' and include only that subset of rows in each chunk's content`;
}

function pdfPrompt() {
	return `Role: You are an expert document extraction assistant.

Goal: Extract the ACTUAL TEXT from this PDF and create 1 chunk per page (up to 100 chunks for 100 pages).

CRITICAL RULES - NO PARAPHRASING:
- Extract the EXACT text from the document - do NOT paraphrase, rewrite, or summarize the content
- Preserve the original wording, terminology, and phrasing from the source material
- Content field must contain the verbatim text from the page/section
- Create 1 chunk per page for lecture slides or similar documents
- For dense academic PDFs, create 1 chunk per substantial section/page
- SKIP pages with insufficient text (< 10 characters of actual content)

Document Types:
- Academic PDFs: extract verbatim paragraph content, preserve all technical terms
- Lecture slides: extract exact text from each slide, include image descriptions only when text is present
- ${tableGuidelines()}

VALIDATION REQUIREMENTS (CRITICAL):
1) Title: Must be 2-200 characters (e.g., "Page 5: Cell Division")
2) Summary: Must be 10-1000 characters - provide a meaningful 1-3 sentence overview
3) Content: Must be at least 10 characters of EXACT TEXT from the document
4) Keywords: Array of 3-5 key terms found in the actual text
5) chunk_type: Must be one of: paragraph, slide_group, diagram, table, or list

IMPORTANT: Only create chunks that meet ALL validation requirements. Skip pages with insufficient content.`;
}

async function fetchPdfAsBase64(url: string) {
	const res = await fetch(url);
	if (!res.ok) throw new Error('Failed to fetch PDF');
	const ct = res.headers.get('content-type') || '';
	if (!ct.includes('application/pdf')) throw new Error('File is not a PDF');
	const buf = await res.arrayBuffer();
	return Buffer.from(buf).toString('base64');
}

export const GET: RequestHandler = async ({ url }) => {
	const pdfUrl = url.searchParams.get('pdfUrl');
	const pdfBase64Param = url.searchParams.get('pdfBase64');

	if (!pdfUrl && !pdfBase64Param) {
		return new Response('Missing pdfUrl or pdfBase64 parameter', { status: 400 });
	}

	if (!GEMINI_API_KEY || GEMINI_API_KEY.trim().length === 0) {
		return new Response('GEMINI_API_KEY is not configured', { status: 500 });
	}

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			function emit(event: { type: string; [key: string]: unknown }) {
				const data = `data: ${JSON.stringify(event)}\n\n`;
				controller.enqueue(encoder.encode(data));
			}

			try {
				emit({ type: 'status', message: 'Fetching PDF...' });

				let pdfBase64: string;
				if (pdfBase64Param) {
					pdfBase64 = pdfBase64Param;
				} else if (pdfUrl) {
					pdfBase64 = await fetchPdfAsBase64(pdfUrl);
				} else {
					throw new Error('No PDF source provided');
				}

				emit({ type: 'status', message: 'Processing document with AI...' });

				const { GoogleGenAI, Type } = await import('@google/genai');
				const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

				const contents: Array<Record<string, unknown>> = [
					{ text: pdfPrompt() },
					{ inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }
				];

				emit({ type: 'status', message: 'Streaming response from AI...' });

				const result = await ai.models.generateContentStream({
					model: MODEL,
					contents,
					config: {
						temperature: TEMPERATURE,
						maxOutputTokens: MAX_TOKENS_PDF,
						thinkingConfig: { thinkingLevel: 'medium' },
						responseMimeType: 'application/json',
						responseSchema: chunkArraySchema(Type as unknown as GType)
					}
				});

				let buffer = '';
				let tokenCount = 0;

				for await (const chunk of result) {
					if (chunk.text) {
						buffer += chunk.text;
						tokenCount += chunk.text.length;

						// Emit progress update
						emit({
							type: 'progress',
							tokens: tokenCount,
							message: 'Generating chunks...'
						});
					}
				}

				emit({ type: 'status', message: 'Parsing response...' });

				// Parse the complete JSON response
				let chunks: Chunk[];
				try {
					chunks = JSON.parse(buffer.trim());
					if (!Array.isArray(chunks)) {
						throw new Error('Response is not an array');
					}
				} catch (parseError) {
					throw new Error(
						`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
					);
				}

				emit({ type: 'status', message: `Parsed ${chunks.length} chunks` });

				// Filter out invalid chunks based on validation requirements in chunkContent.ts
				const validChunks = chunks.filter((chunk) => {
					const trimmedContent = chunk.content?.trim() || '';
					const trimmedTitle = chunk.title?.trim() || '';
					const trimmedSummary = chunk.summary?.trim() || '';
					const trimmedChunkType = chunk.chunk_type?.trim() || '';

					// Must meet minimum validation requirements:
					// - Title: >= 2 chars, <= 200 chars
					// - Summary: >= 10 chars, <= 1000 chars
					// - Content: >= 10 chars
					// - chunk_type: must exist
					// - keywords: must be array
					return (
						trimmedContent.length >= 10 &&
						trimmedTitle.length >= 2 &&
						trimmedTitle.length <= 200 &&
						trimmedSummary.length >= 10 &&
						trimmedSummary.length <= 1000 &&
						trimmedChunkType.length > 0 &&
						Array.isArray(chunk.keywords)
					);
				});

				const skippedCount = chunks.length - validChunks.length;
				if (skippedCount > 0) {
					emit({
						type: 'status',
						message: `Filtered ${skippedCount} invalid chunks, ${validChunks.length} valid chunks remaining`
					});
				}

				// Stream each valid chunk to the client
				for (let i = 0; i < validChunks.length; i++) {
					const chunk = validChunks[i];
					emit({
						type: 'chunk',
						data: chunk,
						index: i,
						total: validChunks.length
					});

					// Small delay to ensure UI updates smoothly
					if (i % 10 === 0) {
						await new Promise((resolve) => setTimeout(resolve, 10));
					}
				}

				// Send completion event
				emit({
					type: 'complete',
					totalChunks: validChunks.length,
					message: `Successfully processed ${validChunks.length} chunks${skippedCount > 0 ? ` (${skippedCount} invalid chunks skipped)` : ''}`
				});
			} catch (error) {
				emit({
					type: 'error',
					message: error instanceof Error ? error.message : 'Unknown error occurred',
					error: String(error)
				});
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
