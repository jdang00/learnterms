import { browser } from '$app/environment';

export const QUIZ_PREFERENCE_KEYS = {
	autoNextEnabled: 'lt:autoNextEnabled',
	optionsShuffleEnabled: 'lt:optionsShuffleEnabled'
} as const;

export type QuizPreferenceKey =
	(typeof QUIZ_PREFERENCE_KEYS)[keyof typeof QUIZ_PREFERENCE_KEYS];

export type QuizPreferenceChangedDetail = {
	key: QuizPreferenceKey;
	value: boolean;
};

export const QUIZ_PREFERENCE_CHANGED_EVENT = 'lt:quiz-preference-changed';

export function readQuizPreference(key: QuizPreferenceKey, fallbackValue: boolean): boolean {
	if (!browser) return fallbackValue;
	try {
		const raw = window.localStorage.getItem(key);
		return raw === null ? fallbackValue : raw === 'true';
	} catch {
		return fallbackValue;
	}
}

export function writeQuizPreference(key: QuizPreferenceKey, value: boolean) {
	if (!browser) return;
	try {
		window.localStorage.setItem(key, String(value));
		window.dispatchEvent(
			new CustomEvent<QuizPreferenceChangedDetail>(QUIZ_PREFERENCE_CHANGED_EVENT, {
				detail: { key, value }
			})
		);
	} catch {
		// no-op
	}
}
