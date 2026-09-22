export const acceptanceLevels = {
	lenient: {
		label: 'Lenient',
		description: 'Accept the main idea. Allow minor omissions and imprecise wording.'
	},
	balanced: {
		label: 'Balanced',
		description: 'Require the key points, with room for equivalent wording.'
	},
	strict: { label: 'Strict', description: 'Require all requested details and precise reasoning.' }
} as const;
export type AcceptanceLevel = keyof typeof acceptanceLevels;
export type FreeResponseGrade = {
	isCorrect: boolean;
	feedback: string;
	comparison: string;
	response: string;
};
export const MAX_RESPONSE_WORDS = 1500;
// Bound transport and storage independently of the learner-facing word limit.
export const MAX_RESPONSE_CHARACTERS = 100000;
export function responseText(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '')
		.replace(/<\/?(?:p|div|br|li|ul|ol|h[1-6]|blockquote|pre)\b[^>]*>/gi, ' ')
		.replace(/<\/?[a-z][^>]*>/gi, '')
		.replace(
			/&(nbsp|lt|gt|quot|apos|amp);|&#(x[0-9a-f]+|[0-9]+);/gi,
			(match, name: string, value: string) => {
				if (name)
					return (
						{ nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' } as Record<
							string,
							string
						>
					)[name.toLowerCase()];
				const code = value[0].toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : Number(value);
				return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
			}
		)
		.replace(/[\u200b-\u200d\ufeff]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}
export function responseWordCount(html: string): number {
	const text = responseText(html);
	return text ? text.split(/\s+/).length : 0;
}
