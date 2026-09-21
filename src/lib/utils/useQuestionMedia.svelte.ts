import { onMount } from 'svelte';
import { useQuery } from 'convex-svelte';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

// Convex subscriptions cache query results. Change the argument periodically so expiring
// R2 URLs refresh even when the media records themselves haven't changed during a long quiz.
export function useQuestionMedia(questionId: () => Id<'question'> | null | undefined) {
	let urlRefresh = $state(0);
	onMount(() => {
		const refresh = () => {
			urlRefresh = Math.floor(Date.now() / (5 * 60 * 1000));
		};
		refresh();
		const timer = window.setInterval(refresh, 5 * 60 * 1000);
		window.addEventListener('focus', refresh);
		document.addEventListener('visibilitychange', refresh);
		return () => {
			window.clearInterval(timer);
			window.removeEventListener('focus', refresh);
			document.removeEventListener('visibilitychange', refresh);
		};
	});
	return useQuery(api.questionMedia.getByQuestionId, () => {
		const id = questionId();
		return id && urlRefresh ? { questionId: id, urlRefresh } : 'skip';
	});
}
