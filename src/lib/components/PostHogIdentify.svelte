<script lang="ts">
	import { useClerkContext } from 'svelte-clerk/client';
	import { browser } from '$app/environment';
	import { getPostHog } from '$lib/analytics/posthogClient';

	const ctx = useClerkContext();
	const user = $derived(ctx.user);

	let identified = $state(false);

	$effect(() => {
		if (!browser) return;

		void (async () => {
			const posthog = await getPostHog();
			if (!posthog) return;

			if (user && !identified) {
				const distinctId = posthog.get_distinct_id();
				if (distinctId && distinctId !== user.id) {
					posthog.alias(user.id, distinctId);
				}
				posthog.identify(user.id, {
					email: user.primaryEmailAddress?.emailAddress,
					name: user.fullName,
					firstName: user.firstName,
					lastName: user.lastName,
					imageUrl: user.imageUrl
				});
				identified = true;
			} else if (!user && identified) {
				posthog.reset();
				identified = false;
			}
		})();
	});
</script>
