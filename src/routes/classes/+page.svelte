<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import type { PageData } from './$types';
	import { api } from '../../convex/_generated/api.js';
	let { data }: { data: PageData } = $props();
	import type { User } from '$lib/types';
	const userData: User[] = data.userData;

	const classes = useQuery(api.class.getUserClasses, { id: userData[0].cohortId });
</script>

<div class="mx-auto mt-12 max-w-2xl">
	<h1 class="text-3xl font-bold">Classes</h1>

	{#if classes.isLoading}
		<div class="flex w-52 flex-col gap-4 mt-6">
			<div class="skeleton h-32 w-full"></div>
			<div class="skeleton h-4 w-full"></div>
			<div class="skeleton h-4 w-full"></div>
		</div>
	{:else if classes.error}
		failed to load: {classes.error.toString()}
	{:else}
		<div class="mt-4">
			{#each classes.data as code (code._id)}
				<h2 class="text-xl font-semibold mt-4">
					<a class="link link-primary" href={`/classes/${code._id}/modules`}>{code.name}</a>
					<span class="text-base-content/70 text-sm ms-2">{code.code}</span>
				</h2>
				<p>{code.description}</p>
			{/each}
		</div>
	{/if}
</div>
