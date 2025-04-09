import { json, type RequestHandler } from '@sveltejs/kit';
import { GEMINI_API_KEY } from '$env/static/private';

// --- Type Definitions ---
interface RequestBody {
	material: string;
}
interface Question {
	question: string;
	options: string[];
	correct_answers: string[];
	explanation: string;
}
type ApiResponse = Question[];

// --- SvelteKit Endpoint ---
export const POST: RequestHandler = async ({ request }) => {
	try {
		// 1. Extract and validate material
		const body = (await request.json()) as RequestBody;
		const material = body?.material;
		if (!material || typeof material !== 'string') {
			return json(
				{ error: "Missing or invalid 'material' field (string) in request." },
				{ status: 400 }
			);
		}

		const { GoogleGenAI, Type } = await import('@google/genai');

		// 2. Initialize the GoogleGenAI client
		const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

		// 3. Construct the prompt
		const prompt = `
Role: You are an AI assistant specializing in pharmacology and medical education creating high-quality assessment questions.

Goal: Generate multiple-choice questions based on provided clinical pharmacology material for optometry students.

Instructions:
1. Create exactly 10 diverse questions based only on the provided material.
2. Include questions that test recall, understanding, application, and critical thinking.
3. Ensure at least 2-3 questions require selecting multiple correct answers.
4. Prioritize questions about ocular relevance if present in the material.
5. Do NOT reference the provided material in questions (e.g., "according to the text", "the material states").
6. Format options exactly as: "A. Option text", "B. Option text", etc.
7. Do not indicate "select all that apply" or "select all that are true".

Material to base questions on:
${material}
`;

		// 4. Make the API call
		const result = await ai.models.generateContent({
			model: 'gemini-2.5-pro-exp-03-25',
			contents: [{ role: 'user', parts: [{ text: prompt }] }],
			config: {
				temperature: 1,
				maxOutputTokens: 8192,
				responseMimeType: 'application/json',
				responseSchema: {
					type: Type.ARRAY,
					items: {
						type: Type.OBJECT,
						properties: {
							question: {
								type: Type.STRING,
								description: 'The text of the multiple-choice question'
							},
							options: {
								type: Type.ARRAY,
								items: { type: Type.STRING },
								description:
									'Array of answer options formatted as "A. Option text", "B. Option text", etc.'
							},
							correct_answers: {
								type: Type.ARRAY,
								items: { type: Type.STRING },
								description:
									'Array of letter identifiers (e.g., "A", "B") for the correct answer(s)'
							},
							explanation: {
								type: Type.STRING,
								description: 'Explanation of why the correct answer(s) is/are correct'
							}
						},
						required: ['question', 'options', 'correct_answers', 'explanation']
					}
				}
			}
			// Add safety settings if needed
			// safetySettings: [...]
		});

		// 5. Extract the response text string
		const responseText = result.text; // This is potentially string | undefined

		// --- FIX STARTS HERE ---
		// 6. Check if responseText is a valid string before parsing
		if (typeof responseText !== 'string') {
			console.error(
				'API response did not contain text content or result.text is undefined.',
				result // Log the full result for debugging
			);
			return json({ error: 'API response missing expected text content.' }, { status: 500 });
		}

		// 7. Parse and validate the JSON (Now responseText is guaranteed to be a string)
		try {
			const parsedResponse = JSON.parse(responseText) as ApiResponse; // Now safe
			if (!Array.isArray(parsedResponse)) {
				console.error('API response is not an array:', responseText);
				throw new Error('API response format error: Expected an array.');
			}
			return json(parsedResponse);
		} catch (parseError) {
			console.error('Error parsing Gemini response:', parseError);
			console.error('Raw response text:', responseText);
			return json(
				{
					error: `Failed to parse response as JSON: ${(parseError as Error).message}`,
					rawResponse: responseText
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error('Gemini API request error:', error);
		// Consider checking error structure for more specific feedback
		// if (error instanceof GoogleGenerativeAIError) { ... }
		return json(
			{ error: `Error processing request: ${(error as Error).message}` },
			{ status: 500 }
		);
	}
};
