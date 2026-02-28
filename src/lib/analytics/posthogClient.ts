import { browser } from '$app/environment';
import type { PostHog } from 'posthog-js';

const POSTHOG_API_KEY = 'phc_3eXFYO1aHVEWM75fi3wXFE6OiJZiDNvI5pcl67S19fK';

let posthogPromise: Promise<PostHog | null> | null = null;

export async function getPostHog(): Promise<PostHog | null> {
	if (!browser) return null;

	if (!posthogPromise) {
		posthogPromise = import('posthog-js')
			.then(({ default: posthog }) => {
				posthog.init(POSTHOG_API_KEY, {
					api_host: 'https://us.i.posthog.com',
					ui_host: 'https://us.posthog.com',
					capture_pageview: false,
					capture_pageleave: true,
					persistence: 'localStorage+cookie'
				});
				return posthog;
			})
			.catch((error) => {
				console.error('[PostHog] Failed to load posthog-js', error);
				posthogPromise = null;
				return null;
			});
	}

	return posthogPromise;
}
