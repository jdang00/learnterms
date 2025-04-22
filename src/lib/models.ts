// src/lib/models.ts

export interface Assessment {
	id: string;
	score: number | null;
	total: number | null;
}

export type WeightType = 'percent' | 'points';

export interface Category {
	id: string;
	name: string; // e.g. “Lecture Exams”
	weightType: WeightType; // percent or points
	weightValue: number; // if percent: 30; if points: 300
	assessments: Assessment[];
	dropLowest?: number; // optional rule
}

export interface LetterThreshold {
	letter: string; // “A”, “B”, etc.
	min: number; // e.g. 89.5 (percent) or 520 (points)
	max?: number; // optional upper bound
}

export interface Course {
	id: string;
	name: string;
	gradingMethod: WeightType; // overall scheme
	categories: Category[];
	gradingScale: LetterThreshold[];
}
