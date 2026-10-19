<script lang="ts">
	import { setupAuth } from 'convex-svelte';
	import { untrack } from 'svelte';
	import { useClerkContext } from 'svelte-clerk/client';
	import { clerkConvexAuthProvider } from '$lib/convexAuthProvider';

	let { initialToken }: { initialToken: string | null } = $props();
	const clerk = useClerkContext();

	let markLoaded = () => {};
	const loaded = new Promise<void>((resolve) => (markLoaded = resolve));
	$effect(() => {
		if (clerk.isLoaded) markLoaded();
	});

	setupAuth(
		clerkConvexAuthProvider(
			() => ({
				isLoaded: clerk.isLoaded,
				userId: clerk.auth.userId,
				sessionId: clerk.auth.sessionId,
				session: clerk.session
			}),
			// The server token only bridges the first page load; later renders ask Clerk directly.
			{ initialToken: untrack(() => initialToken), whenLoaded: () => loaded }
		),
		{ initialState: { isAuthenticated: Boolean(clerk.auth.userId && clerk.auth.sessionId) } }
	);
</script>
