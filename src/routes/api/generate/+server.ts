import { json, type RequestHandler } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../../convex/_generated/api';

// --- Type Definitions ---
interface RequestBody {
    material: string;
    model?: string;
    numQuestions?: number;
}

// --- SvelteKit Endpoint ---
export const POST: RequestHandler = async ({ request }) => {
	try {
        const body = (await request.json()) as RequestBody;
        const material = body?.material;
        const model = body?.model || 'gemini-2.5-pro';
        const numQuestions = body?.numQuestions ?? 10;

        if (!material || typeof material !== 'string') {
            return json(
                { error: "Missing or invalid 'material' field (string) in request." },
                { status: 400 }
            );
        }

        if (!PUBLIC_CONVEX_URL) {
            return json({ error: 'Convex URL not configured' }, { status: 500 });
        }

        const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
        const { questions, count } = await client.action(api.question.generateQuestions, {
            material,
            model,
            numQuestions
        });

        return json({ success: true, questions, count });
	} catch (error) {
		return json(
			{ error: `Error processing request: ${(error as Error).message}` },
			{ status: 500 }
		);
	}
};
