import type { Id } from '../_generated/dataModel';
import { assertStandaloneRationale, hasSourceFraming, shuffleCorrectAnswer } from './presentation';
import { questionTypeLabel } from './questionTypes';
import type { CandidateQuestion, CandidateReview } from './shared';
import { cleanPlainText, normalizeText } from './text';

export function candidateHasProvenanceLanguage(candidate: CandidateQuestion) {
	return [
		candidate.stem,
		candidate.rationale,
		...candidate.options,
		...candidate.correctAnswers
	].some(hasSourceFraming);
}

export function mechanicalCandidateGate(candidate: CandidateQuestion): {
	pass: boolean;
	reasons: string[];
	sourceSupport: CandidateReview['sourceSupport'];
	answerQuality: CandidateReview['answerQuality'];
} {
	const reasons: string[] = [];
	let sourceSupport: CandidateReview['sourceSupport'] = 'strong';
	let answerQuality: CandidateReview['answerQuality'] = 'clear';
	if (candidateHasProvenanceLanguage(candidate)) {
		answerQuality = 'ambiguous';
		reasons.push('Student-facing text includes source/provenance language.');
	}
	if (!candidate.sourceCitations?.length || candidate.sourcePageNumbers.length === 0) {
		sourceSupport = 'weak';
		reasons.push('Missing page-level source citations.');
	}
	if (
		candidate.correctAnswers.length !== 1 ||
		!candidate.options.some(
			(option) => normalizeText(option) === normalizeText(candidate.correctAnswers[0] ?? '')
		)
	) {
		answerQuality = 'ambiguous';
		reasons.push('Correct answer does not match exactly one option.');
	}
	return { pass: reasons.length === 0, reasons, sourceSupport, answerQuality };
}

function generateOptionId(used: Set<string>): string {
	let candidate = '';
	do {
		candidate = `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
	} while (used.has(candidate));
	used.add(candidate);
	return candidate;
}

export function candidateToQuestionInsert(
	candidate: CandidateQuestion,
	moduleId: Id<'module'>,
	order: number,
	previousPositions: number[] = []
) {
	assertStandaloneRationale(candidate.rationale);
	const used = new Set<string>();
	let options = candidate.options.map((text) => ({ id: generateOptionId(used), text }));
	const correctText = normalizeText(candidate.correctAnswers[0] ?? '');
	const correctOption = options.find((option) => normalizeText(option.text) === correctText);
	if (!correctOption) throw new Error('Correct answer must match one option');
	options = shuffleCorrectAnswer(options, options.indexOf(correctOption), previousPositions);

	const stem = cleanPlainText(candidate.stem, 900);
	const rationale = cleanPlainText(candidate.rationale, 1600);
	const searchText = [
		stem,
		rationale,
		'multiple_choice',
		'draft',
		'ai',
		...options.map((option) => option.text),
		correctOption.text,
		candidate.topicTitle,
		candidate.questionType ? questionTypeLabel(candidate.questionType) : ''
	]
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();

	return {
		moduleId,
		type: 'multiple_choice',
		stem,
		options,
		correctAnswers: [correctOption.id],
		rationale,
		aiGenerated: true,
		status: 'draft',
		order,
		metadata: {
			generation: {
				model: candidate.metadata.model,
				jobId: candidate.metadata.jobId,
				harnessVersion: candidate.metadata.harnessVersion,
				reviewMode: candidate.metadata.reviewMode,
				curatorEditedAt: candidate.metadata.curatorEditedAt,
				curatorRevision: candidate.metadata.curatorRevision,
				focus: 'question_studio',
				customPromptUsed: false,
				sourceDocumentId: candidate.metadata.sourceDocumentId,
				sourcePageNumbers: candidate.sourcePageNumbers,
				sourceCitations: candidate.sourceCitations,
				topicTitle: candidate.topicTitle,
				questionType: candidate.questionType,
				reasoningOrder: candidate.reasoningOrder,
				duplicateRisk: candidate.duplicateRisk,
				similarQuestionIds: candidate.similarQuestionIds,
				agentThreadId: candidate.metadata.agentThreadId
			}
		},
		updatedAt: Date.now(),
		searchText
	};
}
