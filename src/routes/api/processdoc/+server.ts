import { json, type RequestHandler } from '@sveltejs/kit';
import { GEMINI_API_KEY } from '$env/static/private';

// --- Type Definitions for Content Chunking ---
interface RequestBody {
	material: string;
}

interface Chunk {
	title: string;
	summary: string;
	content: string;
	keywords: string[];
	chunk_type: 'paragraph' | 'slide_group' | 'diagram' | 'table' | 'list';
}

type ApiResponse = Chunk[];

// --- Unified Content Processing Endpoint ---
export const POST: RequestHandler = async ({ request }) => {
	try {
		const contentType = request.headers.get('content-type');
		
		// Handle multipart/form-data (PDF upload)
		if (contentType?.includes('multipart/form-data')) {
			return await processPDF(request);
		}
		
		// Handle JSON (text material)
		if (contentType?.includes('application/json')) {
			return await processText(request);
		}
		
		return json(
			{ error: 'Unsupported content type. Use multipart/form-data for PDFs or application/json for text.' },
			{ status: 400 }
		);
	} catch (error) {
		console.error('Request processing error:', error);
		return json(
			{ error: `Error processing request: ${(error as Error).message}` },
			{ status: 500 }
		);
	}
};

// --- Process PDF Files ---
async function processPDF(request: Request) {
	try {
		const formData = await request.formData();
		const pdfFile = formData.get('pdf') as File;
		
		if (!pdfFile) {
			return json(
				{ error: 'No PDF file provided' },
				{ status: 400 }
			);
		}
		
		if (pdfFile.type !== 'application/pdf') {
			return json(
				{ error: 'File must be a PDF' },
				{ status: 400 }
			);
		}
		
		// Convert PDF to buffer
		const pdfBuffer = await pdfFile.arrayBuffer();
		const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
		
		const { GoogleGenAI, Type } = await import('@google/genai');
		const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
		
		const contents = [
			{ 
				text: `Role: You are an expert document analysis assistant.

Goal: Analyze this PDF and create meaningful content chunks. Handle both academic papers and lecture slides appropriately.

Document Types:
- Academic Papers/PDFs: Extract substantial paragraph content, skip standalone titles
- Lecture Slides: Combine related slides into logical topics, include slide content and descriptions of images/diagrams

Instructions:
1. Create 5-15 substantial chunks, skip standalone titles or headers
2. For images/diagrams: If confident about content, create chunks describing what they show
3. For lecture slides: Group related slides by topic, include all text and visual descriptions
4. For each chunk provide:
   - Descriptive title (what this section teaches)
   - Brief summary (1-2 sentences)
   - Complete text content plus any image/diagram descriptions
   - 3-5 relevant keywords
   - Content type: 'paragraph' (text), 'slide_group' (slides), 'diagram' (images), 'table', 'list'

Focus on educational value - capture content that helps learning, not just formatting.` 
			},
			{
				inlineData: {
					mimeType: 'application/pdf',
					data: pdfBase64
				}
			}
		];
		
		const result = await ai.models.generateContent({
			model: 'gemini-2.5-flash-lite',
			contents: contents,
			config: {
				temperature: 0.3,
				maxOutputTokens: 12288,
				responseMimeType: 'application/json',
				responseSchema: {
					type: Type.ARRAY,
					items: {
						type: Type.OBJECT,
						properties: {
							title: {
								type: Type.STRING,
								description: 'A concise, descriptive title for the chunk of text.'
							},
							summary: {
								type: Type.STRING,
								description: 'A 1-3 sentence summary that captures the main points of the content.'
							},
							content: {
								type: Type.STRING,
								description: 'The full text content of the chunk.'
							},
							keywords: {
								type: Type.ARRAY,
								items: { type: Type.STRING },
								description: 'An array of the 5-7 most important keywords or concepts.'
							},
							chunk_type: {
								type: Type.STRING,
								enum: ['paragraph', 'slide_group', 'diagram', 'table', 'list'],
								description: 'The type of content.'
							}
						},
						required: ['title', 'summary', 'content', 'keywords', 'chunk_type']
					}
				}
			}
		});
		
		const responseText = result.text;
		
		if (!responseText) {
			return json({ error: 'AI response missing expected text content.' }, { status: 500 });
		}
		
		try {
			const parsedResponse = JSON.parse(responseText.trim()) as ApiResponse;
			return json({ 
				success: true, 
				chunks: parsedResponse,
				processedCount: parsedResponse.length 
			});
		} catch (parseError) {
			// Try to salvage truncated responses
			const trimmed = responseText.trim();
			if (!trimmed.endsWith(']')) {
				const lastCompleteChunk = trimmed.lastIndexOf('},');
				if (lastCompleteChunk > 0) {
					const salvaged = trimmed.substring(0, lastCompleteChunk + 1) + '\n]';
					try {
						const salvagedResponse = JSON.parse(salvaged) as ApiResponse;
						return json({ 
							success: true, 
							chunks: salvagedResponse,
							processedCount: salvagedResponse.length,
							warning: 'Response was truncated, some content may be missing'
						});
					} catch {
						// Fall through to error response
					}
				}
			}
			
			return json({
				error: `Failed to parse response as JSON: ${(parseError as Error).message}`
			}, { status: 500 });
		}
	} catch (error) {
		console.error('PDF processing error:', error);
		return json(
			{ error: `Error processing PDF: ${(error as Error).message}` },
			{ status: 500 }
		);
	}
}

// --- Process Text Material ---
async function processText(request: Request) {
	try {
		const body = (await request.json()) as RequestBody;
		const material = body?.material;
		if (!material || typeof material !== 'string') {
			return json(
				{ error: "Missing or invalid 'material' field (string) in request." },
				{ status: 400 }
			);
		}

		const { GoogleGenAI, Type } = await import('@google/genai');
		const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

		const prompt = `Role: You are an expert document analysis assistant.

Goal: Analyze the provided text and break it down into logical content chunks. Return an array of structured JSON objects, each representing a coherent section of the content.

Instructions:
1. Read through the text and identify distinct logical sections or chunks
2. For each section, create a chunk with:
   - A descriptive title that captures the main topic
   - A concise summary (1-3 sentences) of the key information
   - The full text content of that section (preserve original text)
   - 5-7 relevant keywords or key concepts
   - Content type classification: 'paragraph', 'table', 'list', or 'heading'
3. If the text is short or cohesive, create a single meaningful chunk
4. If the text covers multiple topics, break it into logical sections
5. Return ONLY the JSON array with no additional text or explanations

Material to process:
${material}`;

		const result = await ai.models.generateContent({
			model: 'gemini-2.5-flash-lite',
			contents: [{ role: 'user', parts: [{ text: prompt }] }],
			config: {
				temperature: 0.3,
				maxOutputTokens: 8192,
				responseMimeType: 'application/json',
				responseSchema: {
					type: Type.ARRAY,
					items: {
						type: Type.OBJECT,
						properties: {
							title: {
								type: Type.STRING,
								description: 'A concise, descriptive title for the chunk of text.'
							},
							summary: {
								type: Type.STRING,
								description: 'A 1-3 sentence summary that captures the main points of the content.'
							},
							content: {
								type: Type.STRING,
								description: 'The full text content of the chunk.'
							},
							keywords: {
								type: Type.ARRAY,
								items: { type: Type.STRING },
								description: 'An array of the 5-7 most important keywords or concepts.'
							},
							chunk_type: {
								type: Type.STRING,
								enum: ['paragraph', 'slide_group', 'diagram', 'table', 'list'],
								description: 'The type of content.'
							}
						},
						required: ['title', 'summary', 'content', 'keywords', 'chunk_type']
					}
				}
			}
		});

		const responseText = result.text;

		if (!responseText) {
			return json({ error: 'API response missing expected text content.' }, { status: 500 });
		}

		try {
			const parsedResponse = JSON.parse(responseText.trim()) as ApiResponse;
			return json({ 
				success: true, 
				chunks: parsedResponse,
				processedCount: parsedResponse.length 
			});
		} catch (parseError) {
			return json({
				error: `Failed to parse response as JSON: ${(parseError as Error).message}`
			}, { status: 500 });
		}
	} catch (error) {
		console.error('Text processing error:', error);
		return json(
			{ error: `Error processing text: ${(error as Error).message}` },
			{ status: 500 }
		);
	}
}
