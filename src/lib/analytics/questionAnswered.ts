import { browser } from '$app/environment';
import { getPostHog } from './posthogClient';

type SubmissionSource = 'button' | 'keyboard' | 'mobile';

type QuestionAnsweredPayload = {
	questionId: string;
	moduleId: string;
	classId: string;
	questionType: string;
	selectedOptions: string[];
	eliminatedOptions: string[];
	isCorrect: boolean;
	submissionSource: SubmissionSource;
};

const DEDUPE_WINDOW_MS = 1500;
const recentFingerprints = new Map<string, number>();

function sortedStrings(values: string[]): string[] {
	return [...values].map((value) => String(value)).sort();
}

function makeFingerprint(payload: QuestionAnsweredPayload): string {
	return [
		payload.questionId,
		payload.moduleId,
		payload.classId,
		payload.questionType,
		String(payload.isCorrect),
		JSON.stringify(sortedStrings(payload.selectedOptions)),
		JSON.stringify(sortedStrings(payload.eliminatedOptions))
	].join('|');
}

function generateSubmissionId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function pruneFingerprints(nowMs: number) {
	for (const [fingerprint, timestamp] of recentFingerprints.entries()) {
		if (nowMs - timestamp > DEDUPE_WINDOW_MS * 3) {
			recentFingerprints.delete(fingerprint);
		}
	}
}

export function captureQuestionAnswered(payload: QuestionAnsweredPayload): boolean {
	if (!browser) return false;

	const nowMs = Date.now();
	pruneFingerprints(nowMs);

	const fingerprint = makeFingerprint(payload);
	const lastSeen = recentFingerprints.get(fingerprint);
	if (lastSeen && nowMs - lastSeen < DEDUPE_WINDOW_MS) {
		return false;
	}

	recentFingerprints.set(fingerprint, nowMs);

	void getPostHog().then((posthog) => {
		if (!posthog) return;

		posthog.capture('question_answered', {
			questionId: payload.questionId,
			moduleId: payload.moduleId,
			classId: payload.classId,
			questionType: payload.questionType,
			selectedOptions: payload.selectedOptions,
			eliminatedOptions: payload.eliminatedOptions,
			isCorrect: payload.isCorrect,
			submission_source: payload.submissionSource,
			submission_id: generateSubmissionId(),
			client_deduped: true
		});
	});

	return true;
}
