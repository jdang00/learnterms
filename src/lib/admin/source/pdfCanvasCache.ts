import type { PDFDocumentProxy } from 'pdfjs-dist';

// Canvas pixels survive closing/reopening the dialog while its PDF remains loaded.
// Weak ownership plus an 8-megapixel limit per PDF bounds memory for long documents.
const documents = new WeakMap<PDFDocumentProxy, Map<string, HTMLCanvasElement>>();
const key = (page: number, thumbnail: boolean) => `${page}:${thumbnail ? 'thumb' : 'preview'}`;

export function restorePdfCanvas(
	pdf: PDFDocumentProxy,
	page: number,
	thumbnail: boolean,
	target: HTMLCanvasElement
) {
	const entries = documents.get(pdf);
	const cached = entries?.get(key(page, thumbnail));
	const context = target.getContext('2d');
	if (!cached || !context) return false;
	entries!.delete(key(page, thumbnail));
	entries!.set(key(page, thumbnail), cached);
	target.width = cached.width;
	target.height = cached.height;
	context.drawImage(cached, 0, 0);
	return true;
}

export function rememberPdfCanvas(
	pdf: PDFDocumentProxy,
	page: number,
	thumbnail: boolean,
	source: HTMLCanvasElement
) {
	let entries = documents.get(pdf);
	if (!entries) {
		entries = new Map();
		documents.set(pdf, entries);
	}
	const copy = window.document.createElement('canvas');
	copy.width = source.width;
	copy.height = source.height;
	const context = copy.getContext('2d');
	if (!context) return;
	context.drawImage(source, 0, 0);
	entries.set(key(page, thumbnail), copy);
	let pixels = [...entries.values()].reduce(
		(total, canvas) => total + canvas.width * canvas.height,
		0
	);
	while (entries.size > 40 || pixels > 8_000_000) {
		const oldest = entries.keys().next().value!;
		const canvas = entries.get(oldest)!;
		pixels -= canvas.width * canvas.height;
		entries.delete(oldest);
		canvas.width = canvas.height = 0;
	}
}
