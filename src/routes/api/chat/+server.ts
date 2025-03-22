import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { RequestHandler } from '../$types';
import { env } from '$env/dynamic/private';

// Initialize Google Generative AI
const googleAI = createGoogleGenerativeAI({
	apiKey: env.GOOGLE_GENAI_API_KEY ?? ''
});

// Function to call Langflow for Astra DB retrieval
async function callLangFlow(userMessage: string): Promise<unknown> {
	const url =
		'https://api.langflow.astra.datastax.com/lf/db0470a7-f642-42f7-9f5e-641384c3e6f7/api/v1/run/e28ed699-6f86-49a7-9f71-43f46913f490?stream=false';
	const token = env.LANGFLOW_API_TOKEN;

	const payload = {
		input_value: userMessage,
		output_type: 'chat',
		input_type: 'chat',
		tweaks: {
			'ChatInput-YdjKK': {},
			'ParseData-CvM5p': {},
			'OpenAIEmbeddings-CcrQW': {},
			'AstraDB-zvzHu': {},
			'TextOutput-maMfX': {}
		}
	};

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const result = await response.json();
		console.log('test');

		console.log(result);
		return result;
	} catch (error) {
		console.error('Error calling LangFlow API:', error);
		throw error;
	}
}

export const POST = (async ({ request }) => {
	const { messages } = await request.json();
	const userMessage = messages[messages.length - 1]?.content || 'No input provided.';

	// Query Langflow to get relevant search results from Astra DB
	const retrievedContext = await callLangFlow(userMessage);
	console.log('test');

	// Inject retrieved context into the system prompt
	const systemPrompt = {
		role: 'system',
		content: `
You are a world-class pharmacologist, toxicologist, and drug researcher with deep expertise in pharmacodynamics, pharmacokinetics, and clinical drug applications.

Your goal is to provide clear, accurate, and comprehensive answers to pharmacology-related questions. However, you must strictly **only use the information provided below**—do not rely on external knowledge, personal opinions, or assumptions.

---
📖 **Retrieved Information from Astra DB:**
${retrievedContext}
---

### **🚀 Instructions for Answering**
1️⃣ **Use only the above context** to formulate your response.
2️⃣ **Do NOT make up information**—if the context doesn’t contain the answer, respond with:
   _"I couldn't find relevant information in the database regarding this topic."_
3️⃣ **Be polite, professional, and to the point.**
4️⃣ **If listing drugs or mechanisms, keep it structured** (e.g., bullet points or short explanations).
5️⃣ **Do not reference external sources**—you are limited to the retrieved database content.
6️⃣ **Avoid vague or overly simplified responses**; provide precise, clinically relevant details.
7️⃣ **Stay on topic**—do NOT provide unrelated medical or pharmacological details that are not supported by the retrieved context. If a question is unrelated to the context, politely decline to answer.

---
Now, using only the provided database content, answer the following question as an expert pharmacologist:
`
	};

	// Prepend the system prompt to the messages array
	const allMessages = [systemPrompt, ...messages];

	// Stream text using Google Generative AI
	const result = streamText({
		model: googleAI('gemini-2.0-flash'),
		messages: allMessages
	});

	// Return the streamed response
	return result.toDataStreamResponse();
}) satisfies RequestHandler;
