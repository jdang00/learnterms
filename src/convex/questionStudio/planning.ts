import {
	questionTypeLabel,
	questionTypes,
	type QuestionCounts,
	type QuestionType
} from './questionTypes';
import type {
	GenerationPlan,
	LiveWorkerTask,
	LiveWorkerTopicAllocation,
	StoredMarkdownPage,
	TopicMapItem
} from './shared';
import { MAX_GENERATED_QUESTIONS, MAX_QUESTIONS_PER_WORKER } from './shared';
import { cleanPlainText, normalizeText } from './text';

export function validateCounts(counts: QuestionCounts) {
	if (questionTypes.some((type) => !Number.isInteger(counts[type]) || counts[type] < 0))
		throw new Error('Question counts must be non-negative whole numbers');
	const total = questionTypes.reduce((sum, type) => sum + counts[type], 0);
	if (total < 1 || total > MAX_GENERATED_QUESTIONS)
		throw new Error(`Create between 1 and ${MAX_GENERATED_QUESTIONS} questions`);
	return { counts, total };
}

export function buildLiveGenerationWork(
	topics: TopicMapItem[],
	counts: QuestionCounts
): { plan: GenerationPlan; tasks: LiveWorkerTask[] } {
	const orderCounts = {
		learn: 0,
		clinical: 0,
		criticalThinking: 0
	};
	const pickTopicPool = (order: QuestionType) => {
		const ranked = [...topics].sort((a, b) => {
			const aPreferred = a.suggestedTypes?.includes(order) ? 1 : 0;
			const bPreferred = b.suggestedTypes?.includes(order) ? 1 : 0;
			if (aPreferred !== bPreferred) return bPreferred - aPreferred;
			if (a.estimatedQuestionCapacity !== b.estimatedQuestionCapacity) {
				return b.estimatedQuestionCapacity - a.estimatedQuestionCapacity;
			}
			return a.title.localeCompare(b.title);
		});
		const preferred = ranked.filter(
			(topic) => topic.suggestedTypes === undefined || topic.suggestedTypes.includes(order)
		);
		return preferred;
	};

	const tasks: LiveWorkerTask[] = [];
	const unsupported: string[] = [];
	const assignedByTopic = new Map<string, number>();
	for (const order of ['learn', 'clinical', 'criticalThinking'] as const) {
		let remaining = counts[order];
		if (remaining <= 0) continue;
		const pool = pickTopicPool(order);
		const capacity = (topic: TopicMapItem) =>
			Math.min(
				topic.estimatedQuestionCapacity,
				Math.max(
					1,
					new Set(topic.learningObjectives.map((objective) => cleanPlainText(objective, 200))).size
				)
			);
		if (!pool.length) {
			unsupported.push(
				`${questionTypeLabel(order)}: ${remaining} requested questions could not be assigned because the selected material does not support this type.`
			);
			continue;
		}
		let cursor = 0;
		while (remaining > 0) {
			const available = pool.filter(
				(topic) => (assignedByTopic.get(topic.topicId) ?? 0) < capacity(topic)
			);
			if (!available.length) {
				unsupported.push(
					`${questionTypeLabel(order)}: ${remaining} requested questions exceed the remaining distinct objectives. Request fewer questions or select more topics.`
				);
				break;
			}
			const plannedCount = Math.min(
				MAX_QUESTIONS_PER_WORKER,
				remaining,
				available.reduce(
					(sum, topic) => sum + capacity(topic) - (assignedByTopic.get(topic.topicId) ?? 0),
					0
				)
			);
			const allocationsByTopic = new Map<string, LiveWorkerTopicAllocation>();
			for (let slotIndex = 0; slotIndex < plannedCount; slotIndex += 1) {
				const eligible = pool.filter(
					(topic) => (assignedByTopic.get(topic.topicId) ?? 0) < capacity(topic)
				);
				const topic = eligible[cursor % eligible.length];
				assignedByTopic.set(topic.topicId, (assignedByTopic.get(topic.topicId) ?? 0) + 1);
				const existing = allocationsByTopic.get(topic.topicId);
				if (existing) existing.plannedCount += 1;
				else allocationsByTopic.set(topic.topicId, { topic, plannedCount: 1 });
				cursor += 1;
			}
			orderCounts[order] += 1;
			const topicAllocations = [...allocationsByTopic.values()];
			tasks.push({
				taskId: `${order}:batch:${orderCounts[order]}`,
				topicAllocations,
				counts: {
					learn: order === 'learn' ? plannedCount : 0,
					clinical: order === 'clinical' ? plannedCount : 0,
					criticalThinking: order === 'criticalThinking' ? plannedCount : 0
				},
				plannedCount,
				questionType: order
			});
			remaining -= plannedCount;
		}
	}

	const workerBatches = tasks.map((task) => ({
		taskId: task.taskId,
		label: taskLabel(task),
		plannedCount: task.plannedCount,
		questionType: task.questionType,
		topicCount: task.topicAllocations.length,
		topicTitles: task.topicAllocations.map((allocation) => allocation.topic.title),
		sourcePages: taskPageNumbers(task)
	}));
	const topicAllocations = tasks.flatMap((task) =>
		task.topicAllocations.map((allocation) => ({
			taskId: task.taskId,
			topicId: allocation.topic.topicId,
			topicTitle: allocation.topic.title,
			plannedCount: allocation.plannedCount,
			questionType: task.questionType,
			sourcePages: allocation.topic.pageNumbers,
			notes: `Assigned to ${taskLabel(task)}.`
		}))
	);
	return {
		tasks,
		plan: {
			workerBatches,
			topicAllocations,
			coverageNotes: [
				`Packed ${tasks.reduce((sum, task) => sum + task.plannedCount, 0)} requested questions into ${tasks.length} worker${tasks.length === 1 ? '' : 's'} with up to ${MAX_QUESTIONS_PER_WORKER} questions each while rotating topic coverage within each batch.`
			],
			riskNotes: unsupported
		}
	};
}

export function taskLabel(task: LiveWorkerTask) {
	if (task.topicAllocations.length === 1) {
		return `${questionTypeLabel(task.questionType)}: ${task.topicAllocations[0].topic.title}`;
	}
	return `${questionTypeLabel(task.questionType)} batch (${task.topicAllocations.length} topics)`;
}

export function taskPageNumbers(task: LiveWorkerTask) {
	return [
		...new Set(task.topicAllocations.flatMap((allocation) => allocation.topic.pageNumbers))
	].sort((a, b) => a - b);
}

function buildTopicId(title: string, index: number) {
	const slug = normalizeText(title).replace(/\s+/g, '-').slice(0, 48);
	return slug ? `${slug}-${index + 1}` : `topic-${index + 1}`;
}

export function clampTopic(
	topic: TopicMapItem,
	pages: StoredMarkdownPage[],
	index: number
): TopicMapItem {
	const pageSet = new Set(pages.map((page) => page.pageNumber));
	const pageNumbers = topic.pageNumbers.filter((page) => pageSet.has(page));
	return {
		topicId: topic.topicId || buildTopicId(topic.title, index),
		title: cleanPlainText(topic.title, 120),
		summary: cleanPlainText(topic.summary, 900),
		pageNumbers: pageNumbers.length > 0 ? pageNumbers : [pages[0].pageNumber],
		learningObjectives: topic.learningObjectives
			.map((item) => cleanPlainText(item, 180))
			.slice(0, 6),
		keyTerms: topic.keyTerms.map((item) => cleanPlainText(item, 80)).slice(0, 12),
		suggestedTypes:
			topic.suggestedTypes === undefined
				? undefined
				: [...new Set(topic.suggestedTypes)].slice(0, 3),
		estimatedQuestionCapacity: Math.max(
			1,
			Math.min(10, Math.floor(topic.estimatedQuestionCapacity))
		)
	};
}
