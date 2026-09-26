import { expect, test } from 'bun:test';
import { PDFDocument } from 'pdf-lib';
import type { Id } from '../src/convex/_generated/dataModel';
import { MAX_PDF_BYTES } from '../src/convex/documentParsing';
import {
	addDocumentUploads,
	uploadDocumentBatch,
	validatePdfPages,
	type DocumentUploadOperations
} from '../src/lib/admin/content-library/documentUploads';

async function pdfFile(name: string, pages = 1) {
	const pdf = await PDFDocument.create();
	for (let index = 0; index < pages; index++) pdf.addPage();
	return new File([new Uint8Array(await pdf.save({ addDefaultPage: false }))], name, {
		type: 'application/pdf'
	});
}

function operations() {
	const calls: string[] = [];
	const ops: DocumentUploadOperations = {
		upload: async (file, onProgress) => {
			calls.push(`upload:${file.name}`);
			onProgress(100);
			return file.name;
		},
		save: async (file) => {
			calls.push(`save:${file.name}`);
			return file.name as Id<'contentLib'>;
		},
		queue: async (id) => {
			calls.push(`queue:${id}`);
		}
	};
	return { calls, ops };
}

test('selection appends PDFs, ignores repeats, and validates size per file rather than per batch', () => {
	const bytes = new Uint8Array(MAX_PDF_BYTES);
	const first = new File([bytes], 'first.pdf', { type: 'application/pdf' });
	const second = new File([bytes], 'second.pdf', { type: 'application/pdf' });
	const tooLarge = new File([bytes, 'x'], 'large.pdf', { type: 'application/pdf' });
	const nonPdf = new File(['text'], 'notes.txt', { type: 'text/plain' });
	const noMime = new File(['pdf'], 'lecture.PDF');
	const initial = addDocumentUploads([], [first]);
	const items = addDocumentUploads(initial, [first, second, tooLarge, nonPdf, noMime]);
	expect(items).toHaveLength(5);
	expect(items.map((item) => item.status)).toEqual([
		'pending',
		'pending',
		'invalid',
		'invalid',
		'pending'
	]);
	expect(items[2].error).toContain('30 MB');
	expect(items[3].error).toContain('Only PDF');
});

test('page validation accepts 150 pages and rejects 151, empty, and corrupt PDFs', async () => {
	await expect(validatePdfPages(await pdfFile('limit.pdf', 150))).resolves.toBeUndefined();
	await expect(validatePdfPages(await pdfFile('over.pdf', 151))).rejects.toThrow('151 pages');
	await expect(validatePdfPages(await pdfFile('empty.pdf', 0))).rejects.toThrow('0 pages');
	await expect(validatePdfPages(new File(['broken'], 'broken.pdf'))).rejects.toThrow('valid PDF');
});

test('batch processes every valid PDF in order and skips invalid PDFs before uploading', async () => {
	const items = addDocumentUploads(
		[],
		[
			await pdfFile('first.pdf', 100),
			await pdfFile('too-long.pdf', 151),
			await pdfFile('second.pdf', 100)
		]
	);
	const { calls, ops } = operations();
	await uploadDocumentBatch(items, ops);
	expect(items.map((item) => item.status)).toEqual(['queued', 'invalid', 'queued']);
	expect(calls).toEqual([
		'upload:first.pdf',
		'save:first.pdf',
		'queue:first.pdf',
		'upload:second.pdf',
		'save:second.pdf',
		'queue:second.pdf'
	]);
});

test('one transfer failure does not stop later files, and retry skips completed uploads', async () => {
	const items = addDocumentUploads([], [await pdfFile('first.pdf'), await pdfFile('second.pdf')]);
	const { calls, ops } = operations();
	const upload = ops.upload;
	let fail = true;
	ops.upload = async (file, progress) => {
		if (file.name === 'first.pdf' && fail) throw new Error('Network unavailable');
		return upload(file, progress);
	};
	await uploadDocumentBatch(items, ops);
	expect(items.map((item) => item.status)).toEqual(['error', 'queued']);
	expect(items[0].error).toBe('Network unavailable');
	fail = false;
	await uploadDocumentBatch(items, ops);
	expect(items.map((item) => item.status)).toEqual(['queued', 'queued']);
	expect(calls.filter((call) => call === 'upload:second.pdf')).toHaveLength(1);
});

test('retry after a queue failure reuses the uploaded file and saved document', async () => {
	const items = addDocumentUploads([], [await pdfFile('first.pdf'), await pdfFile('second.pdf')]);
	const { calls, ops } = operations();
	const queue = ops.queue;
	let fail = true;
	ops.queue = async (id) => {
		if (id === 'first.pdf' && fail) throw new Error('Queue unavailable');
		return queue(id);
	};
	await uploadDocumentBatch(items, ops);
	expect(items.map((item) => item.status)).toEqual(['error', 'queued']);
	fail = false;
	await uploadDocumentBatch(items, ops);
	expect(items.map((item) => item.status)).toEqual(['queued', 'queued']);
	expect(calls.filter((call) => call.startsWith('upload:'))).toHaveLength(2);
	expect(calls.filter((call) => call.startsWith('save:'))).toHaveLength(2);
});

test('retry after metadata failure keeps the successful file transfer', async () => {
	const items = addDocumentUploads([], [await pdfFile('first.pdf')]);
	const { calls, ops } = operations();
	const save = ops.save;
	ops.save = async () => {
		throw new Error('Save unavailable');
	};
	await uploadDocumentBatch(items, ops);
	expect(items[0].status).toBe('error');
	ops.save = save;
	await uploadDocumentBatch(items, ops);
	expect(items[0].status).toBe('queued');
	expect(calls.filter((call) => call.startsWith('upload:'))).toHaveLength(1);
});
