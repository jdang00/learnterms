import type { Course, CourseInputs } from '../types';
import { computeReplacementForGroup } from './replacement';
import { applyBonusToFinal } from './bonus';

export function calculatePercentageBasedGrade(course: Course, userInputs: CourseInputs) {
	let weightedSum = 0;
	let totalWeight = 0;

	for (const component of course.components) {
		const input = userInputs[component.id] as any;

		if (component.type === 'single' && component.weight && component.maxScore) {
			const hasBonus = !!component.bonusRule?.enabled;
			if (hasBonus) {
				const res = applyBonusToFinal(course, userInputs, component);
				if (res) {
					weightedSum += res.finalPct * (component.weight / 100);
					totalWeight += component.weight;
				}
			} else {
				const score: number | null = input?.earnedScore ?? null;
				if (score !== null) {
					const pct = (clampToRange(score, 0, component.maxScore) / component.maxScore) * 100;
					weightedSum += pct * (component.weight / 100);
					totalWeight += component.weight;
				}
			}
		} else if (component.type === 'group' && component.weight) {
			let averagePercentage = 0;
			let hasScores = false;
			if (component.replacementRule?.enabled) {
				const source = course.components.find((c) => c.id === component.replacementRule?.sourceComponentId);
				const finalScore: number | null = (userInputs[source?.id ?? ''] as any)?.earnedScore ?? null;
				const finalMax: number | undefined = source?.maxScore ?? undefined;
				const preview = computeReplacementForGroup(
					component,
					input?.instances,
					finalScore,
					finalMax ?? null
				);
				const values = preview.percentages;
				if (values.length > 0) {
					averagePercentage = values.reduce((s, v) => s + v, 0) / values.length;
					hasScores = true;
				}
			} else {
				const avg = averageGroupPercentage(component.instances ?? [], input?.instances);
				averagePercentage = avg.averagePercentage;
				hasScores = avg.hasScores;
			}
			if (hasScores) {
				weightedSum += averagePercentage * (component.weight / 100);
				totalWeight += component.weight;
			}
		} else if (component.type === 'attendance' && component.weight && component.sessionsTotal) {
			const attended: number | null = input?.sessionsAttended ?? null;
			if (attended !== null) {
				const pct = (clampToRange(attended, 0, component.sessionsTotal) / component.sessionsTotal) * 100;
				weightedSum += pct * (component.weight / 100);
				totalWeight += component.weight;
			}
		}
	}

	const percentage = totalWeight > 0 ? weightedSum / (totalWeight / 100) : 0;
	return {
		percentage,
		weightedSum,
		totalWeight
	};
}

export function averageGroupPercentage(
	templateInstances: Array<{ maxScore?: number }>,
	instanceInputs?: Array<{ earnedScore?: number | null }>
) {
	if (!instanceInputs || instanceInputs.length === 0) {
		return { averagePercentage: 0, hasScores: false };
	}
	const max = templateInstances?.[0]?.maxScore ?? 100;
	const values = instanceInputs
		.map((inst) => {
			const s = inst?.earnedScore ?? null;
			if (s === null || s === undefined) return null;
			return (clampToRange(s, 0, max) / max) * 100;
		})
		.filter((v) => v !== null) as number[];
	if (values.length === 0) {
		return { averagePercentage: 0, hasScores: false };
	}
	const avg = values.reduce((a, b) => a + b, 0) / values.length;
	return { averagePercentage: avg, hasScores: true };
}

function clampToRange(value: number, min: number, max: number) {
	if (Number.isNaN(value)) return min;
	return Math.min(Math.max(value, min), max);
}


