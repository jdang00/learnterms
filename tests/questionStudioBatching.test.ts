import { describe, expect, test } from 'bun:test';
import {
	buildLiveGenerationWork,
	generationWorkerLanes
} from '../src/convex/questionStudio/planning';
import type { TopicMapItem } from '../src/convex/questionStudio/shared';
import type { QuestionType } from '../src/convex/questionStudio/questionTypes';

function topic(index: number, suggestedTypes: QuestionType[]): TopicMapItem {
	return {
		topicId: `topic-${index}`,
		title: `Topic ${index}`,
		summary: `Summary ${index}`,
		pageNumbers: [index],
		keyTerms: [`term-${index}`],
		learningObjectives: [1, 2, 3].map((n) => `Objective ${index}.${n}`),
		estimatedQuestionCapacity: 3,
		suggestedTypes
	};
}

describe('Question Studio worker batching', () => {
	test('five bounded lanes cover every task exactly once, including tail workers', () => {
		const topics = Array.from({ length: 30 }, (_, index) =>
			topic(index + 1, ['learn', 'clinical', 'criticalThinking'])
		);
		for (const counts of [
			{ learn: 1, clinical: 0, criticalThinking: 0 },
			{ learn: 12, clinical: 3, criticalThinking: 0 },
			{ learn: 10, clinical: 10, criticalThinking: 10 }
		]) {
			const { tasks } = buildLiveGenerationWork(topics, counts);
			const lanes = generationWorkerLanes(tasks);
			expect(lanes).toHaveLength(Math.min(5, tasks.length));
			const scheduled = lanes
				.flatMap((lane) =>
					[lane.task, ...lane.remainingTasks].map((task, offset) => ({
						task,
						index: lane.workerIndex + offset * lane.workerStride
					}))
				)
				.sort((a, b) => a.index - b.index);
			expect(scheduled.map(({ index }) => index)).toEqual(tasks.map((_, index) => index));
			expect(scheduled.map(({ task }) => task)).toEqual(tasks);
		}
	});
	test('does not force clinical scenarios onto nonclinical topics', () => {
		const { tasks, plan } = buildLiveGenerationWork([topic(1, ['learn'])], {
			learn: 1,
			clinical: 2,
			criticalThinking: 0
		});
		expect(tasks.map((task) => task.questionType)).toEqual(['learn']);
		expect(plan.riskNotes.join(' ')).toContain(
			'Clinical: 2 requested questions could not be assigned'
		);
	});

	test('does not reuse exhausted objectives to fill a requested count', () => {
		const { tasks, plan } = buildLiveGenerationWork(
			[{ ...topic(1, ['learn']), learningObjectives: ['One concept', 'One concept'] }],
			{ learn: 10, clinical: 0, criticalThinking: 0 }
		);
		expect(tasks.reduce((sum, task) => sum + task.plannedCount, 0)).toBe(1);
		expect(plan.riskNotes.join(' ')).toContain('9 requested questions exceed');
	});
	test('packs ten questions into four workers even when many topics are available', () => {
		const topics = Array.from({ length: 10 }, (_, index) =>
			topic(index + 1, ['learn', 'clinical', 'criticalThinking'])
		);
		const { tasks } = buildLiveGenerationWork(topics, {
			learn: 3,
			clinical: 4,
			criticalThinking: 3
		});

		expect(tasks.map((task) => task.plannedCount)).toEqual([3, 3, 1, 3]);
		expect(tasks.map((task) => task.questionType)).toEqual([
			'learn',
			'clinical',
			'clinical',
			'criticalThinking'
		]);
		expect(tasks.every((task) => task.topicAllocations.length <= 3)).toBe(true);
		expect(
			tasks.every(
				(task) =>
					task.topicAllocations.reduce((sum, allocation) => sum + allocation.plannedCount, 0) ===
					task.plannedCount
			)
		).toBe(true);
	});

	test('rotates a small topic pool within packed workers', () => {
		const topics = [topic(1, ['learn']), topic(2, ['learn'])];
		const { tasks } = buildLiveGenerationWork(topics, {
			learn: 5,
			clinical: 0,
			criticalThinking: 0
		});

		expect(tasks.map((task) => task.plannedCount)).toEqual([3, 2]);
		expect(
			tasks.map((task) =>
				task.topicAllocations.map((allocation) => [
					allocation.topic.topicId,
					allocation.plannedCount
				])
			)
		).toEqual([
			[
				['topic-1', 2],
				['topic-2', 1]
			],
			[
				['topic-2', 1],
				['topic-1', 1]
			]
		]);
	});
});

test('legacy maps defer type suitability to drafting and review without another map', () => {
	const legacy = { ...topic(1, []), suggestedTypes: undefined };
	const { tasks } = buildLiveGenerationWork([legacy], {
		learn: 1,
		clinical: 1,
		criticalThinking: 1
	});
	expect(tasks.map((task) => task.questionType)).toEqual(['learn', 'clinical', 'criticalThinking']);
});
