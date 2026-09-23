/** Accept human page lists without silently widening their selection. */
export function parsePageSelection(input: string, availablePages: number[]): number[] {
	const available = new Set(availablePages);
	const pages = new Set<number>();
	if (!input.trim()) throw new Error('Enter pages, such as 1–12, 24, 38–45.');
	for (const token of input.split(',')) {
		const match = token.trim().match(/^(\d+)(?:\s*[-–—]\s*(\d+))?$/);
		if (!match) throw new Error('Use page numbers or ranges separated by commas.');
		const first = Number(match[1]);
		const last = Number(match[2] ?? match[1]);
		if (
			first > last ||
			last - first >= availablePages.length ||
			!available.has(first) ||
			!available.has(last)
		)
			throw new Error('That range includes pages unavailable in this document.');
		for (let page = first; page <= last; page++) {
			if (!available.has(page)) throw new Error(`Page ${page} is unavailable in this document.`);
			pages.add(page);
		}
	}
	return [...pages].sort((a, b) => a - b);
}

export function formatPageSelection(pages: number[]): string {
	const sorted = [...new Set(pages)].sort((a, b) => a - b);
	const ranges: string[] = [];
	for (let index = 0; index < sorted.length; index++) {
		const first = sorted[index];
		let last = first;
		while (sorted[index + 1] === last + 1) last = sorted[++index];
		ranges.push(first === last ? String(first) : `${first}–${last}`);
	}
	return ranges.join(', ');
}

// The source preview endpoint serves 12 pages per request. Jumping to page 100
// requests its batch directly instead of downloading every preceding page.
export function sourcePageBatch(pageNumber: number, availablePages: number[]): number {
	const index = availablePages.indexOf(pageNumber);
	if (index < 0) throw new Error('Page unavailable.');
	return Math.floor(index / 12) * 12;
}
