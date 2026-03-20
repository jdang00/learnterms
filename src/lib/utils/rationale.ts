export type WithLegacyRationale = {
	rationale?: string | null;
	explanation?: string | null;
};

function normalizeRationaleValue(value: string | null | undefined): string {
	if (typeof value !== 'string') return '';
	const trimmed = value.trim();
	if (!trimmed) return '';
	const normalized = trimmed.toLowerCase();
	if (normalized === 'undefined' || normalized === 'null') return '';
	return trimmed;
}

export function getRationale(value?: WithLegacyRationale | null): string {
	if (!value) return '';
	return normalizeRationaleValue(value.rationale) || normalizeRationaleValue(value.explanation);
}

export function hasRationale(value?: WithLegacyRationale | null): boolean {
	return getRationale(value).length > 0;
}
