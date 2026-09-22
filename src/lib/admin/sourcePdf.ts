import { base } from '$app/paths';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export type SourcePdfResource = {
	promise: Promise<PDFDocumentProxy>;
	destroy: () => void;
};

export function warmPdfRenderer() {
	void import('pdfjs-dist').catch(() => {});
}

/** Start URL lookup and renderer loading together; the owner releases the worker. */
export function createSourcePdf(getUrl: () => Promise<string>): SourcePdfResource {
	let task: PDFDocumentLoadingTask | undefined;
	let destroyed = false;
	const promise = (async () => {
		const [url, pdfjs] = await Promise.all([getUrl(), import('pdfjs-dist')]);
		if (destroyed) throw new Error('Source preview closed');
		pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
		const assetBase = `${base}/pdfjs/${pdfjs.version}`;
		task = pdfjs.getDocument({
			url,
			cMapUrl: `${assetBase}/cmaps/`,
			standardFontDataUrl: `${assetBase}/standard_fonts/`,
			wasmUrl: `${assetBase}/wasm/`,
			iccUrl: `${assetBase}/iccs/`
		});
		return await task.promise;
	})();
	// Preloading can finish before a consumer mounts. Errors are still delivered to the consumer.
	void promise.catch(() => {});
	return {
		promise,
		destroy: () => {
			destroyed = true;
			void task?.destroy();
		}
	};
}
