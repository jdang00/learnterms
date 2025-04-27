<script lang="ts">
	import type { PageData } from './$types';
	import type { Chapter } from '$lib/types';
	import { useClerkContext } from 'svelte-clerk';
	import { ArrowRight, BookOpen, Lock, Medal } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import { PUBLIC_CHAPTER_THRESHOLD } from '$env/static/public';

	const ctx = useClerkContext();
	const user = $derived(ctx.user);
	let { data }: { data: PageData } = $props();
	let chapters: Chapter[] = data.chapters;

	let enabledThreshold: number = $state(0);

	if (PUBLIC_CHAPTER_THRESHOLD) {
		const parsedThreshold = parseInt(PUBLIC_CHAPTER_THRESHOLD, 10);
		if (!isNaN(parsedThreshold)) {
			enabledThreshold = parsedThreshold;
		} else {
			console.error(
				'Invalid PUBLIC_CHAPTER_THRESHOLD:',
				PUBLIC_CHAPTER_THRESHOLD,
				'Defaulting to 0.'
			);
			enabledThreshold = 0;
		}
	} else {
		console.warn('PUBLIC_CHAPTER_THRESHOLD is not set.  Defaulting to 0.');
		enabledThreshold = 0;
	}

	let activeFilter = $state('all');

	let mounted = $state(false);
	$effect(() => {
		mounted = true;
	});

	// Filter chapters
	const filteredChapters = $derived(
		activeFilter === 'all'
			? chapters.map((chapter, i) => ({ chapter, originalIndex: i }))
			: activeFilter === 'available'
				? chapters
						.filter((_, i) => i < enabledThreshold)
						.map((chapter, i) => ({ chapter, originalIndex: i }))
				: chapters
						.filter((_, i) => i >= enabledThreshold)
						.map((chapter, i) => ({ chapter, originalIndex: i + enabledThreshold }))
	);
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

		<!-- Challenge & Progress Summary -->
		<div class="p-6 flex flex-col gap-4 border-b border-base-300">
			<a href="/dashboard/challenge" class="btn btn-primary w-full">
				<Medal size={18} />
				Final Quiz Challenge Questions!
			</a>
		</div>

		<!-- Mobile nav controls (visible on small screens) -->
		<div class="lg:hidden border-b border-base-300 p-4">
			<div class="join w-full">
				<button
					class="join-item btn flex-1"
					class:btn-active={activeFilter === 'all'}
					onclick={() => (activeFilter = 'all')}
				>
					All
				</button>
				<button
					class="join-item btn flex-1"
					class:btn-active={activeFilter === 'available'}
					onclick={() => (activeFilter = 'available')}
				>
					Available
				</button>
				<button
					class="join-item btn flex-1"
					class:btn-active={activeFilter === 'locked'}
					onclick={() => (activeFilter = 'locked')}
				>
					Locked
				</button>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="w-full lg:w-3/4 flex flex-col bg-base-200 overflow-hidden">
		<!-- Header with filters (desktop only) -->
		<div
			class="hidden lg:flex justify-between items-center p-6 border-b border-base-300 bg-base-100"
		>
			<h2 class="text-2xl font-bold">Learning Modules</h2>
			<div class="join">
				<button
					class="join-item btn btn-sm"
					class:btn-active={activeFilter === 'all'}
					onclick={() => (activeFilter = 'all')}
				>
					All Modules
				</button>
				<button
					class="join-item btn btn-sm"
					class:btn-active={activeFilter === 'available'}
					onclick={() => (activeFilter = 'available')}
				>
					Available ({enabledThreshold})
				</button>
				<button
					class="join-item btn btn-sm"
					class:btn-active={activeFilter === 'locked'}
					onclick={() => (activeFilter = 'locked')}
				>
					Locked ({chapters.length - enabledThreshold})
				</button>
			</div>
		</div>

		<!-- Modules Grid -->
		<div class="overflow-y-auto p-6">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each filteredChapters as { chapter, originalIndex }, index (originalIndex)}
					{#if mounted}
						<div in:fly={{ y: 20, delay: index * 50, duration: 300 }} class="relative">
							<a
								href={originalIndex < enabledThreshold
									? `dashboard/pharm/${originalIndex + 1}`
									: null}
								class={originalIndex < enabledThreshold ? '' : 'pointer-events-none'}
							>
								<div
									class="card bg-base-100 shadow-md h-full transition-all duration-300 overflow-hidden"
									class:hover:shadow-lg={originalIndex < enabledThreshold}
									class:hover:translate-y-[-2px]={originalIndex < enabledThreshold}
									class:opacity-60={originalIndex >= enabledThreshold}
								>
									<div class="card-body">
										<div class="flex justify-between items-start">
											<div class="flex items-center gap-3 mb-2">
												<div class="text-4xl">
													{chapter.emoji}
												</div>
												<span class="font-bold text-xs tracking-wide mb-2 text-base-content/75"
													>CHAPTER {originalIndex + 1}</span
												>
											</div>

											<div>
												{#if originalIndex < enabledThreshold}
													<BookOpen />
												{:else}
													<Lock class="text-base-content/50" size={20} />
												{/if}
											</div>
										</div>

										<h2 class="card-title text-lg">{chapter.name}</h2>
										<p class="text-base-content/70 text-sm mb-4">{chapter.desc}</p>

										<div class="mt-auto flex justify-end items-center">
											{#if originalIndex < enabledThreshold}
												<div class="btn btn-sm btn-primary btn-outline rounded-full">
													<ArrowRight size={16} />
												</div>
											{:else}
												<div class="btn btn-sm btn-disabled rounded-full">
													<Lock size={16} />
												</div>
											{/if}
										</div>
									</div>
								</div>
							</a>
						</div>
					{/if}
				{/each}
			</div>
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
