<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import type { PageData } from './$types';
	import { api } from '../../convex/_generated/api.js';
	import type { Doc, Id } from '../../convex/_generated/dataModel';
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import {
		ArrowLeft,
		ChevronRight,
		ShieldCheckIcon,
		UserRoundPenIcon,
		ClipboardCheck,
		ArrowRight as ArrowRightIcon,
		Sparkles,
		History,
		Users,
		LayoutDashboard,
		X
	} from 'lucide-svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ModuleCard from '../../lib/components/ModuleCard.svelte';
	import Sidebar from '../../lib/components/Sidebar.svelte';
	import ClassList from '../../lib/components/ClassList.svelte';
	import type { ClassWithSemester } from '../../lib/types';
	import { useClerkContext } from 'svelte-clerk/client';
	const client = useConvexClient();
	const ctx = useClerkContext();
	const name = $derived(ctx.user?.firstName);
	const user = $derived(ctx.user);

	let { data }: { data: PageData } = $props();
	const userData = data.userData;
	const userSchoolName = $derived.by(() => (userData as any)?.schoolName ?? null);
	const userCohortName = $derived.by(() => (userData as any)?.cohortName ?? null);
	const dev = $derived(userData?.role === 'dev');
	const admin = $derived(userData?.role === 'admin');
	const curator = $derived(userData?.role === 'curator');

	let currentView: 'classes' | 'modules' = $state('classes');
	let selectedClass: ClassWithSemester | null = $state(null);
	let isNavigatingBack = $state(false);
	let jumpBackScroller: HTMLDivElement | undefined = $state();
	let canScrollRight = $state(false);
	let featureSpotlightOpen = $state(false);
	let featureSpotlightSeenLocal = $state(false);
	let featureSpotlightAcknowledging = $state(false);
	let featureSpotlightError = $state<string | null>(null);
	let openedAnnouncementId = $state<string | null>(null);

	function checkScroll() {
		if (!jumpBackScroller) return;
		canScrollRight = jumpBackScroller.scrollLeft + jumpBackScroller.clientWidth < jumpBackScroller.scrollWidth - 4;
	}

	function scrollRight() {
		jumpBackScroller?.scrollBy({ left: 200, behavior: 'smooth' });
	}

	$effect(() => {
		if (!jumpBackScroller) return;
		checkScroll();
		const ro = new ResizeObserver(checkScroll);
		ro.observe(jumpBackScroller);
		return () => ro.disconnect();
	});

	const classesQuery = useQuery(
		api.class.getUserClasses,
		() => userData?.cohortId ? { id: userData.cohortId as Id<'cohort'> } : 'skip'
	);

	const featureAnnouncementQuery = useQuery(
		(api as any).featureAnnouncements.getCurrentForViewer,
		() => userData?.cohortId ? {} : 'skip'
	);

	const classes = $derived({
		data: classesQuery.data || [],
		isLoading: classesQuery.isLoading,
		error: classesQuery.error
	});

	const firstClassId = $derived.by(() => {
		const list = classes.data as ClassWithSemester[] | undefined;
		return list && list.length > 0 ? list[0]._id : null;
	});

	const featureAnnouncement = $derived.by(() => {
		if (featureSpotlightSeenLocal) return null;
		return featureAnnouncementQuery.data ?? null;
	});

	type TagSummary = { _id: Id<'tags'>; name: string; color?: string };
	type ModuleWithTags = Doc<'module'> & { tags?: TagSummary[] };
	type RecentModuleActivity = { moduleId: Id<'module'>; lastActivityAt: number };
	type RecentModuleProgress = {
		moduleId: Id<'module'>;
		moduleTitle: string;
		moduleEmoji?: string;
		classId: Id<'class'>;
		className: string;
		classCode: string;
		totalQuestions: number;
		questionsInteracted: number;
		questionsMastered: number;
		questionsFlagged: number;
		progress: number;
	};

	const recentModuleActivityQuery = useQuery(
		api.progress.getRecentModuleActivity,
		() => userData?.cohortId ? { limit: 4 } : 'skip'
	);

	const recentModuleIds = $derived.by(() => {
		const activity = (recentModuleActivityQuery.data ?? []) as RecentModuleActivity[];
		return activity.map((item) => item.moduleId);
	});

	const recentModuleProgressQuery = useQuery(
		api.progress.getRecentModulesProgress,
		() => recentModuleIds.length > 0 ? { moduleIds: recentModuleIds } : 'skip'
	);

	const recentModules = $derived.by(() => {
		const activity = (recentModuleActivityQuery.data ?? []) as RecentModuleActivity[];
		const progress = (recentModuleProgressQuery.data ?? []) as RecentModuleProgress[];
		if (activity.length === 0 || progress.length === 0) return [];

		const progressByModuleId = new Map(progress.map((item) => [item.moduleId, item]));
		return activity
			.map((item) => {
				const moduleProgress = progressByModuleId.get(item.moduleId);
				if (!moduleProgress) return null;
				return { ...moduleProgress, lastActivityAt: item.lastActivityAt };
			})
			.filter((item): item is RecentModuleProgress & { lastActivityAt: number } => item !== null);
	});

	const recentModulesLoading = $derived(
		recentModuleActivityQuery.isLoading || recentModuleProgressQuery.isLoading
	);
	const recentModulesError = $derived(
		recentModuleActivityQuery.error ?? recentModuleProgressQuery.error
	);

	const modulesQuery = useQuery(
		api.module.getClassModules,
		() => (selectedClass && currentView === 'modules') ? { id: selectedClass._id } : 'skip'
	);

	const modules = $derived({
		isLoading: modulesQuery.isLoading,
		error: modulesQuery.error,
		data: modulesQuery.data as ModuleWithTags[] | undefined
	});

	const sortedModules = $derived.by(() => {
		const source = Array.isArray(modules.data) ? modules.data : [];
		return [...source].sort((a, b) => a.order - b.order);
	});

	$effect(() => {
		if (isNavigatingBack) return;

		const classId = page.url.searchParams.get('classId');

		if (classId && classes.data && classes.data.length > 0) {
			const foundClass = classes.data.find((cls) => cls._id === classId);
			if (foundClass && !selectedClass) {
				selectedClass = foundClass;
				currentView = 'modules';
			}
		}
	});

	async function selectClass(classItem: ClassWithSemester | null) {
		selectedClass = classItem;
		currentView = 'modules';
		if (classItem != null) {
			const classesUrl = new URL(resolve('/classes'), page.url.origin);
			classesUrl.searchParams.set('classId', classItem._id);
			window.history.replaceState(window.history.state, '', classesUrl.toString());
		}
	}

	async function goBackToClasses() {
		isNavigatingBack = true;
		currentView = 'classes';
		selectedClass = null;
		await goto(resolve('/classes'), { replaceState: true });
		isNavigatingBack = false;
	}

	function featureIconComponent(icon: string) {
		switch (icon) {
			case 'sparkles':
				return Sparkles;
			case 'history':
				return History;
			case 'users':
				return Users;
			case 'clipboard':
				return ClipboardCheck;
			default:
				return LayoutDashboard;
		}
	}

	function featureHref(item: { title: string; href?: string }) {
		if (item.href) return item.href;
		if (item.title === 'Build your own test') {
			const classId = selectedClass?._id ?? firstClassId;
			return classId ? `/classes/${classId}/tests/new` : '/classes';
		}
		if (item.title === 'Pick up where you left off') {
			return '/classes';
		}
		return '/classes';
	}

	async function dismissFeatureSpotlight() {
		const announcement = featureAnnouncement;
		if (!announcement || featureSpotlightAcknowledging) {
			featureSpotlightOpen = false;
			return;
		}
		featureSpotlightAcknowledging = true;
		featureSpotlightError = null;
		try {
			await client.mutation((api as any).featureAnnouncements.markSeen, {
				announcementId: announcement.id
			});
			featureSpotlightSeenLocal = true;
			featureSpotlightOpen = false;
		} catch (error: any) {
			featureSpotlightError = error?.message ?? 'Could not save this yet.';
		} finally {
			featureSpotlightAcknowledging = false;
		}
	}

	$effect(() => {
		const announcement = featureAnnouncement;
		if (!announcement) return;
		if (openedAnnouncementId === announcement.id) return;
		openedAnnouncementId = announcement.id;
		featureSpotlightOpen = true;
	});

	</script>

<main class="min-h-screen p-6 sm:p-8 mb-56">
	<div class="mb-8 flex flex-col gap-2">
		{#if user === undefined}
			<div class="flex flex-row gap-5 items-center">
				<div class="skeleton h-14 w-14 rounded-full shrink-0 hidden xl:block"></div>
				<div class="space-y-2">
					<div class="skeleton h-7 w-56"></div>
					<div class="skeleton h-4 w-72"></div>
				</div>
			</div>
		{:else if user === null}
			<h1 class="text-2xl font-bold text-base-content">Welcome, Guest!</h1>
			<p class="text-base-content/60 text-sm">Here's your learning dashboard.</p>
		{:else}
			<div class="flex flex-row gap-5 items-center">
				<div class="avatar hidden xl:block">
					<div class="ring-primary ring-offset-base-100 w-14 rounded-full ring ring-offset-2 transition-shadow duration-300 hover:shadow-md hover:shadow-primary/10">
						<img src={user.imageUrl} alt="user profile" />
					</div>
				</div>

				<div>
					<h1 class="text-2xl font-bold text-base-content mb-1">
						Hi, {name}!
					</h1>
					{#if userData === null}
						<div class="skeleton h-4 w-72 rounded-full"></div>
					{:else}
							<p class="text-base-content/60 text-sm">{userSchoolName}</p>
							{#if userData && !classes.isLoading}
								<div class="flex flex-wrap gap-1.5 mt-2">
									<div class="badge badge-primary rounded-full badge-soft">
										{userCohortName}
									</div>
								{#if dev}
									<div class="badge badge-error rounded-full badge-soft">
										<ShieldCheckIcon size={14} /> Dev
									</div>
								{/if}
								{#if admin}
									<div class="badge badge-secondary rounded-full badge-soft">
										<ShieldCheckIcon size={14} /> Admin
									</div>
								{/if}
								{#if curator}
									<div class="badge badge-accent rounded-full badge-soft">
										<UserRoundPenIcon size={14} /> Curator
									</div>
								{/if}
							</div>
						{/if}
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
		<div class="lg:col-span-3 overflow-hidden">
			{#if currentView === 'classes'}
				{#if recentModulesLoading}
					<div class="mb-8">
						<div class="mb-3 h-6 w-32 skeleton rounded-full"></div>
						<div class="overflow-x-auto pb-1">
							<div class="flex min-w-max gap-2">
								{#each Array(3), i (i)}
									<div class="rounded-xl border border-base-300 bg-base-100 px-3 py-2.5 animate-pulse min-w-[19rem]">
										<div class="flex items-center gap-3">
											<div class="skeleton h-5 w-5 rounded"></div>
											<div class="skeleton h-3.5 w-32"></div>
											<div class="skeleton h-3.5 w-14"></div>
											<div class="skeleton h-1.5 w-16 rounded-full"></div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{:else if recentModulesError}
					<div class="alert alert-error mb-8 rounded-2xl shadow-sm border border-error/20">
						<span>Failed to load recent modules: {recentModulesError.toString()}</span>
					</div>
				{:else if recentModules.length > 0}
					<div in:fade={{ duration: 300, easing: cubicOut }} class="mb-10">
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center gap-2">
								<h3 class="text-sm font-semibold text-base-content/70">Pick up where you left off</h3>
							</div>
							{#if canScrollRight}
								<button onclick={scrollRight} class="flex items-center gap-0.5 text-xs text-base-content/40 hover:text-primary transition-colors duration-150">
									<span>More</span>
									<ChevronRight size={14} />
								</button>
							{/if}
						</div>
						<div class="relative">
							<div bind:this={jumpBackScroller} onscroll={checkScroll} class="overflow-x-auto scrollbar-none">
								<div class="flex min-w-max gap-2">
									{#each recentModules as recentModule (recentModule.moduleId)}
										<a
											href={resolve('/classes/[classId]/modules/[moduleId]', {
												classId: recentModule.classId,
												moduleId: recentModule.moduleId
											})}
											class="group flex items-center gap-2.5 rounded-xl bg-base-100 border border-base-300 pl-3 pr-4 py-2 transition-colors duration-150 hover:border-primary/40"
										>
											<span class="text-base leading-none shrink-0">{recentModule.moduleEmoji || '📘'}</span>
											<div class="min-w-0 flex flex-col gap-0.5">
												<span class="font-medium text-xs text-base-content truncate max-w-40 leading-tight group-hover:text-primary transition-colors duration-150">
													{recentModule.moduleTitle}
												</span>
												<span class="flex items-center gap-1.5 text-[11px] text-base-content/45 leading-tight">
													<span>{recentModule.classCode}</span>
													<span class="inline-block w-0.5 h-0.5 rounded-full bg-base-content/25"></span>
													<span>{recentModule.progress}%</span>
												</span>
											</div>
											<div class="ml-1 shrink-0 w-10">
												<div class="h-1.5 rounded-full bg-base-300/60 overflow-hidden">
													<div
														class="h-full rounded-full bg-success"
														style="width: {recentModule.progress}%;"
													></div>
												</div>
											</div>
										</a>
									{/each}
								</div>
							</div>
							{#if canScrollRight}
								<div class="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-base-200/80 to-transparent rounded-r-xl"></div>
							{/if}
						</div>
					</div>
				{/if}

				<ClassList {classes} onSelectClass={selectClass} />
			{:else if currentView === 'modules' && selectedClass}
				<div in:fade={{ duration: 400, easing: cubicOut }} class="w-full">
					<div class="flex items-center gap-3 mb-4">
						<button onclick={goBackToClasses} class="btn btn-sm btn-ghost rounded-full hover:bg-base-200 transition-colors duration-200">
							<ArrowLeft size={16} />
						</button>
						<div class="flex items-center gap-2 min-w-0">
							<h3 class="text-lg font-semibold text-base-content truncate">{selectedClass.name}</h3>
							<span class="badge badge-soft badge-sm rounded-full font-mono opacity-60 shrink-0">{selectedClass.code}</span>
						</div>
					</div>

					<a
						href={`/classes/${selectedClass._id}/tests/new`}
						class="group flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 mb-6 transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:shadow-md hover:-translate-y-0.5"
					>
						<div class="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 text-primary shrink-0 transition-transform duration-200 group-hover:scale-110">
							<ClipboardCheck size={22} />
						</div>
						<div class="flex-1 min-w-0">
							<div class="font-semibold text-sm text-base-content">Test yourself</div>
							<p class="text-xs text-base-content/50 mt-0.5">
								Build a timed, scored practice test from any combination of modules. See exactly where you stand.
							</p>
						</div>
						<div class="text-primary shrink-0 transition-transform duration-200 group-hover:translate-x-1">
							<ArrowRightIcon size={18} />
						</div>
					</a>

					{#if modules.isLoading}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
							{#each Array(4), index (index)}
								<div
									class="rounded-2xl bg-base-100 shadow-sm border border-base-300 p-5 animate-pulse"
								>
									<div class="flex items-start gap-3 mb-3">
										<div class="skeleton h-9 w-9 rounded-lg shrink-0"></div>
										<div class="flex-1 space-y-2">
											<div class="skeleton h-5 w-3/4"></div>
											<div class="skeleton h-4 w-20 rounded-full"></div>
										</div>
									</div>
									<div class="space-y-2 mb-4">
										<div class="skeleton h-3.5 w-full"></div>
										<div class="skeleton h-3.5 w-2/3"></div>
									</div>
									<div class="flex justify-end">
										<div class="skeleton h-8 w-20 rounded-full"></div>
									</div>
								</div>
							{/each}
						</div>
					{:else if modules.error}
						<div class="alert alert-error rounded-2xl shadow-sm border border-error/20">
							<span>Failed to load modules: {modules.error.toString()}</span>
						</div>
					{:else if !modules.data || modules.data.length === 0}
						<div class="rounded-2xl bg-base-100 shadow-sm border border-base-300 p-8">
							<div class="text-center py-8">
								<div class="text-5xl mb-4">📚</div>
								<h3 class="text-lg font-semibold mb-2 text-base-content">No modules yet</h3>
								<p class="text-base-content/60 text-sm">
									Modules will appear here once they are added to this class.
								</p>
							</div>
						</div>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
							{#each sortedModules as module, i (module._id)}
								<div style="animation: moduleReveal 0.4s cubic-bezier(.16,1,.3,1) {i * 50}ms both;">
									<ModuleCard {module} classId={selectedClass._id} />
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<Sidebar />
	</div>
</main>

{#if featureAnnouncement}
	<dialog class="modal max-w-full p-4 z-[1000]" class:modal-open={featureSpotlightOpen}>
		<div class="modal-box max-w-2xl rounded-4xl border border-base-300 p-0 overflow-hidden shadow-2xl backdrop-blur-md">
			<!-- Header -->
			<div class="relative p-6 sm:p-8 pb-5">
				<button
					class="btn btn-ghost btn-sm btn-circle absolute top-5 right-5 z-10"
					aria-label="Close"
					onclick={dismissFeatureSpotlight}
					disabled={featureSpotlightAcknowledging}
				>
					<X size={16} />
				</button>

				<div class="flex items-center gap-3 mb-4">
					<div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
						<Sparkles size={20} />
					</div>
					<div class="badge badge-primary badge-soft rounded-full text-xs">
						{featureAnnouncement.eyebrow}
					</div>
				</div>

				<h2 class="text-2xl sm:text-3xl font-bold leading-tight">{featureAnnouncement.title}</h2>
				<p class="text-sm text-base-content/55 mt-2 max-w-xl leading-relaxed">
					{featureAnnouncement.description}
				</p>
			</div>

			<!-- Feature cards -->
			<div class="px-6 sm:px-8 pb-6 sm:pb-8">
				<div class="space-y-2">
					{#each featureAnnouncement.features as item, i (item.title)}
						{@const Icon = featureIconComponent(item.icon)}
						<button
							type="button"
							class="group w-full text-left rounded-2xl border-2 border-base-300 p-4 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:-translate-y-0.5 hover:shadow-md"
							onclick={async () => {
								await dismissFeatureSpotlight();
								await goto(featureHref(item));
							}}
						>
							<div class="flex items-center gap-4">
								<div class="w-10 h-10 rounded-xl bg-base-200 text-base-content/60 flex items-center justify-center shrink-0 group-hover:bg-primary/15 group-hover:text-primary transition-all duration-200 group-hover:scale-110">
									<Icon size={18} />
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<div class="font-semibold text-sm">{item.title}</div>
										{#if i === 0}
											<span class="badge badge-xs badge-primary badge-soft rounded-full">New</span>
										{/if}
									</div>
									<p class="text-xs text-base-content/50 mt-0.5 leading-relaxed">
										{item.description}
									</p>
								</div>
								<div class="text-base-content/20 shrink-0 transition-all duration-200 group-hover:text-primary group-hover:translate-x-1">
									<ArrowRightIcon size={16} />
								</div>
							</div>
						</button>
					{/each}
				</div>

				{#if featureSpotlightError}
					<div class="alert alert-error rounded-xl mt-4">
						<span class="text-sm">{featureSpotlightError}</span>
					</div>
				{/if}

				<div class="mt-6 flex items-center justify-between gap-3">
					<a href="/changelog" class="text-xs text-base-content/40 hover:text-primary transition-colors duration-150" onclick={dismissFeatureSpotlight}>
						See all updates
					</a>
					<div class="flex items-center gap-2">
						<button
							type="button"
							class="btn btn-ghost btn-sm rounded-full text-base-content/60"
							onclick={async () => {
								const href = featureAnnouncement.ctaHref || '/classes';
								await dismissFeatureSpotlight();
								await goto(href);
							}}
						>
							{featureAnnouncement.ctaLabel}
						</button>
						<button
							class="btn btn-primary btn-soft rounded-full"
							onclick={dismissFeatureSpotlight}
							disabled={featureSpotlightAcknowledging}
						>
							{featureSpotlightAcknowledging ? 'Saving...' : 'Got it'}
						</button>
					</div>
				</div>
			</div>
		</div>
		<div
			class="modal-backdrop bg-black/50"
			role="button"
			tabindex="-1"
			aria-label="Dismiss feature update"
			onclick={dismissFeatureSpotlight}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') void dismissFeatureSpotlight();
			}}
		></div>
	</dialog>
{/if}

<style>
	@keyframes moduleReveal {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.scrollbar-none {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}

</style>
