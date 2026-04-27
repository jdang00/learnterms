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

export function getRationalePlainText(value: string | null | undefined): string {
	const normalized = normalizeRationaleValue(value);
	if (!normalized) return '';

	return normalized
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/\s+/g, ' ')
		.trim();
}

export function getRationale(value?: WithLegacyRationale | null): string {
	if (!value) return '';
	return normalizeRationaleValue(value.rationale) || normalizeRationaleValue(value.explanation);
}

export function hasRationale(value?: WithLegacyRationale | null): boolean {
	return getRationalePlainText(getRationale(value)).length > 0;
}
