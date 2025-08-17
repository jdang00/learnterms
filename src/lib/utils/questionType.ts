import { QUESTION_TYPES, DISPLAY_QUESTION_TYPES } from '../types';
import type { QuestionType } from '../types';

export function convertToDbFormat(type: string): string {
	if (typeof type !== 'string' || !type.trim()) {
		throw new Error('convertToDbFormat: expected a non-empty string');
	}
	return type.toLowerCase().replace(/\s+/g, '_');
}

export function convertToDisplayFormat(type: string): string {
	if (typeof type !== 'string' || !type.trim()) {
		throw new Error('convertToDisplayFormat: expected a non-empty string');
	}
	return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export { QUESTION_TYPES, DISPLAY_QUESTION_TYPES };
export type { QuestionType };
