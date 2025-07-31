<script lang="ts">
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	import { api } from '../../../../convex/_generated/api.js';
	import { useQuery } from 'convex-svelte';
	import { useClerkContext } from 'svelte-clerk';
	const ctx = useClerkContext();
	const user = $derived(ctx.user);
	import { fade, fly } from 'svelte/transition';
	import { ArrowRight } from 'lucide-svelte';

	const classId: string = data.classId;

	const modules = useQuery(api.module.getClassModules, { id: classId });
</script>

<div class="flex flex-col lg:flex-row max-h-screen lg:h-screen border-base-300 bg-base-100">
	<!-- Sidebar -->
	<div class="w-full lg:w-1/4 lg:border-r border-base-300 flex flex-col bg-base-100">
		<!-- User Greeting Section -->
		<div class="p-6 border-b border-base-300">
			{#if user === undefined}
				<!-- Skeleton Loading State -->
				<div class="flex items-center gap-4">
					<div class="hidden xl:block skeleton h-16 w-16 rounded-full"></div>
					<div class="skeleton h-8 w-32"></div>
				</div>
			{:else if user === null}
				<!-- Guest State -->
				<div class="flex items-center gap-4" in:fade>
					<div class="avatar hidden xl:block">
						<div class="w-16 rounded-full bg-base-300">
							<span class="text-2xl flex items-center justify-center h-full">👤</span>
						</div>
					</div>
					<div>
						<h1 class="font-semibold text-2xl">Hi, Guest</h1>
						<p class="text-base-content/70 text-sm">Welcome to your learning dashboard</p>
					</div>
				</div>
			{:else}
				<!-- Authenticated User State -->
				<div class="flex items-center gap-4" in:fade>
					<div class="avatar hidden xl:block">
						<div class="ring-primary ring-offset-base-100 w-16 rounded-full ring ring-offset-2">
							<img src={user.imageUrl} alt="user profile" />
						</div>
					</div>

					<div>
						<h1 class="font-semibold text-2xl">
							Hi, {user.firstName?.split(' ')[0]}
						</h1>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Main Content -->
	<div class="w-full lg:w-3/4 flex flex-col bg-base-200 overflow-hidden">
		<!-- Header -->
		<div
			class="hidden lg:flex justify-between items-center p-6 border-b border-base-300 bg-base-100"
		>
			<h2 class="text-2xl font-bold">Learning Modules</h2>
		</div>

		<!-- Modules Grid -->
		<div class="overflow-y-auto p-6">
			{#if modules.isLoading}
				<!-- Loading state -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each Array(4), i (i)}
						<div class="card bg-base-100 shadow-md h-full">
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
				<!-- Error state -->
				<div class="text-center py-10">
					<p>Error loading modules</p>
				</div>
			{:else}
				<!-- Modules content -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each modules.data as module, index (module._id)}
						<div in:fly={{ y: 20, delay: index * 50, duration: 300 }} class="relative">
							<a href={`/classes/${classId}/modules/${module._id}`}>
								<div
									class="card bg-base-100 shadow-md h-full transition-all duration-300 overflow-hidden hover:shadow-lg hover:translate-y-[-2px]"
								>
									<div class="card-body">
										<h2 class="card-title text-lg">{module.title}</h2>
										<p class="text-base-content/70 text-sm mb-4">
											{module.description || 'No description available'}
										</p>

										<div class="mt-auto flex justify-end items-center">
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
	</div>
</div>

<style>
	/* Smooth scrolling */
	.overflow-y-auto {
		scroll-behavior: smooth;
		-webkit-overflow-scrolling: touch;
	}
</style>
