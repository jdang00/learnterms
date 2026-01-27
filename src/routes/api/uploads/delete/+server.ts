import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { UTApi } from 'uploadthing/server';

async function readFileKey(request: Request): Promise<string | null> {
	// Prefer query param for DELETE /api/uploads/delete?fileKey=...
	const url = new URL(request.url);
	const fromQuery = url.searchParams.get('fileKey');
	if (typeof fromQuery === 'string' && fromQuery.length > 0) return fromQuery;

	// Fallback to JSON body { fileKey }
	const contentType = request.headers.get('content-type') || '';
	if (!contentType.includes('application/json')) return null;

	try {
		const body = (await request.json()) as { fileKey?: unknown };
		return typeof body.fileKey === 'string' && body.fileKey.length > 0 ? body.fileKey : null;
	} catch {
		return null;
	}
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const fileKey = await readFileKey(request);
		if (!fileKey) return json({ error: 'Missing fileKey' }, { status: 400 });

		const utapi = new UTApi({ token: env.UPLOADTHING_TOKEN });
		await utapi.deleteFiles(fileKey);

		return json({ success: true });
	} catch (e) {
		console.error('uploads/delete error', e);
		return json({ success: false }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const fileKey = await readFileKey(request);
		if (!fileKey) return json({ error: 'Missing fileKey' }, { status: 400 });

		const utapi = new UTApi({ token: env.UPLOADTHING_TOKEN });
		await utapi.deleteFiles(fileKey);

		return json({ success: true });
	} catch (e) {
		console.error('uploads/delete error', e);
		return json({ success: false }, { status: 500 });
	}
};

