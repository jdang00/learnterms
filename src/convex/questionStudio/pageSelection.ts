import { MAX_PDF_PAGES, mappingPageGroups } from '../documentParsing';
import type { StoredMarkdownPage, TopicMapItem } from './shared';

export type SourceMode = 'topics' | 'pages';

export function normalizeSelectedPages(values: number[], pageCount = MAX_PDF_PAGES): number[] {
	if (
		!values.length ||
		values.length > MAX_PDF_PAGES ||
		new Set(values).size !== values.length ||
		values.some((page) => !Number.isInteger(page) || page < 1 || page > pageCount)
	) {
		throw new Error('Select valid source pages before generating.');
	}
	return [...values].sort((a, b) => a - b);
}

/** Exact membership: selecting pages 2 and 5 must never include pages 3 or 4. */
export function selectedSourcePages(pages: StoredMarkdownPage[], numbers: number[]) {
	const selected = new Set(normalizeSelectedPages(numbers));
	const result = pages.filter((page) => selected.has(page.pageNumber));
	if (result.length !== selected.size)
		throw new Error('Selected pages are no longer available. Reload the source.');
	return result;
}

/** Plan only the chosen source text; never reuse objectives from a whole-document map. */
export async function planPageContext(
	pages: StoredMarkdownPage[],
	numbers: number[],
	map: (pages: StoredMarkdownPage[]) => Promise<TopicMapItem[]>
): Promise<TopicMapItem[]> {
	const topics: TopicMapItem[] = [];
	for (const group of mappingPageGroups(selectedSourcePages(pages, numbers))) {
		const allowed = new Set(group.map((page) => page.pageNumber));
		for (const topic of await map(group)) {
			const pageNumbers = [...new Set(topic.pageNumbers.filter((page) => allowed.has(page)))];
			// A planner cannot expand the source boundary, even if it invents a page reference.
			if (!pageNumbers.length) continue;
			topics.push({ ...topic, topicId: `pages-${topics.length + 1}`, pageNumbers });
		}
	}
	return topics;
}
