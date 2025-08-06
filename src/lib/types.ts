import type { Doc } from '../convex/_generated/dataModel';

export interface ClassWithSemester extends Doc<'class'> {
	semester: {
		_id: string;
		name: string;
	} | null;
}

export interface CohortInfo {
	cohort: Doc<'cohort'>;
	school: Doc<'school'>;
}

export type ModuleProgress = {
	moduleTitle: string;
	moduleOrder: number;
	totalQuestions: number;
	interactedQuestions: number;
	flaggedQuestions: number;
	masteredQuestions: number;
	completionPercentage: number;
	masteryPercentage: number;
	interactedQuestionIds: string[];
	flaggedQuestionIds: string[];
	masteredQuestionIds: string[];
};

export type ClassProgress = Record<string, ModuleProgress>;

export const QUESTION_TYPES = {
	MULTIPLE_CHOICE: 'multiple_choice',
	TRUE_FALSE: 'true_false'
} as const;

export const DISPLAY_QUESTION_TYPES = {
	[QUESTION_TYPES.MULTIPLE_CHOICE]: 'Multiple Choice',
	[QUESTION_TYPES.TRUE_FALSE]: 'True/False'
} as const;

export type QuestionType = typeof QUESTION_TYPES[keyof typeof QUESTION_TYPES];
