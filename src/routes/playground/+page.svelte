<script lang="ts">
	import type { PageData } from './$types';
	import type { User } from '$lib/types';
	let { data }: { data: PageData } = $props();
	const userData: User[] = data.userData;
</script>

{#if userData}
	{#each userData as user (user._id)}
		<div>
			<h2>{user.name}</h2>
			<p>Convex ID: {user._id}</p>
			<p>ClerkID: {user.clerkUserId}</p>
			<p>CohortID: {user.cohortId}</p>
		</div>
	{/each}
{/if}
