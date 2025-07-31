<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import type { PageData } from './$types';
	import { api } from '../../convex/_generated/api.js';
	import type { Id } from '../../convex/_generated/dataModel';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { ArrowRight, ArrowLeft } from 'lucide-svelte';

	import { useClerkContext } from 'svelte-clerk/client';
	const ctx = useClerkContext();
	const name = $derived(ctx.user?.firstName);
	const user = $derived(ctx.user);

	let { data }: { data: PageData } = $props();
	const userData = data.userData;

	type ClassType = { _id: Id<'class'>; name: string; code: string; description?: string };

	let currentView: 'classes' | 'modules' = $state('classes');
	let selectedClass: ClassType | null = $state(null);

	const classes = useQuery(api.class.getUserClasses, {
		id: (userData?.cohortId as Id<'cohort'>) || ''
	});

	let modules = $state();

	$effect(() => {
		if (selectedClass && currentView === 'modules') {
			const query = useQuery(api.module.getClassModules, { id: selectedClass._id });
			modules = query;
		} else {
			modules = { isLoading: false, error: null, data: [] };
		}
	});

	function selectClass(classItem: ClassType) {
		selectedClass = classItem;
		currentView = 'modules';
	}

	function goBackToClasses() {
		currentView = 'classes';
		selectedClass = null;
	}
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

	<div class="divider"></div>

	<div class="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
		<div class="lg:col-span-3 overflow-hidden">
			{#if currentView === 'classes'}
				<div in:fade={{ duration: 400, easing: cubicOut }} class="w-full">
					<div class="flex justify-between mb-6">
						<h3 class="text-lg font-semibold">My Classes</h3>
					</div>

					{#if classes.isLoading}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							{#each Array(4), index (index)}
								<div class="card bg-base-100 shadow-md animate-pulse">
									<div class="card-body">
										<div class="skeleton h-8 w-32 mb-4"></div>
										<div class="skeleton h-4 w-full mb-2"></div>
										<div class="skeleton h-4 w-full mb-2"></div>
										<div class="skeleton h-4 w-2/3 mb-4"></div>
										<div class="skeleton h-8 w-8 rounded-full ml-auto"></div>
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
						<div class="card bg-base-100 shadow-md">
							<div class="card-body py-12">
								<div class="text-4xl mb-4">📚</div>
								<h3 class="text-lg font-semibold mb-2">No classes yet</h3>
								<p class="text-base-content/70">Your classes will appear here once enrolled.</p>
							</div>
						</div>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							{#each classes.data as classItem, index (classItem._id)}
								<div in:fade={{ delay: index * 50, duration: 300 }} class="relative">
									<button onclick={() => selectClass(classItem)} class="w-full">
										<div
											class="card bg-base-100 shadow-md h-80 transition-all duration-300 overflow-hidden hover:shadow-lg hover:translate-y-[-2px]"
										>
											<div class="card-body flex flex-col">
												<div class="flex items-center gap-2 mb-2">
													<div class="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
													<h2 class="card-title text-lg text-left truncate">{classItem.name}</h2>
												</div>
												<div class="badge badge-ghost badge-sm mb-2">{classItem.code}</div>
												<p class="text-base-content/70 text-sm mb-4 text-left line-clamp-4">
													{classItem.description || 'No description available'}
												</p>

												<div class="mt-auto flex justify-end">
													<div class="btn btn-sm btn-primary btn-outline rounded-full">
														<ArrowRight size={16} />
													</div>
												</div>
											</div>
										</div>
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if currentView === 'modules' && selectedClass}
				<div in:fade={{ duration: 400, easing: cubicOut }} class="w-full">
					<div class="flex items-center gap-4 mb-6">
						<button onclick={goBackToClasses} class="btn btn-sm btn-ghost">
							<ArrowLeft size={16} />
						</button>
						<h3 class="text-lg font-semibold">{selectedClass.name}</h3>
						<div class="badge badge-primary badge-soft">{selectedClass.code}</div>
					</div>

					{#if modules.isLoading}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							{#each Array(4), index (index)}
								<div class="card bg-base-100 shadow-md animate-pulse">
									<div class="card-body">
										<div class="skeleton h-8 w-32 mb-4"></div>
										<div class="skeleton h-4 w-full mb-2"></div>
										<div class="skeleton h-4 w-full mb-2"></div>
										<div class="skeleton h-4 w-2/3 mb-4"></div>
										<div class="skeleton h-8 w-8 rounded-full ml-auto"></div>
									</div>
								</div>
							{/each}
						</div>
					{:else if modules.error}
						<div class="alert alert-error">
							<span>Failed to load modules: {modules.error.toString()}</span>
						</div>
					{:else if modules.data.length === 0}
						<div class="card bg-base-100 shadow-md">
							<div class="card-body py-12">
								<div class="text-4xl mb-4">📚</div>
								<h3 class="text-lg font-semibold mb-2">No modules yet</h3>
								<p class="text-base-content/70">Modules will appear here once they are added to this class.</p>
							</div>
						</div>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							{#each modules.data as module, index (module._id)}
								<div in:fly={{ y: 20, delay: index * 50, duration: 300 }} class="relative">
									<a href={`/classes/${selectedClass._id}/modules/${module._id}`}>
										<div
											class="card bg-base-100 shadow-md h-full transition-all duration-300 overflow-hidden hover:shadow-lg hover:translate-y-[-2px]"
										>
											<div class="card-body">
												<h2 class="card-title text-lg">{module.title}</h2>
												<p class="text-base-content/70 text-sm mb-4 text-left">
													{module.description || 'No description available'}
												</p>

												<div class="mt-auto flex justify-end">
													<div class="btn btn-sm btn-primary btn-outline rounded-full">
														<ArrowRight size={16} />
													</div>
												</div>
											</div>
										</div>
									</a>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Sidebar -->
		<div class="lg:col-span-1">
			<h3 class="text-lg font-semibold mb-6">Quick Actions</h3>

			<div class="space-y-3">
				<div
					class="card bg-base-100 shadow-md hover:shadow-lg hover:translate-y-[-2px] transition-all duration-300 cursor-pointer"
				>
					<div class="card-body p-4">
						<div class="flex justify-between">
							<div class="flex space-x-3">
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

				<div
					class="card bg-base-100 shadow-md hover:shadow-lg hover:translate-y-[-2px] transition-all duration-300 cursor-pointer"
				>
					<div class="card-body p-4">
						<div class="flex justify-between">
							<div class="flex space-x-3">
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

				<div
					class="card bg-base-100 shadow-md hover:shadow-lg hover:translate-y-[-2px] transition-all duration-300 cursor-pointer"
				>
					<div class="card-body p-4">
						<div class="flexjustify-between">
							<div class="flex space-x-3">
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
