import { getRationale } from './rationale';
import type { Doc } from '../../convex/_generated/dataModel';
import { stemFingerprint } from './stemHighlights';

export const MASTERY_INTERVAL_MS = 30 * 60 * 1000;
export type StudyEvidence = {
	questionId: string;
	checkedAt?: number;
	latestCorrect?: boolean;
	cleanRecallCount: number;
	firstCleanAt?: number;
	masteredAt?: number;
	lastMasteredAt?: number;
	needsFreshEvidence?: boolean;
	activeAttemptChecks?: number;
	activeAttemptRevealed?: boolean;
};

// Free-response rationales define the answer, so changing them invalidates grading evidence.
// Rationales for other question types do not affect correctness.
export async function questionVersion(
	question: Pick<
		Doc<'question'>,
		| 'stem'
		| 'type'
		| 'options'
		| 'correctAnswers'
		| 'freeResponseAcceptance'
		| 'rationale'
		| 'explanation'
	>
) {
	return stemFingerprint(
		JSON.stringify({
			stem: question.stem,
			...(question.type === 'free_response'
				? {
						acceptance: question.freeResponseAcceptance ?? 'lenient',
						groundTruth: getRationale(question)
					}
				: {}),
			type: question.type,
			options:
				question.type === 'matching'
					? question.options
					: [...question.options].sort((a, b) => a.id.localeCompare(b.id)),
			correctAnswers:
				question.type === 'matching' ? question.correctAnswers : [...question.correctAnswers].sort()
		})
	);
}

export function recordRecall(
	previous: StudyEvidence,
	isCorrect: boolean,
	qualifyingRecall: boolean,
	now: number
): StudyEvidence {
	const next = { ...previous, checkedAt: now, latestCorrect: isCorrect, needsFreshEvidence: false };
	if (!isCorrect)
		return { ...next, cleanRecallCount: 0, firstCleanAt: undefined, masteredAt: undefined };
	if (!qualifyingRecall || next.masteredAt !== undefined) return next;
	if (next.firstCleanAt === undefined) return { ...next, cleanRecallCount: 1, firstCleanAt: now };
	if (now - next.firstCleanAt < MASTERY_INTERVAL_MS) return next;
	return { ...next, cleanRecallCount: 2, masteredAt: now, lastMasteredAt: now };
}
