import type { Doc } from '../_generated/dataModel';

// Prompt versions are provenance, not source revisions. Renames must not invalidate maps.
export function isSavedMapForSource(
	map: Doc<'questionStudioTopicMaps'>,
	document: Doc<'contentLib'>
) {
	if (map.deletedAt || document.deletedAt || document.metadata?.ingestionStatus === 'indexing')
		return false;
	if (map.sourceIndexedAt !== undefined)
		return map.sourceIndexedAt === document.metadata?.indexedAt;
	const indexedAt = document.metadata?.indexedAt;
	return indexedAt === undefined || map.sourceDocumentUpdatedAt >= indexedAt;
}
