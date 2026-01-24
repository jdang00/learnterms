import { QUESTION_TYPES, DISPLAY_QUESTION_TYPES } from '../types';
import type { QuestionType } from '../types';

export function convertToDbFormat(type: string): string {
	if (typeof type !== 'string' || !type.trim()) {
		throw new Error('convertToDbFormat: expected a non-empty string');
	}
	return type.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Convert a database-style question type string into a human-readable, title-cased label.
 *
 * @param type - The question type in database format (e.g., "multiple_choice", "true_false")
 * @returns A display-friendly label with underscores replaced by spaces and each word capitalized (e.g., "Multiple Choice")
 * @throws Error if `type` is not a non-empty string
 */
export function convertToDisplayFormat(type: string): string {
	if (typeof type !== 'string' || !type.trim()) {
		throw new Error('convertToDisplayFormat: expected a non-empty string');
	}
	return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

const TYPE_ABBREVIATIONS: Record<string, string> = {
	multiple_choice: 'MC',
	multiple_select: 'MS',
	true_false: 'T/F',
	fill_in_the_blank: 'FITB',
	matching: 'Match'
};

/**
 * Get the abbreviation for a question type or its display label.
 *
 * @param type - The question type identifier (e.g., `multiple_choice`, `true_false`)
 * @returns The abbreviation for the provided question type; if no mapping exists, the display-formatted type is returned
 */
export function abbreviateType(type: string): string {
	return TYPE_ABBREVIATIONS[type] || convertToDisplayFormat(type);
}

export { QUESTION_TYPES, DISPLAY_QUESTION_TYPES };
export type { QuestionType };