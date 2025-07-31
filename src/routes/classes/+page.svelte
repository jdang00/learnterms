<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import type { PageData } from './$types';
	import { api } from '../../convex/_generated/api.js';
	import type { Id } from '../../convex/_generated/dataModel';
	import { fade } from 'svelte/transition';

	import { useClerkContext } from 'svelte-clerk/client';
	const ctx = useClerkContext();
	const name = $derived(ctx.user?.firstName);
	const user = $derived(ctx.user);

	let { data }: { data: PageData } = $props();
	const userData = data.userData;

	const classes = useQuery(api.class.getUserClasses, {
		id: userData.cohortId as Id<'cohort'>
	});
</script>

<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<div class="mb-8">
		{#if user === undefined}
			<div class="skeleton h-8 w-64 mb-2"></div>
			<div class="skeleton h-4 w-80"></div>
		{:else if user === null}
			<h2 class="text-2xl font-bold mb-2">Welcome, Guest!</h2>
			<p class="text-base-content/70">Here's your learning dashboard.</p>
		{:else}
			<div class="flex flex-row gap-8">
				<div class="avatar hidden xl:block self-center">
					<div class="ring-primary ring-offset-base-100 w-16 rounded-full ring ring-offset-2">
						<img src={user.imageUrl} alt="user profile" />
					</div>
				</div>

				<div>
					<h2 class="text-2xl font-bold mb-2">Hi, {name}!</h2>
					{#if userData === null}
						<div class="skeleton h-4 w-80"></div>
					{:else}
						<p class="text-base-content/70">
							{userData.schoolName}
						</p>
						{#if userData && !classes.isLoading}
							<div class="badge badge-primary badge-soft mt-2">
								{userData.cohortName}
							</div>
						{/if}
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
		<!-- Classes Section -->
		<div class="lg:col-span-3">
			<div class="flex items-center justify-between mb-6">
				<h3 class="text-lg font-semibold">My Classes</h3>
			</div>

			{#if classes.isLoading}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each Array(4), index (index)}
						<div class="card bg-base-100 shadow-sm animate-pulse">
							<div class="card-body">
								<div class="flex items-start justify-between mb-3">
									<div class="flex items-center space-x-3">
										<div class="w-3 h-3 rounded-full skeleton"></div>
										<div>
											<div class="skeleton h-4 w-32 mb-1"></div>
											<div class="skeleton h-3 w-16"></div>
										</div>
									</div>
								</div>
								<div class="skeleton h-4 w-full mb-2"></div>
								<div class="skeleton h-4 w-3/4"></div>
							</div>
						</div>
					{/each}
				</div>
			{:else if classes.error}
				<div class="alert alert-error">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="stroke-current shrink-0 h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>Failed to load classes: {classes.error.toString()}</span>
				</div>
			{:else if classes.data.length === 0}
				<div class="card bg-base-100 shadow-sm">
					<div class="card-body text-center py-12">
						<div class="text-4xl mb-4">📚</div>
						<h3 class="text-lg font-semibold mb-2">No classes yet</h3>
						<p class="text-base-content/70">Your classes will appear here once enrolled.</p>
					</div>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each classes.data as classItem (classItem._id)}
						<div class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow" in:fade>
							<div class="card-body pb-3">
								<div class="flex items-start justify-between">
									<div class="flex items-center space-x-3">
										<div class="w-3 h-3 rounded-full bg-primary"></div>
										<div>
											<h4 class="card-title text-base">
												<a href={`/classes/${classItem._id}/modules`} class="link link-hover">
													{classItem.name}
												</a>
											</h4>
											<div class="badge badge-ghost badge-sm">{classItem.code}</div>
										</div>
									</div>
								</div>
							</div>
							<div class="card-body pt-0">
								<p class="text-sm text-base-content/80">{classItem.description}</p>
								<div class="card-actions justify-end mt-4">
									<a href={`/classes/${classItem._id}/modules`} class="btn btn-primary btn-sm">
										View Modules
									</a>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Sidebar -->
		<div class="lg:col-span-1">
			<h3 class="text-lg font-semibold mb-6">Quick Actions</h3>

			<div class="space-y-3">
				<div class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
					<div class="card-body p-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center space-x-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5 text-base-content/60"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								<span class="font-medium">All Assignments</span>
							</div>
						</div>
					</div>
				</div>

				<div class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
					<div class="card-body p-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center space-x-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5 text-base-content/60"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
								<span class="font-medium">Schedule</span>
							</div>
						</div>
					</div>
				</div>

				<div class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
					<div class="card-body p-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center space-x-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5 text-base-content/60"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									/>
								</svg>
								<span class="font-medium">Grades</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</main>
