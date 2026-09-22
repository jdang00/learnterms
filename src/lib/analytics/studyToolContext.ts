import { getContext, setContext } from 'svelte';
import { page } from '$app/state';
import type { StudyToolContext } from './studyToolEvents';

const KEY = Symbol('study-tool-analytics');
export function provideStudyToolContext(get: () => StudyToolContext) {
	setContext(KEY, get);
}
export function useStudyToolContext(): () => StudyToolContext {
	const get = getContext<(() => StudyToolContext) | undefined>(KEY);
	return () => ({ surface: 'other', ...get?.(), pathname: page.url.pathname });
}
