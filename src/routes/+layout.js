import posthog from 'posthog-js';
import { browser } from '$app/environment';

export const load = async () => {
	if (browser) {
		posthog.init('phc_3eXFYO1aHVEWM75fi3wXFE6OiJZiDNvI5pcl67S19fK', {
			api_host: 'https://us.i.posthog.com',
			person_profiles: 'identified_only'
		});
	}
	return;
};
