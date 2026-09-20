import { internalAction } from './_generated/server';
import { v } from 'convex/values';

// Content-free server events. Always distinguish LearnTerms from other apps sharing a project.
export const capture = internalAction({
	args: { event: v.string(), distinctId: v.string(), properties: v.any() },
	returns: v.null(),
	handler: async (_ctx, args) => {
		const apiKey =
			process.env.POSTHOG_PROJECT_API_KEY ?? 'phc_3eXFYO1aHVEWM75fi3wXFE6OiJZiDNvI5pcl67S19fK';
		try {
			// Convex reserves dollar-prefixed object keys; translate only after crossing its boundary.
			const properties = Object.fromEntries(
				Object.entries(args.properties).map(([key, value]) => [
					key.startsWith('ai_') ? `$${key}` : key,
					value
				])
			);
			const response = await fetch('https://us.i.posthog.com/capture/', {
				method: 'POST',
				signal: AbortSignal.timeout(5000),
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					api_key: apiKey,
					event: args.event,
					distinct_id: args.distinctId,
					properties: {
						...properties,
						product: 'LearnTerms',
						environment: process.env.CONVEX_CLOUD_URL?.includes('rightful-crane-34')
							? 'development'
							: 'production',
						telemetry_source: 'learnterms-harness'
					},
					timestamp: new Date().toISOString()
				})
			});
			if (!response.ok) console.warn('AI telemetry delivery failed', response.status);
		} catch {
			console.warn('AI telemetry delivery unavailable');
		}
		return null;
	}
});
