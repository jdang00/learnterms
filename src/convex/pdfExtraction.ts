'use node';
import { PDFDocument } from 'pdf-lib';
import { normalizeDatalab, pollDatalab, submitDatalab } from './datalab';
import { MAX_PDF_BYTES, MAX_PDF_PAGES, parseOcrPages } from './documentParsing';
export { OcrRequestError } from './datalab';
export async function inspectPdf(bytes: ArrayBuffer) {
	if (bytes.byteLength > MAX_PDF_BYTES) throw new Error('PDF exceeds the 30 MB limit');
	const pdf = await PDFDocument.load(bytes);
	const count = pdf.getPageCount();
	if (count < 1 || count > MAX_PDF_PAGES)
		throw new Error(`PDF must contain 1–${MAX_PDF_PAGES} pages`);
	return count;
}
/** Local evaluation helper. Deployed ingestion uses durable workflow steps instead. */
export async function extractPdf(apiKey: string, source: string | Blob, expectedPages: number) {
	const job = await submitDatalab(apiKey, source);
	for (let i = 0; i < 300; i++) {
		await new Promise((resolve) => setTimeout(resolve, 2000));
		const result = await pollDatalab(apiKey, job.request_check_url!);
		if (result.status === 'complete') {
			const ocr = normalizeDatalab(result, expectedPages);
			return { ocr, pages: parseOcrPages(ocr, expectedPages) };
		}
	}
	throw new Error('Document processing timed out; do not automatically resubmit');
}
