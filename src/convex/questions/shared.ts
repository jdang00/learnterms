import type { Infer } from 'convex/values';
import { responseText } from '../../lib/utils/freeResponse';
import {
	examFindingsText,
	normalizeExamFindings,
	type ExamFinding
} from '../../lib/examFindings/findings';
import { getRationale } from '../../lib/utils/rationale';
import {
	answerPosition,
	assertStandaloneRationale,
	shuffleCorrectAnswer
} from '../questionStudio/presentation';
import { applyQuestionCreationDeltaAndEvaluateBadges } from '../badgeEngine';
import { manualQuestionSource } from '../schema';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { convertQuestionType } from './options';

// Modules are capped at MAX_QUESTIONS_PER_MODULE, so a per-module read never needs more than this.
export const MODULE_QUESTION_READ_LIMIT = 1000;

// Resolve the title on the server and keep source access within the destination cohort.
export async function validateManualSource(
	ctx: MutationCtx,
	moduleId: Id<'module'>,
	source: Infer<typeof manualQuestionSource>
) {
	const module = await ctx.db.get(moduleId);
	const classDoc = module ? await ctx.db.get(module.classId) : null;
	const document = await ctx.db.get(source.sourceDocumentId);
	if (
		!document ||
		document.deletedAt ||
		document.cohortId !== classDoc?.cohortId ||
		document.metadata?.storageProvider !== 'r2' ||
		!['indexed', 'mapped'].includes(document.metadata.ingestionStatus ?? '')
	) {
		throw new Error('Source document is unavailable or belongs to another cohort.');
	}
	const pages = [...new Set(source.sourcePageNumbers)].sort((a, b) => a - b);
	const pageCount = document.metadata.pageCount;
	if (
		!pageCount ||
		!pages.length ||
		pages.length > pageCount ||
		pages.some((page) => !Number.isInteger(page) || page < 1 || page > pageCount)
	) {
		throw new Error('Select valid pages from the source document.');
	}
	return { sourceDocumentId: document._id, sourcePageNumbers: pages, sourceTitle: document.title };
}

export const MAX_QUESTIONS_PER_MODULE = 150;

export async function prepareAiPublication(
	ctx: MutationCtx,
	question: {
		_id: Id<'question'>;
		moduleId: Id<'module'>;
		order: number;
		type: string;
		aiGenerated: boolean;
		status: string;
		options: { id: string; text: string }[];
		correctAnswers: string[];
	},
	rationale: string,
	nextStatus: string
) {
	if (!question.aiGenerated || nextStatus !== 'published') return question.options;
	assertStandaloneRationale(rationale);
	if (
		question.status === 'published' ||
		question.type !== 'multiple_choice' ||
		question.correctAnswers.length !== 1
	)
		return question.options;
	const neighbors = (
		await ctx.db
			.query('question')
			.withIndex('by_moduleId_order', (q) => q.eq('moduleId', question.moduleId))
			.take(MAX_QUESTIONS_PER_MODULE + 1)
	).filter((q) => !q.deletedAt && q.status === 'published' && q._id !== question._id);
	const before = neighbors.filter((q) => q.order < question.order).map(answerPosition);
	const after = neighbors.filter((q) => q.order >= question.order).map(answerPosition);
	return shuffleCorrectAnswer(question.options, answerPosition(question), before, after);
}

export async function checkModuleCapacity(
	ctx: MutationCtx,
	moduleId: Id<'module'>,
	countToAdd: number
): Promise<void> {
	const module = await ctx.db.get(moduleId);
	if (!module) throw new Error('Module not found');

	const currentCount = module.questionCount ?? 0;

	if (currentCount + countToAdd > MAX_QUESTIONS_PER_MODULE) {
		throw new Error(
			`Module limit reached (${MAX_QUESTIONS_PER_MODULE} questions). Please split this module for better learning retention.`
		);
	}
}

export const publishedUnits = (status: string) => (status === 'published' ? 1 : 0);

export async function applyQuestionCreationBadgesForActor(
	ctx: MutationCtx,
	actor: Doc<'users'>,
	moduleId: Id<'module'>,
	questionsCreatedDelta: number
): Promise<void> {
	if (questionsCreatedDelta <= 0) return;
	const module = await ctx.db.get(moduleId);
	if (!module) return;
	await applyQuestionCreationDeltaAndEvaluateBadges(ctx, {
		userId: actor._id,
		classId: module.classId,
		questionsCreatedDelta,
		occurredAt: Date.now()
	});
}

export function computeSearchText(input: {
	stem: string;
	rationale?: string | null;
	freeResponseAcceptance?: 'lenient' | 'balanced' | 'strict';
	explanation?: string | null;
	type: string;
	status: string;
	aiGenerated: boolean;
	options: Array<{ id?: string; text: string }>;
	correctAnswers: Array<string>;
	metadata?: { generation?: { model: string; focus: string; customPromptUsed: boolean } };
	examFindings?: ExamFinding[];
}): string {
	const parts: Array<string> = [];
	parts.push(input.stem || '');
	parts.push(examFindingsText(input.examFindings));
	const rationale = getRationale(input);
	if (rationale) parts.push(rationale);
	parts.push(convertQuestionType(input.type));
	parts.push((input.status || '').toLowerCase());
	parts.push(input.aiGenerated ? 'ai' : 'user');
	for (const opt of input.options || []) parts.push(opt.text || '');
	if (input.correctAnswers && input.correctAnswers.length > 0)
		parts.push(input.correctAnswers.join(' '));
	if (input.metadata?.generation) {
		const g = input.metadata.generation;
		parts.push(g.model || '');
		parts.push(g.focus || '');
		if (g.customPromptUsed) parts.push('custom');
	}
	return parts.join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

// Exam findings are in beta and limited to manually written questions.
export function manualExamFindings(aiGenerated: boolean, findings: ExamFinding[] | undefined) {
	const normalized = normalizeExamFindings(findings);
	if (normalized && aiGenerated)
		throw new Error('Exam findings are only available on manually written questions.');
	return normalized;
}

export function normalizeIncomingRationale(input: {
	type?: string;
	rationale?: string | null;
	freeResponseAcceptance?: 'lenient' | 'balanced' | 'strict';
	explanation?: string | null;
}): string {
	const rationale = getRationale(input);
	if (input.type === 'free_response' && (!responseText(rationale) || rationale.length > 10000))
		throw new Error(
			'Free response requires a rationale of up to 10,000 characters as its ground truth.'
		);
	return rationale;
}
