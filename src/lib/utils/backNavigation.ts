import { afterNavigate } from '$app/navigation';

let previousPath: string | null = null;

// Call once from the root layout.
export function trackPreviousPath() {
	afterNavigate(({ from }) => {
		previousPath = from?.url.pathname ?? null;
	});
}

// True when the page before this one was `path`, so history.back() returns there with its state intact.
export function cameFrom(path: string) {
	return previousPath === path && window.history.length > 1;
}
