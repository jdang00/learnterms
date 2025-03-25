import { createUploadthing } from 'uploadthing/server';
import type { FileRouter } from 'uploadthing/server';

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
	// Define as many FileRoutes as you like, each with a unique routeSlug
	imageUploader: f({
		image: {
			/**
			 * For full list of options and defaults, see the File Route API reference
			 * @see https://docs.uploadthing.com/file-routes#route-config
			 */
			maxFileSize: '4MB',
			maxFileCount: 1
		}
	}).onUploadComplete(async ({ file }) => {
		// This code RUNS ON YOUR SERVER after upload
		console.log('Upload complete');
		console.log('file url', file.ufsUrl);
	})
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
