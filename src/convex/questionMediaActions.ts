'use node';

import { v } from 'convex/values';
import { fileTypeFromBuffer } from 'file-type';
import { action } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { r2 } from './r2Documents';
import { MAX_QUESTION_IMAGE_BYTES, validateQuestionImage } from '../lib/utils/questionMediaUpload';

export async function readImageBytes(response: Response) {
	if (!response.ok || !response.body)
		throw new Error('Image upload could not be read. Try uploading again.');
	if (Number(response.headers.get('content-length')) > MAX_QUESTION_IMAGE_BYTES)
		throw new Error('Image exceeds 8 MB.');
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > MAX_QUESTION_IMAGE_BYTES) throw new Error('Image exceeds 8 MB.');
			chunks.push(value);
		}
	} finally {
		await reader.cancel();
	}
	return Buffer.concat(chunks);
}

export const complete = action({
	args: { uploadId: v.id('questionMediaUploads') },
	returns: v.object({ url: v.string() }),
	handler: async (ctx, args): Promise<{ url: string }> => {
		const upload: Doc<'questionMediaUploads'> = await ctx.runMutation(
			internal.questionMediaUploads.claim,
			args
		);
		if (upload.status !== 'ready') {
			const url = await r2.getUrl(upload.stagingKey, { expiresIn: 60 });
			const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
			const bytes = await readImageBytes(response);
			const detected = await fileTypeFromBuffer(bytes);
			validateQuestionImage(detected?.mime ?? '', bytes.byteLength);
			if (detected?.mime !== upload.mimeType || bytes.byteLength !== upload.sizeBytes) {
				throw new Error('Image contents do not match the selected file. Upload it again.');
			}
			// Only verified bytes enter the final key. Reusing a staging PUT cannot replace a quiz image.
			await r2.store(ctx, bytes, {
				key: upload.r2Key,
				type: detected.mime,
				disposition: 'inline',
				cacheControl: 'private, max-age=3600'
			});
			await ctx.runMutation(internal.questionMediaUploads.markReady, args);
		}
		return { url: await r2.getUrl(upload.r2Key, { expiresIn: 60 * 60 }) };
	}
});
