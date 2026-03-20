import { json, type RequestHandler } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../../convex/_generated/api';
import { resolveProduct, defaultProductModelId } from '$lib/config/generation';

// --- Type Definitions ---
interface RequestBody {
	material: string;
	numQuestions?: number;
	productModelId?: string;
	customPrompt?: string;
}

// --- SvelteKit Endpoint ---
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = (await request.json()) as RequestBody;
		const material = body?.material;
		const numQuestions = body?.numQuestions ?? 10;
		const productModelId = body?.productModelId || defaultProductModelId;
		const customPrompt = typeof body?.customPrompt === 'string' ? body.customPrompt : '';

		if (!material || typeof material !== 'string') {
			return json(
				{ error: "Missing or invalid 'material' field (string) in request." },
				{ status: 400 }
			);
		}

		const { model, focus } = resolveProduct(productModelId);

		const n = Number(numQuestions);
		const nInt = Math.floor(n);
		if (!Number.isFinite(n) || nInt !== n || nInt < 1 || nInt > 50) {
			return json(
				{ error: "Invalid 'numQuestions'. Provide an integer between 1 and 50." },
				{ status: 400 }
			);
		}

		if (!PUBLIC_CONVEX_URL) {
			return json({ error: 'Convex URL not configured' }, { status: 500 });
		}

		const token = await locals.auth().getToken({ template: 'convex' });
		const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
		if (token) {
			client.setAuth(token);
		}
		const payload = { material, model, numQuestions: nInt, focus, customPrompt };
		const { questions, count } = await client.action(api.question.generateQuestions, payload as never);

		return json({ success: true, questions, count });
	} catch (error) {
		return json(
			{ error: `Error processing request: ${(error as Error).message}` },
			{ status: 500 }
		);
	}
};
