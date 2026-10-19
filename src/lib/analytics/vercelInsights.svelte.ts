import { inject, pageview } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { browser, dev } from '$app/env';
import { page } from '$app/state';

// The packages' `/sveltekit` entries subscribe to `$app/stores`, which throws in SvelteKit 3,
// so wire the same route tracking to `$app/state`. Call once from the root layout.
export function trackVercelInsights() {
	if (!browser || dev) return;
	inject({ framework: 'sveltekit', disableAutoTrack: true });
	const speedInsights = injectSpeedInsights({ framework: 'sveltekit', route: page.route.id });
	$effect(() => {
		const route = page.route.id;
		if (!route) return;
		pageview({ route, path: page.url.pathname });
		speedInsights?.setRoute(route);
	});
}
