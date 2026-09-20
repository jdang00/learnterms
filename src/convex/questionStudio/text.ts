export function uniqueSortedNumbers(values: number[]) {
	return [
		...new Set(values.filter((value) => Number.isFinite(value)).map((value) => Math.floor(value)))
	].sort((a, b) => a - b);
}

export function normalizeText(value: string) {
	return String(value ?? '')
		.toLowerCase()
		.replace(/<[^>]*>/g, ' ')
		.replace(/&[a-z0-9#]+;/gi, ' ')
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function cleanPlainText(value: string, maxLength: number) {
	return String(value ?? '')
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, maxLength);
}
