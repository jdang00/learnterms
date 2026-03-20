export type WithLegacyRationale = {
	rationale?: string | null;
	explanation?: string | null;
};

export function getRationale(value?: WithLegacyRationale | null): string {
	if (!value) return '';
	if (typeof value.rationale === 'string') return value.rationale;
	if (typeof value.explanation === 'string') return value.explanation;
	return '';
}

export function hasRationale(value?: WithLegacyRationale | null): boolean {
	const normalized = getRationale(value).trim().toLowerCase();
	return normalized.length > 0 && normalized !== 'undefined' && normalized !== 'null';
}
