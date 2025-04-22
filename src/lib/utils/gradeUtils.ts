// src/lib/utils/gradeUtils.ts
import type { Course } from '$lib/models';

export interface FinalResult {
	value: number; // percent or points
	letter: string;
}

export function computeFinal(course: Course): FinalResult {
	let finalValue: number;

	if (course.gradingMethod === 'percent') {
		// Sum each category’s weighted % contribution
		finalValue = course.categories.reduce((sum, cat) => {
			// filter valid assessments
			const valid = cat.assessments.filter(
				(a) =>
					a.score !== null && a.total !== null && a.total > 0 && a.score >= 0 && a.score <= a.total
			);
			const totalScore = valid.reduce((s, a) => s + (a.score as number), 0);
			const totalPossible = valid.reduce((s, a) => s + (a.total as number), 0);
			const pct = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
			// weightValue is e.g. 20 (%) → scale by /100
			return sum + (pct * cat.weightValue) / 100;
		}, 0);
	} else {
		// points-based: just sum earned points across all categories
		finalValue = course.categories.reduce((sum, cat) => {
			const valid = cat.assessments.filter((a) => a.score !== null && a.score >= 0);
			const totalScore = valid.reduce((s, a) => s + (a.score as number), 0);
			return sum + totalScore;
		}, 0);
	}

	// determine letter grade from gradingScale
	// sort descending by min threshold so highest letters checked first
	const sorted = [...course.gradingScale].sort((a, b) => b.min - a.min);
	let letter = 'F';
	for (const thr of sorted) {
		if (finalValue >= thr.min && (thr.max === undefined || finalValue <= thr.max)) {
			letter = thr.letter;
			break;
		}
	}

	return { value: finalValue, letter };
}
