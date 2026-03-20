import type { Component, Course, CourseInputs } from '../types';

type GroupTotals = {
	earned: number;
	total: number;
	droppedIndices: number[];
};

export function calculatePointsBasedGrade(course: Course, userInputs: CourseInputs) {
	let earnedPoints = 0;
	let totalPoints = 0;

	for (const component of course.components) {
		if (component.type === 'single') {
			const input = userInputs[component.id];
			const earned =
				input && 'earnedPoints' in input ? (input.earnedPoints ?? null) : null;
			if (earned !== null && component.maxPoints) {
				earnedPoints += clampToRange(earned, 0, component.maxPoints);
				totalPoints += component.maxPoints;
			}
		} else if (component.type === 'group') {
			const input = userInputs[component.id];
			const result = calculateGroupComponentPoints(component, input);
			earnedPoints += result.earned;
			totalPoints += result.total;
		}
	}

	const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

	return {
		earnedPoints,
		totalPoints,
		percentage
	};
}

export function calculateGroupComponentPoints(
	component: Component,
	input: CourseInputs[keyof CourseInputs] | undefined
): GroupTotals {
	if (!input || !('instances' in input) || !Array.isArray(input.instances)) {
		return { earned: 0, total: 0, droppedIndices: [] };
	}

	const pointsPerInstance = component.pointsPerInstance ?? 0;
	const graded = input.instances
		.map((inst, idx) => {
			const earned = inst?.earnedPoints ?? null;
			if (earned === null) return null;
			const clamped = clampToRange(earned, 0, pointsPerInstance);
			return {
				index: idx,
				earned: clamped,
				max: pointsPerInstance,
				percentage: pointsPerInstance > 0 ? (clamped / pointsPerInstance) * 100 : 0
			};
		})
		.filter(Boolean) as Array<{
		index: number;
		earned: number;
		max: number;
		percentage: number;
	}>;

	if (graded.length === 0) {
		return { earned: 0, total: 0, droppedIndices: [] };
	}

	const toDrop = Math.min(component.dropLowest ?? 0, graded.length);
	if (toDrop <= 0) {
		const earned = graded.reduce((s, g) => s + g.earned, 0);
		const total = graded.reduce((s, g) => s + g.max, 0);
		return { earned, total, droppedIndices: [] };
	}

	graded.sort((a, b) => a.percentage - b.percentage);
	const dropped = graded.slice(0, toDrop);
	const kept = graded.slice(toDrop);
	const earned = kept.reduce((s, g) => s + g.earned, 0);
	const total = kept.reduce((s, g) => s + g.max, 0);
	return { earned, total, droppedIndices: dropped.map((d) => d.index) };
}

export function getLetterGrade(percentage: number, course: Course): 'A' | 'B' | 'C' | 'F' {
	if (percentage >= course.gradingScale.A.min) return 'A';
	if (percentage >= course.gradingScale.B.min) return 'B';
	if (percentage >= course.gradingScale.C.min) return 'C';
	return 'F';
}

function clampToRange(value: number, min: number, max: number) {
	if (Number.isNaN(value)) return min;
	return Math.min(Math.max(value, min), max);
}


