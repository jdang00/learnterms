import type { SourcePreviewBatch } from './sourceContext';

/** Editor-local cache: coalesce requests, bound retained text, invalidate on reindexing. */
export function createSourcePreviewCache(
	load: (documentId: string) => Promise<SourcePreviewBatch>
) {
	const entries = new Map<string, { revision: number; value: Promise<SourcePreviewBatch> }>();
	return {
		get(documentId: string, revision: number) {
			const existing = entries.get(documentId);
			if (existing?.revision === revision) {
				entries.delete(documentId);
				entries.set(documentId, existing);
				return existing.value;
			}
			const value = load(documentId).catch((error) => {
				if (entries.get(documentId)?.value === value) entries.delete(documentId);
				throw error;
			});
			entries.set(documentId, { revision, value });
			while (entries.size > 3) entries.delete(entries.keys().next().value!);
			return value;
		},
		clear() {
			entries.clear();
		}
	};
}
