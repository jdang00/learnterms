<script lang="ts">
	import { useClerkContext } from 'svelte-clerk/client';
	import posthog from 'posthog-js';
	import { browser } from '$app/environment';

	const ctx = useClerkContext();
	const user = $derived(ctx.user);

	let identified = $state(false);

	$effect(() => {
		if (!browser) return;

		if (user && !identified) {
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
	});
</script>
