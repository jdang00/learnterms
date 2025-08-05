export function convertToDbFormat(type: string): string {
	return type.toLowerCase().replace(/\s+/g, '_');
}

export function convertToDisplayFormat(type: string): string {
	return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export const QUESTION_TYPES = {
	MULTIPLE_CHOICE: 'multiple_choice',
	TRUE_FALSE: 'true_false'
} as const;

export const DISPLAY_QUESTION_TYPES = {
	[QUESTION_TYPES.MULTIPLE_CHOICE]: 'Multiple Choice',
	[QUESTION_TYPES.TRUE_FALSE]: 'True/False'
} as const; 