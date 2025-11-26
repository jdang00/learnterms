import type { Component, Course, CourseInputs } from '../types';
import { computeReplacementForGroup } from './replacement';

function clampToRange(value: number, min: number, max: number) {
	if (Number.isNaN(value)) return min;
	return Math.min(Math.max(value, min), max);
}

export function computeQuizAverageWithReplacement(
	course: Course,
	userInputs: CourseInputs,
	quizComponentId: string
): number | null {
	const quizzes = course.components.find((c) => c.id === quizComponentId);
	if (!quizzes || quizzes.type !== 'group') return null;
	const quizInputs = (userInputs[quizzes.id] as any)?.instances;
	if (!quizInputs) return null;
	const finalId = quizzes.replacementRule?.enabled ? quizzes.replacementRule.sourceComponentId : null;
	if (finalId) {
		const finalComp = course.components.find((c) => c.id === finalId);
		const finalScore: number | null = (userInputs[finalId] as any)?.earnedScore ?? null;
		const finalMax: number | undefined = finalComp?.maxScore ?? undefined;
		const preview = computeReplacementForGroup(quizzes, quizInputs, finalScore, finalMax ?? null);
		const values = preview.percentages;
		if (values.length === 0) return null;
		return values.reduce((a, b) => a + b, 0) / values.length;
	}
	const max = quizzes.instances?.[0]?.maxScore ?? 100;
	const values = quizInputs
		.map((inst: any) => {
			const s = inst?.earnedScore ?? null;
			if (s === null || s === undefined) return null;
			return (clampToRange(s, 0, max) / max) * 100;
		})
		.filter((v: number | null) => v !== null) as number[];
	if (values.length === 0) return null;
	return values.reduce((a: number, b: number) => a + b, 0) / values.length;
}

export function applyBonusToFinal(
	course: Course,
	userInputs: CourseInputs,
	finalComponent: Component
): { bonusAmount: number; finalPct: number } | null {
	if (finalComponent.type !== 'single' || !finalComponent.bonusRule?.enabled || !finalComponent.maxScore) {
		return null;
	}
	const finalScore: number | null = (userInputs[finalComponent.id] as any)?.earnedScore ?? null;
	if (finalScore === null) return null;
	const finalPctBase = (clampToRange(finalScore, 0, finalComponent.maxScore) / finalComponent.maxScore) * 100;

	const sources = finalComponent.bonusRule.sourceComponentIds ?? [];
	if (sources.length === 0) return { bonusAmount: 0, finalPct: finalPctBase };
	// For now, use the first source id (doc uses 'quizzes')
	const quizzesAvg = computeQuizAverageWithReplacement(course, userInputs, sources[0]);
	if (quizzesAvg === null) return { bonusAmount: 0, finalPct: finalPctBase };

	if (quizzesAvg > finalPctBase) {
		const potential = quizzesAvg - finalPctBase;
		const actual = Math.min(potential, finalComponent.bonusRule.maxBonus);
		return { bonusAmount: actual, finalPct: Math.min(100, finalPctBase + actual) };
	}
	return { bonusAmount: 0, finalPct: finalPctBase };
}


