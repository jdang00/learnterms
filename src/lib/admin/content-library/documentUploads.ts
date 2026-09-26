import { MAX_PDF_BYTES, MAX_PDF_PAGES } from '../../../convex/documentParsing';
import type { Id } from '../../../convex/_generated/dataModel';

export type DocumentUpload = {
	id: string;
	file: File;
	status: 'pending' | 'checking' | 'uploading' | 'saving' | 'queued' | 'error' | 'invalid';
	progress: number;
	error: string;
	key?: string;
	documentId?: Id<'contentLib'>;
};

export function addDocumentUploads(existing: DocumentUpload[], files: File[]): DocumentUpload[] {
	const added = [...existing];
	for (const file of files) {
		if (
			added.some(
				(item) =>
					item.file.name === file.name &&
					item.file.size === file.size &&
					item.file.lastModified === file.lastModified
			)
		)
			continue;
		const error =
			file.type !== 'application/pdf' && !(file.type === '' && /\.pdf$/i.test(file.name))
				? 'Only PDF files are supported.'
				: file.size > MAX_PDF_BYTES
					? 'Each PDF must be 30 MB or smaller.'
					: '';
		added.push({
			id: crypto.randomUUID(),
			file,
			status: error ? 'invalid' : 'pending',
			progress: 0,
			error
		});
	}
	return added;
}

export async function validatePdfPages(file: File): Promise<void> {
	const { PDFDocument } = await import('pdf-lib');
	let pageCount: number;
	try {
		const pdf = await PDFDocument.load(await file.arrayBuffer());
		pageCount = pdf.getPageCount();
	} catch {
		throw new Error('Unable to read this PDF. Use an unencrypted, valid PDF.');
	}
	if (pageCount < 1 || pageCount > MAX_PDF_PAGES) {
		throw new Error(
			`This PDF has ${pageCount} pages. Each PDF must have 1–${MAX_PDF_PAGES} pages.`
		);
	}
}

export type DocumentUploadOperations = {
	upload: (file: File, onProgress: (progress: number) => void) => Promise<string>;
	save: (file: File, key: string) => Promise<Id<'contentLib'>>;
	queue: (documentId: Id<'contentLib'>) => Promise<unknown>;
};

export async function uploadDocumentBatch(
	items: DocumentUpload[],
	operations: DocumentUploadOperations
): Promise<void> {
	for (const item of items) {
		if (item.status !== 'pending' && item.status !== 'error') continue;
		item.error = '';
		if (!item.key) {
			item.status = 'checking';
			try {
				await validatePdfPages(item.file);
			} catch (error) {
				item.status = 'invalid';
				item.error = error instanceof Error ? error.message : 'Unable to read this PDF.';
				continue;
			}
		}
		try {
			if (!item.key) {
				item.status = 'uploading';
				item.progress = 0;
				item.key = await operations.upload(item.file, (progress) => (item.progress = progress));
			}
			item.status = 'saving';
			// Keep completed stages so retrying a queue failure does not create another document.
			item.documentId ??= await operations.save(item.file, item.key);
			await operations.queue(item.documentId);
			item.status = 'queued';
		} catch (error) {
			item.status = 'error';
			item.error = error instanceof Error ? error.message : 'Failed to upload document.';
		}
	}
}
