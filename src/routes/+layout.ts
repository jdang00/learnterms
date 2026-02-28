import type { LayoutLoad } from './$types';
import { browser } from '$app/environment';

export const ssr = true;
export const csr = true;
export const trailingSlash = 'never';

export const load: LayoutLoad = async ({ data }) => {
	if (browser) {
		const posthog = (await import('posthog-js')).default;
		posthog.init('phc_3eXFYO1aHVEWM75fi3wXFE6OiJZiDNvI5pcl67S19fK', {
			api_host: 'https://us.i.posthog.com',
			ui_host: 'https://us.posthog.com',
			capture_pageview: false,
			capture_pageleave: true,
			persistence: 'localStorage+cookie'
		});
	}
	return { ...data };
};
