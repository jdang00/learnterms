import type { Component } from '../types';

type InstanceInput = { earnedScore?: number | null };

export function computeReplacementForGroup(
	component: Component,
	instanceInputs: InstanceInput[] | undefined,
	finalExamScore: number | null | undefined,
	finalExamMax: number | null | undefined
) {
	if (!component.replacementRule?.enabled || !instanceInputs || !finalExamScore || !finalExamMax) {
		return { percentages: basePercentages(component, instanceInputs), replacedIndices: [] as number[] };
	}
	const quizMax = component.instances?.[0]?.maxScore ?? 100;
	const finalPct = (clamp(finalExamScore, 0, finalExamMax) / finalExamMax) * 100;
	const rows = instanceInputs
		.map((inst, idx) => {
			const s = inst?.earnedScore ?? null;
			if (s === null || s === undefined) return null;
			const pct = (clamp(s, 0, quizMax) / quizMax) * 100;
			return { idx, pct, improvement: finalPct - pct };
		})
		.filter((r) => r && r.improvement > 0) as Array<{ idx: number; pct: number; improvement: number }>;

	if (rows.length === 0) {
		return { percentages: basePercentages(component, instanceInputs), replacedIndices: [] as number[] };
	}

	rows.sort((a, b) => b.improvement - a.improvement);
	const toReplace = rows.slice(0, component.replacementRule.maxReplacements);

	const base = basePercentages(component, instanceInputs);
	const replacedIndices: number[] = [];
	for (const r of toReplace) {
		base[r.idx] = finalPct;
		replacedIndices.push(r.idx);
	}
	return { percentages: base, replacedIndices };
}

function basePercentages(component: Component, instanceInputs: InstanceInput[] | undefined) {
	const quizMax = component.instances?.[0]?.maxScore ?? 100;
	return (instanceInputs ?? [])
		.map((inst) => {
			const s = inst?.earnedScore ?? null;
			if (s === null || s === undefined) return null;
			return (clamp(s, 0, quizMax) / quizMax) * 100;
		})
		.filter((v) => v !== null) as number[];
}

function clamp(v: number, min: number, max: number) {
	if (Number.isNaN(v)) return min;
	return Math.min(Math.max(v, min), max);
}


