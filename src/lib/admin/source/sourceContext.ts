export type PageCharacterCount = { pageNumber: number; characters: number };
export type SourcePreviewBatch = {
	pages: Array<{ pageNumber: number; text: string }>;
	pageNumbers: number[];
	pageCharacterCounts: PageCharacterCount[];
	nextOffset: number | null;
	sourceIndexedAt: number;
};

// A selection-size heuristic, not the model's context-window limit. English
// source tokens are estimated at roughly four characters each; OCR/math vary.
export const SOURCE_CONTEXT_TARGET = { min: 3000, max: 10000, broad: 20000 };

export function selectedContextSize(stats: PageCharacterCount[], pageNumbers: number[]) {
	const byPage = new Map(stats.map((page) => [page.pageNumber, page.characters]));
	const uniquePages = [...new Set(pageNumbers)];
	const missingPages = uniquePages.filter((page) => !byPage.has(page));
	const characters = uniquePages.reduce((sum, page) => sum + (byPage.get(page) ?? 0), 0);
	return {
		characters,
		estimatedTokens: Math.ceil(characters / 4),
		pageCount: uniquePages.length,
		complete: missingPages.length === 0
	};
}
