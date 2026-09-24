<script lang="ts">
	import { useClerkContext } from 'svelte-clerk/client';
	import { useConvexClient } from 'convex-svelte';
	import { untrack } from 'svelte';
	import { syncConvexClerkAuth } from '$lib/convexClerkAuth';

	let { initialToken }: { initialToken: string | null } = $props();
	const clerk = useClerkContext();
	const convex = useConvexClient();
	const isLoaded = $derived(clerk.isLoaded);
	const userId = $derived(clerk.user?.id);
	const sessionId = $derived(clerk.session?.id);

	$effect(() => {
		syncConvexClerkAuth(
			convex,
			{
				isLoaded,
				userId,
				sessionId,
				initialToken: untrack(() => initialToken)
			},
			() => untrack(() => clerk.session)
		);
	});
</script>
