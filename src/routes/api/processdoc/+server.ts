import { json, type RequestHandler } from '@sveltejs/kit';
import { GEMINI_API_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { UTApi } from 'uploadthing/server';

// Minimal types to avoid 'any'
type GType = { ARRAY: unknown; OBJECT: unknown; STRING: unknown } & Record<string, unknown>;

type Chunk = {
	title: string;
	summary: string;
	content: string;
	keywords: string[];
	chunk_type: 'paragraph' | 'slide_group' | 'diagram' | 'table' | 'list';
};

const MODEL = 'gemini-3-flash-preview';
const TEMPERATURE = 1.0;
const MAX_TOKENS_TEXT = 8192;
const MAX_TOKENS_PDF = 12288;

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

function textPrompt(material: string) {
	return `You are extracting educational content into logical, study-friendly chunks.

CHUNKING STRATEGY:
- Tables (CSV/TSV/Markdown): One chunk per row, chunk_type = 'table', use Markdown format
- Dense text: One chunk per major section/topic (200-800 words target)
- Lists: Group related items together

FOR EACH CHUNK:
- title: Descriptive title for the topic
- summary: 1-2 sentences explaining the content
- content: VERBATIM text - preserve exact wording and terminology
- keywords: 3-5 searchable terms
- chunk_type: "paragraph" | "table" | "list"

CRITICAL: Never paraphrase. Extract text exactly as written.

Produce 5-15 chunks unless the input requires fewer.

Material:
${material}`;
}

async function callModel(contents: Array<Record<string, unknown>>, maxTokens: number) {
	const { GoogleGenAI, Type, ThinkingLevel } = await import('@google/genai');
	if (!GEMINI_API_KEY || GEMINI_API_KEY.trim().length === 0) {
		throw new Error('GEMINI_API_KEY is not configured');
	}
	const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

	for (let attempt = 1; attempt <= 2; attempt++) {
		const result = await ai.models.generateContent({
			model: MODEL,
			contents,
			config: {
				temperature: TEMPERATURE,
				maxOutputTokens: maxTokens,
				thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
				responseMimeType: 'application/json',
				responseSchema: chunkArraySchema(Type as unknown as GType)
			}
		});

		const responseText = result.text;
		if (!responseText) throw new Error('Missing model text output');
		try {
			return JSON.parse(responseText.trim()) as Chunk[];
		} catch {
			if (attempt === 2) throw new Error('Model returned invalid JSON after retries');
			await new Promise((r) => setTimeout(r, 250));
		}
	}
	throw new Error('Unexpected error');
}

async function generateFromPdfBase64(pdfBase64: string) {
	const contents: Array<Record<string, unknown>> = [
		{ text: pdfPrompt() },
		{ inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }
	];
	return callModel(contents, MAX_TOKENS_PDF);
}

async function generateFromText(material: string) {
	const contents: Array<Record<string, unknown>> = [
		{ role: 'user', parts: [{ text: textPrompt(material) }] }
	];
	return callModel(contents, MAX_TOKENS_TEXT);
}

async function fetchPdfAsBase64(url: string) {
	const res = await fetch(url);
	if (!res.ok) throw new Error('Failed to fetch PDF');
	const ct = res.headers.get('content-type') || '';
	if (!ct.includes('application/pdf')) throw new Error('File is not a PDF');
	const buf = await res.arrayBuffer();
	return Buffer.from(buf).toString('base64');
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const contentType = request.headers.get('content-type') || '';

		if (contentType.includes('multipart/form-data')) {
			const form = await request.formData();
			const file = form.get('pdf') as File | null;
			if (!file) return json({ error: 'No PDF file provided' }, { status: 400 });
			if (file.type !== 'application/pdf')
				return json({ error: 'File must be a PDF' }, { status: 400 });
			const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
			const chunks = await generateFromPdfBase64(base64);
			return json({ success: true, chunks, processedCount: chunks.length });
		}

		if (contentType.includes('application/json')) {
			const body = (await request.json()) as {
				material?: string;
				pdfUrl?: string;
				fileKey?: string;
			};

			if (typeof body.material === 'string') {
				const chunks = await generateFromText(body.material);
				return json({ success: true, chunks, processedCount: chunks.length });
			}

			if (typeof body.pdfUrl === 'string' || (body.fileKey && !body.pdfUrl)) {
				let chunks: Chunk[] = [];
				if (typeof body.pdfUrl === 'string') {
					const base64 = await fetchPdfAsBase64(body.pdfUrl);
					chunks = await generateFromPdfBase64(base64);
				}

				if (body.fileKey) {
					try {
						const utapi = new UTApi({ token: env.UPLOADTHING_TOKEN });
						await utapi.deleteFiles(body.fileKey);
					} catch (e) {
						console.error('UploadThing delete failed', e);
					}
				}

				return json({ success: true, chunks, processedCount: chunks.length });
			}

			return json({ error: "Missing 'material' or 'pdfUrl'" }, { status: 400 });
		}

		return json({ error: 'Unsupported content type' }, { status: 400 });
	} catch (error) {
		console.error('processdoc error', error);
		return json({ error: (error as Error).message }, { status: 500 });
	}
};
