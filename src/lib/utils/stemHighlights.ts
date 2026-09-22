export type StemHighlight = { id: string; start: number; end: number; quote: string };
export const MAX_STEM_HIGHLIGHTS = 80;

// Version the actual content, not updatedAt (flags and ordering also update questions).
export async function stemFingerprint(stem: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stem));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function validStemHighlight(range: StemHighlight): boolean {
	return (
		range.id.length > 0 &&
		range.id.length <= 80 &&
		Number.isSafeInteger(range.start) &&
		Number.isSafeInteger(range.end) &&
		range.start >= 0 &&
		range.end > range.start &&
		range.end <= 200_000 &&
		range.quote.length === range.end - range.start &&
		range.quote.trim().length > 0 &&
		range.quote.length <= 10_000
	);
}

export type HighlightChange = { added: StemHighlight[]; removed: StemHighlight[] };
export type HighlightOperation =
	| { type: 'add' | 'toggle'; range: StemHighlight }
	| { type: 'remove'; id: string }
	| { type: 'patch'; removeIds: string[]; addRanges: StemHighlight[] };

export function highlightChange(
	ranges: StemHighlight[],
	operation: HighlightOperation
): HighlightChange {
	if (operation.type === 'remove')
		return { added: [], removed: ranges.filter((r) => r.id === operation.id) };
	if (operation.type === 'patch')
		return {
			removed: ranges.filter((r) => operation.removeIds.includes(r.id)),
			added: operation.addRanges.filter(
				(r) =>
					!ranges.some((existing) => existing.id === r.id && !operation.removeIds.includes(r.id))
			)
		};
	if (operation.type === 'add')
		return {
			removed: [],
			added: ranges.some((r) => r.id === operation.range.id) ? [] : [operation.range]
		};
	const selected = operation.range;
	const removed = ranges.filter((r) => r.start < selected.end && r.end > selected.start);
	if (!removed.length) return { added: [selected], removed: [] };
	const added: StemHighlight[] = [];
	for (const [index, range] of removed.entries()) {
		if (range.start < selected.start) {
			const quote = range.quote.slice(0, selected.start - range.start);
			if (quote.trim())
				added.push({
					id: `${selected.id.slice(0, 60)}-${index}-left`,
					start: range.start,
					end: selected.start,
					quote
				});
		}
		if (range.end > selected.end) {
			const quote = range.quote.slice(selected.end - range.start);
			if (quote.trim())
				added.push({
					id: `${selected.id.slice(0, 60)}-${index}-right`,
					start: selected.end,
					end: range.end,
					quote
				});
		}
	}
	return { added, removed };
}

export function applyHighlightChange(
	ranges: StemHighlight[],
	change: HighlightChange
): StemHighlight[] {
	return [
		...ranges.filter((r) => !change.removed.some((removed) => removed.id === r.id)),
		...change.added
	];
}
