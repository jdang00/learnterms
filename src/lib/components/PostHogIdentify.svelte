<script lang="ts">
	import { useClerkContext } from 'svelte-clerk/client';
	import { userDisplayName } from '$lib/userDisplayName';
	import { browser } from '$app/environment';
	import { getPostHog } from '$lib/analytics/posthogClient';

	const ctx = useClerkContext();
	const user = $derived(ctx.user);

	let identified = $state(false);

	$effect(() => {
		if (!browser) return;
		// Read Clerk state synchronously so identification reruns when auth finishes loading.
		const currentUser = user;
		let cancelled = false;

		void (async () => {
			const posthog = await getPostHog();
			if (!posthog || cancelled) return;

			if (currentUser && !identified) {
				const distinctId = posthog.get_distinct_id();
				if (distinctId && distinctId !== currentUser.id) {
					posthog.alias(currentUser.id, distinctId);
				}
				posthog.identify(currentUser.id, {
					email: currentUser.primaryEmailAddress?.emailAddress,
					name: userDisplayName(currentUser),
					firstName: currentUser.firstName,
					lastName: currentUser.lastName,
					imageUrl: currentUser.imageUrl
				});
				identified = true;
			} else if (!currentUser && identified) {
				posthog.reset();
				identified = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});
</script>
