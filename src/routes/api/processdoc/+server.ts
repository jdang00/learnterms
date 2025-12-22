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

const MODEL = 'gemini-2.0-flash';
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

Document Types:
- Academic PDFs: extract verbatim paragraph content, preserve all technical terms
- Lecture slides: extract exact text from each slide, include image descriptions only when text is present
- ${tableGuidelines()}

Instructions:
1) Create up to 100 chunks (approximately 1 per page)
2) Title: Brief identifier for the chunk (e.g., "Page 5: Cell Division")
3) Summary: 1-2 sentence overview of what the chunk covers
4) Content: EXACT TEXT extracted from the document - NO paraphrasing or rewriting
5) Keywords: 3-5 key terms found in the actual text
6) chunk_type: paragraph, slide_group, diagram, table, or list`;
}

function textPrompt(material: string) {
	return `Role: You are an expert document extraction assistant.

Goal: Extract and chunk the provided text - NO PARAPHRASING.

CRITICAL RULES - NO PARAPHRASING:
- Extract the EXACT text from the material - do NOT paraphrase, rewrite, or summarize
- Preserve original wording, terminology, and phrasing
- Content field must contain verbatim text from the source

Rules:
- If the material is ONLY a table (CSV/TSV/Markdown table with header and rows), return ONE CHUNK PER ROW.
  • Each chunk should be chunk_type = 'table' and its content must be a one-row Markdown table using the same columns.
- Otherwise, follow normal chunking and ${tableGuidelines()}.
- Produce 5-15 chunks unless the input clearly requires fewer.
- Each chunk's content must be EXACT text from the material

Return ONLY the JSON array, no extra text.

Material:
${material}`;
}

async function callModel(contents: Array<Record<string, unknown>>, maxTokens: number) {
	const { GoogleGenAI, Type } = await import('@google/genai');
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
