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
			maxFileSize: '1024MB',
			maxFileCount: 1
		}
	}).onUploadComplete(async ({ file }) => {
		console.log('file url', file.ufsUrl);
	}),
	pdfUploader: f({
		pdf: {
			maxFileSize: '16MB',
			maxFileCount: 1
		}
	}).onUploadComplete(async ({ file }) => {
		console.log('file url', file.ufsUrl);
		console.log('file key', file.key);
	}),
	questionMediaUploader: f({
		image: {
			maxFileSize: '8MB',
			maxFileCount: 1
		}
	}).onUploadComplete(async ({ file }) => {
		console.log('question media url', file.ufsUrl);
		console.log('question media key', file.key);
	})
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
