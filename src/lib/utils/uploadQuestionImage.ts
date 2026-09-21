import type { ConvexClient } from 'convex/browser';
import type { Id } from '../../convex/_generated/dataModel';
import { api } from '../../convex/_generated/api';
import { validateQuestionImage } from './questionMediaUpload';

function putImage(
	url: string,
	file: File,
	signal: AbortSignal,
	progress: (percent: number) => void
) {
	return new Promise<void>((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const abort = () => xhr.abort();
		const finish = (error?: Error) => {
			signal.removeEventListener('abort', abort);
			if (error) reject(error);
			else resolve();
		};
		xhr.open('PUT', url);
		xhr.setRequestHeader('Content-Type', file.type);
		xhr.timeout = 120_000;
		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable) progress(Math.round((event.loaded / event.total) * 100));
		};
		xhr.onload = () =>
			finish(
				xhr.status >= 200 && xhr.status < 300
					? undefined
					: new Error('Image upload failed. Please try again.')
			);
		xhr.onerror = () =>
			finish(new Error('Could not upload the image. Check your connection and try again.'));
		xhr.ontimeout = () => finish(new Error('Image upload timed out. Please try again.'));
		xhr.onabort = () => finish(new Error('Image upload canceled.'));
		if (signal.aborted) {
			reject(new Error('Image upload canceled.'));
			return;
		}
		signal.addEventListener('abort', abort, { once: true });
		xhr.send(file);
	});
}

export async function uploadQuestionImage(
	client: ConvexClient,
	moduleId: Id<'module'>,
	file: File,
	signal: AbortSignal,
	progress: (percent: number) => void
) {
	validateQuestionImage(file.type, file.size);
	const { uploadId, url } = await client.mutation(api.questionMediaUploads.begin, {
		moduleId,
		fileName: file.name,
		mimeType: file.type,
		sizeBytes: file.size
	});
	try {
		await putImage(url, file, signal, progress);
		await client.action(api.questionMediaActions.complete, { uploadId });
		if (signal.aborted) throw new Error('Image upload canceled.');
		return uploadId;
	} catch (error) {
		await client.mutation(api.questionMediaUploads.discard, { uploadId }).catch(() => {});
		throw error;
	}
}
