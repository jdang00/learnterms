/** Pure parsing utilities shared by ingestion and evaluation. */
export const PARSER_VERSION = 'datalab-image-markers-v3';
export const MAX_PDF_PAGES = 150;
export const MAX_PDF_BYTES = 30 * 1024 * 1024;
export type OcrPage = {
	index?: number;
	blocks?: Array<{
		id: string;
		type: string;
		markdown: string;
		bbox: number[];
		sectionHierarchy: Record<string, unknown>;
	}>;
	dimensions?: Record<string, unknown>;
	markdown?: string;
	images?: Array<Record<string, unknown>>;
	tables?: Array<Record<string, unknown>>;
	confidence_scores?: Record<string, unknown> | null;
};
export type OcrDocument = {
	pages?: OcrPage[];
	model?: string;
	usage_info?: Record<string, unknown>;
};

/** Remove our old diagnostic prose at read time, including already-stored documents. */
export function cleanSourceMarkdown(markdown: string): string {
	return markdown
		.split(/(?=<!--\s*page:\d+\s*-->)/)
		.map((part) => {
			let imageNote = false;
			let text = part
				.replace(/!\[[^\]]*\]\([^\n]*?\)/g, '[Image]')
				.replace(/<img\b[^>]*>/gi, '[Image]')
				.replace(
					/\[Source extraction note: (Sparse extracted text; inspect the original page\.|Contains images: questions must not depend on unseen visual details\.|Low OCR confidence; inspect numerical values and labels\.)\]/g,
					(_match, note: string) => {
						imageNote ||= note.startsWith('Contains images:');
						return '';
					}
				);
			// Old artifacts without a positional image token still retain a page-level indicator.
			if (imageNote && !text.includes('[Image]')) {
				text = text.replace(/(\n\n---\s*)?$/, '\n\n[Image]$1');
			}
			return text.replace(/\n{3,}/g, '\n\n');
		})
		.join('');
}

export function pageMarkdown(page: OcrPage) {
	const source = page.blocks?.length
		? page.blocks
				.map((block) => (/^(Picture|Figure|Image)$/.test(block.type) ? '[Image]' : block.markdown))
				.filter(Boolean)
				.join('\n\n')
		: (page.markdown ?? '');
	const markdown = cleanSourceMarkdown(source).trim();
	const tables = (page.tables ?? [])
		.map((table) => {
			for (const key of ['markdown', 'content', 'text'])
				if (typeof table[key] === 'string') return table[key] as string;
			return '';
		})
		.filter((t) => t.trim() && !markdown.includes(t.trim()));
	return [markdown, ...tables].filter(Boolean).join('\n\n');
}

export function parseOcrPages(ocr: OcrDocument, expectedPages?: number) {
	const raw = ocr.pages ?? [];
	if (
		!raw.length ||
		raw.length > MAX_PDF_PAGES ||
		(expectedPages !== undefined && raw.length !== expectedPages)
	)
		throw new Error(
			'OCR page count does not match the validated PDF. Existing index was preserved.'
		);
	const pages = raw.map((page, i) => {
		const pageNumber = (page.index ?? i) + 1;
		const text = pageMarkdown(page);
		const warnings: string[] = [];
		if (text.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim().length < 100)
			warnings.push('Sparse extracted text; inspect the original page.');
		if (page.images?.length)
			warnings.push('Contains images: questions must not depend on unseen visual details.');
		const confidence = page.confidence_scores;
		const numeric = [confidence?.average_page_confidence_score].filter(
			(n): n is number => typeof n === 'number' && n >= 0 && n <= 1
		);
		if (numeric.some((n) => n < 0.8))
			warnings.push('Low OCR confidence; inspect numerical values and labels.');
		return {
			pageNumber,
			text,
			warnings,
			imageCount: page.images?.length ?? 0,
			tableCount: page.tables?.length ?? 0
		};
	});
	if (
		new Set(pages.map((p) => p.pageNumber)).size !== raw.length ||
		pages.some((p) => p.pageNumber < 1 || p.pageNumber > raw.length)
	)
		throw new Error('OCR returned invalid page numbers');
	return pages.sort((a, b) => a.pageNumber - b.pageNumber);
}

export function serializePages(pages: Array<{ pageNumber: number; text: string }>) {
	return pages.map((p) => `<!-- page:${p.pageNumber} -->\n\n${p.text}`).join('\n\n---\n\n');
}

export function parseStoredPages(markdown: string) {
	// Split on page markers, not Markdown rules that may also appear inside a source page.
	return [...markdown.matchAll(/<!--\s*page:(\d+)\s*-->([\s\S]*?)(?=<!--\s*page:\d+\s*-->|$)/g)]
		.map((m) => ({
			pageNumber: Number(m[1]),
			text: cleanSourceMarkdown(m[2].replace(/\n\n---\s*$/, '')).trim()
		}))
		.filter((p) => p.text.length > 0);
}

export function mappingPageGroups<T extends { pageNumber: number; text: string }>(
	pages: T[],
	maxChars = 28000
) {
	const groups: T[][] = [];
	let group: T[] = [],
		chars = 0;
	for (const page of pages) {
		if (group.length && chars + page.text.length > maxChars) {
			groups.push(group);
			group = [];
			chars = 0;
		}
		group.push(page);
		chars += page.text.length;
	}
	if (group.length) groups.push(group);
	return groups;
}
