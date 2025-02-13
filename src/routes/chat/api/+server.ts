import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ChatMessage } from '$lib/types';
import { OPENAI_API_KEY } from '$env/static/private';
import OpenAI from 'openai';

const openai = new OpenAI({
	apiKey: OPENAI_API_KEY
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { messages }: { messages: ChatMessage[] } = await request.json();

		const completion = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: messages
		});

		return json({
			message: completion.choices[0].message.content
		});
	} catch (error) {
		console.error('Error:', error);
		return json({ error: 'Failed to process request' }, { status: 500 });
	}
};
