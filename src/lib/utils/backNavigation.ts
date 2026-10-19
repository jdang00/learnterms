import { afterNavigate, goto } from '$app/navigation';

let previousPath: string | null = null;

// Call once from the root layout.
export function trackPreviousPath() {
	afterNavigate(({ from, shallow, type }) => {
		// Shallow routing stays on the same page.
		if (shallow && type === 'goto') return;
		previousPath = from?.url.pathname ?? null;
	});
}

// True when the page before this one was `path`, so history.back() returns there with its state intact.
export function cameFrom(path: string) {
	return previousPath === path && window.history.length > 1;
}

/** Shallow routing: a history entry with new `page.state` on the current URL. */
export function setPageState(state: App.PageState, { replace = false } = {}) {
	// eslint-disable-next-line svelte/no-navigation-without-resolve -- '' keeps the current URL
	return goto('', { shallow: true, replace, state });
}
