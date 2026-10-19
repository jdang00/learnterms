<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import type { PageData } from './$types';
	import { api } from '../../convex/_generated/api.js';
	import type { Doc, Id } from '../../convex/_generated/dataModel';
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import UserRoundPenIcon from '@lucide/svelte/icons/user-round-pen';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { page } from '$app/state';
	import { goto, pushState, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import FeatureSpotlight from '../../lib/components/FeatureSpotlight.svelte';
	import ModuleRow from '../../lib/components/ModuleRow.svelte';
	import ColorMark from '../../lib/components/ColorMark.svelte';
	import { classColor, summarizeClassProgress } from '$lib/utils/classProgress';
	import Sidebar from '../../lib/components/Sidebar.svelte';
	import ClassList from '../../lib/components/ClassList.svelte';
	import ClampedText from '../../lib/components/ClampedText.svelte';
	import ResetProgressSheet from '../../lib/components/ResetProgressSheet.svelte';
	import type { ClassWithSemester } from '../../lib/types';
	import { useClerkContext } from 'svelte-clerk/client';
	import * as Alert from '$lib/components/ui/alert';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	const client = useConvexClient();
	const ctx = useClerkContext();
	const name = $derived(ctx.user?.firstName);
	const user = $derived(ctx.user);

	let { data }: { data: PageData } = $props();
	const userData = $derived(data.userData);
	function hasUserDisplayNames(
		value: unknown
	): value is { schoolName?: string | null; cohortName?: string | null } {
		return typeof value === 'object' && value !== null;
	}
	const userSchoolName = $derived.by(() =>
		hasUserDisplayNames(userData) ? (userData.schoolName ?? null) : null
	);
	const userCohortName = $derived.by(() =>
		hasUserDisplayNames(userData) ? (userData.cohortName ?? null) : null
	);
	const dev = $derived(userData?.role === 'dev');
	const admin = $derived(userData?.role === 'admin');
	const curator = $derived(userData?.role === 'curator');

	let jumpBackScroller: HTMLDivElement | undefined = $state();
	let canScrollRight = $state(false);
	let featureSpotlightOpen = $state(false);
	let featureSpotlightSeenLocal = $state(false);
	let featureSpotlightAcknowledging = $state(false);
	let featureSpotlightError = $state<string | null>(null);
	let openedAnnouncementId = $state<string | null>(null);

	function checkScroll() {
		if (!jumpBackScroller) return;
		canScrollRight =
			jumpBackScroller.scrollLeft + jumpBackScroller.clientWidth < jumpBackScroller.scrollWidth - 4;
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

	const classesQuery = useQuery(api.class.getUserClasses, () =>
		userData?.cohortId ? { id: userData.cohortId as Id<'cohort'> } : 'skip'
	);

	const featureAnnouncementQuery = useQuery(api.featureAnnouncements.getCurrentForViewer, () =>
		userData?.cohortId ? {} : 'skip'
	);

	const classes = $derived({
		data: classesQuery.data || [],
		isLoading: classesQuery.isLoading,
		error: classesQuery.error
	});

	// The open class lives in history state, so the back gesture returns to the class list.
	const requestedClassId = $derived(
		page.state.classId ?? page.url.searchParams.get('classId') ?? null
	);
	const selectedClass: ClassWithSemester | null = $derived(
		requestedClassId
			? ((classes.data as ClassWithSemester[]).find((cls) => cls._id === requestedClassId) ?? null)
			: null
	);
	const currentView: 'classes' | 'modules' = $derived(selectedClass ? 'modules' : 'classes');

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

	// One rollup-backed query feeds the class cards, the module list, and the resume strip.
	const overviewQuery = useQuery(api.studyOverview.getMine, () =>
		userData?.cohortId ? {} : 'skip'
	);
	const progressByClass = $derived(
		new Map((overviewQuery.data?.classes ?? []).map((item) => [item.classId as string, item]))
	);
	const recentModules = $derived(overviewQuery.data?.recent ?? []);
	const recentModulesLoading = $derived(overviewQuery.isLoading);
	const recentModulesError = $derived(overviewQuery.error);

	const selectedProgress = $derived(
		selectedClass ? progressByClass.get(selectedClass._id) : undefined
	);
	const selectedSummary = $derived(
		selectedProgress ? summarizeClassProgress(selectedProgress.modules) : null
	);
	const moduleProgress = $derived(
		new Map((selectedProgress?.modules ?? []).map((m) => [m.moduleId as string, m]))
	);

	const modulesQuery = useQuery(api.module.getClassModules, () =>
		selectedClass && currentView === 'modules' ? { id: selectedClass._id } : 'skip'
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

	let resetOpen = $state(false);

	async function resetAllModules(removeHighlights: boolean) {
		if (!userData) throw new Error('User unavailable');
		for (const module of sortedModules) {
			await client.mutation(api.userProgress.clearUserProgressForModule, {
				userId: userData._id,
				moduleId: module._id,
				removeHighlights
			});
		}
	}

	function selectClass(classItem: ClassWithSemester | null) {
		if (!classItem) return;
		pushState('', { ...page.state, classId: classItem._id, classOpenedInPlace: true });
	}

	async function goBackToClasses() {
		if (page.state.classOpenedInPlace) {
			history.back();
			return;
		}
		if (page.url.searchParams.has('classId')) {
			await goto(resolve('/classes'), { replaceState: true });
			return;
		}
		replaceState('', { ...page.state, classId: undefined, classOpenedInPlace: undefined });
	}

	const featureCtaHref = $derived(
		featureAnnouncement?.ctaHref && !/\[[^/]+\]/.test(featureAnnouncement.ctaHref)
			? featureAnnouncement.ctaHref
			: '/classes'
	);

	function featureHref(item: {
		title: string;
		href?: string;
	}): '/cohort' | '/classes' | `/classes/${string}/tests/new` {
		if (item.href === '/cohort') return '/cohort';
		if (item.title === 'Build your own test') {
			const classId = selectedClass?._id ?? firstClassId;
			return classId ? `/classes/${classId}/tests/new` : '/classes';
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
			await client.mutation(api.featureAnnouncements.markSeen, {
				announcementId: announcement.id
			});
			featureSpotlightSeenLocal = true;
			featureSpotlightOpen = false;
		} catch (error: unknown) {
			featureSpotlightError = error instanceof Error ? error.message : 'Could not save this yet.';
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

<main class="min-h-screen px-4 pt-5 pb-10 sm:p-8 lg:mb-56">
	<div class="mb-6 flex flex-col gap-2 sm:mb-8">
		{#if user === undefined}
			<div class="flex flex-row gap-5 items-center">
				<Skeleton class="h-14 w-14 rounded-full shrink-0 hidden xl:block" />
				<div class="space-y-2">
					<Skeleton class="h-7 w-56" />
					<Skeleton class="h-4 w-72" />
				</div>
			</div>
		{:else if user === null}
			<h1 class="font-display text-2xl font-bold text-foreground">Welcome, Guest!</h1>
			<p class="text-foreground/60 text-sm">Here's your learning dashboard.</p>
		{:else}
			<div class="flex flex-row gap-5 items-center">
				<Avatar.Root
					class="hidden size-14 ring-3 ring-primary ring-offset-2 ring-offset-background transition-shadow duration-300 hover:shadow-md hover:shadow-primary/10 xl:flex"
				>
					<Avatar.Image src={user.imageUrl} alt="user profile" />
					<Avatar.Fallback />
				</Avatar.Root>

				<div>
					<h1 class="font-display text-2xl font-bold text-foreground mb-1">
						Hi, {name}!
					</h1>
					{#if userData === null}
						<Skeleton class="h-4 w-72 rounded-full" />
					{:else}
						<p class="text-foreground/60 text-sm">{userSchoolName}</p>
						{#if userData && !classes.isLoading}
							<div class="flex flex-wrap gap-1.5 mt-2">
								<Badge tone="primary">
									{userCohortName}
								</Badge>
								{#if dev}
									<Badge tone="error">
										<ShieldCheckIcon size={14} /> Dev
									</Badge>
								{/if}
								{#if admin}
									<Badge tone="secondary">
										<ShieldCheckIcon size={14} /> Admin
									</Badge>
								{/if}
								{#if curator}
									<Badge tone="accent">
										<UserRoundPenIcon size={14} /> Curator
									</Badge>
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
				<div class="mb-6 lg:hidden">
					<Sidebar variant="chips" />
				</div>

				{#if recentModulesLoading}
					<div class="mb-8">
						<Skeleton class="mb-3 h-6 w-32 rounded-full" />
						<div class="overflow-x-auto pb-1">
							<div class="flex min-w-max gap-2">
								{#each Array(3), i (i)}
									<div class="surface-sm px-3 py-2.5 animate-pulse min-w-[19rem]">
										<div class="flex items-center gap-3">
											<Skeleton class="h-5 w-5 rounded-sm" />
											<Skeleton class="h-3.5 w-32" />
											<Skeleton class="h-3.5 w-14" />
											<Skeleton class="h-1.5 w-16 rounded-full" />
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{:else if recentModulesError}
					<Alert.Root tone="error" class="mb-8 rounded-2xl shadow-xs">
						<Alert.Title>Failed to load recent modules: {recentModulesError.toString()}</Alert.Title
						>
					</Alert.Root>
				{:else if recentModules.length > 0}
					{@const resume = recentModules[0]}
					<a
						href={resolve('/classes/[classId]/modules/[moduleId]', {
							classId: resume.classId,
							moduleId: resume.moduleId
						})}
						class="mb-6 flex items-center gap-4 rounded-3xl border border-primary/25 bg-primary/5 p-4 transition-transform active:scale-[0.99] sm:hidden"
						in:fade={{ duration: 300, easing: cubicOut }}
					>
						<span class="text-4xl leading-none">{resume.moduleEmoji || '📘'}</span>
						<span class="min-w-0 flex-1">
							<span class="block text-xs font-medium text-primary-ink">Continue studying</span>
							<span class="block truncate font-semibold">{resume.moduleTitle}</span>
							<span class="mt-2 flex items-center gap-2 text-xs text-foreground/60">
								<span class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted-strong/70">
									<span
										class="block h-full rounded-full bg-success"
										style="width: {resume.progress}%;"
									></span>
								</span>
								<span class="tabular-nums">{resume.progress}%</span>
							</span>
						</span>
						<span
							class="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
							aria-hidden="true"
						>
							<ArrowRightIcon size={20} />
						</span>
					</a>
					<div
						in:fade={{ duration: 300, easing: cubicOut }}
						class="mb-8 sm:mb-10 {recentModules.length === 1 ? 'hidden sm:block' : ''}"
					>
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center gap-2">
								<h3 class="text-sm font-semibold text-foreground/70">
									<span class="sm:hidden">Also recent</span>
									<span class="max-sm:hidden">Pick up where you left off</span>
								</h3>
							</div>
							{#if canScrollRight}
								<button
									onclick={scrollRight}
									class="flex items-center gap-0.5 text-xs text-foreground/40 hover:text-primary-ink transition-colors duration-150"
								>
									<span>More</span>
									<ChevronRight size={14} />
								</button>
							{/if}
						</div>
						<div class="relative">
							<div
								bind:this={jumpBackScroller}
								onscroll={checkScroll}
								class="overflow-x-auto scrollbar-none"
							>
								<div class="flex min-w-max gap-2">
									{#each recentModules as recentModule, index (recentModule.moduleId)}
										<a
											href={resolve('/classes/[classId]/modules/[moduleId]', {
												classId: recentModule.classId,
												moduleId: recentModule.moduleId
											})}
											class="group flex min-h-12 items-center gap-2.5 rounded-xl bg-background border border-border pl-3 pr-4 py-2 transition-colors duration-150 hover:border-primary/40 active:bg-muted {index ===
											0
												? 'max-sm:hidden'
												: ''}"
										>
											<span class="text-base leading-none shrink-0"
												>{recentModule.moduleEmoji || '📘'}</span
											>
											<div class="min-w-0 flex flex-col gap-0.5">
												<span
													class="font-medium text-xs text-foreground truncate max-w-40 leading-tight group-hover:text-primary-ink transition-colors duration-150"
												>
													{recentModule.moduleTitle}
												</span>
												<span
													class="flex items-center gap-1.5 text-[11px] text-foreground/45 leading-tight"
												>
													<span>{recentModule.classCode}</span>
													<span class="inline-block w-0.5 h-0.5 rounded-full bg-foreground/25"
													></span>
													<span>{recentModule.progress}%</span>
												</span>
											</div>
											<div class="ml-1 shrink-0 w-10">
												<div class="h-1.5 rounded-full bg-muted-strong/60 overflow-hidden">
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
								<div
									class="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-muted/80 to-transparent rounded-r-xl"
								></div>
							{/if}
						</div>
					</div>
				{/if}

				<ClassList
					{classes}
					onSelectClass={selectClass}
					progress={progressByClass}
					progressLoading={overviewQuery.isLoading}
				/>
			{:else if currentView === 'modules' && selectedClass}
				<div in:fade={{ duration: 400, easing: cubicOut }} class="w-full">
					<header class="mb-4 flex flex-wrap items-center gap-3">
						<Button
							variant="ghost"
							tone="neutral"
							shape="circle"
							class="-ms-2 size-11 sm:ms-0 sm:size-8"
							aria-label="Back to classes"
							onclick={goBackToClasses}
						>
							<ArrowLeft size={16} />
						</Button>
						<ColorMark color={classColor(selectedClass)} class="size-8 shrink-0 text-foreground" />
						<div class="min-w-0 flex-1">
							<p class="font-mono text-xs text-foreground/55">{selectedClass.code}</p>
							<h2 class="text-xl leading-snug font-semibold text-balance text-foreground">
								{selectedClass.name}
							</h2>
						</div>
						<Button
							href={resolve('/classes/[classId]/tests/new', { classId: selectedClass._id })}
							variant="soft"
							tone="primary"
							size="sm"
							class="order-last min-h-11 w-full sm:order-none sm:min-h-8 sm:w-auto"
						>
							<ClipboardCheck size={16} /> Test yourself
						</Button>
						{#if selectedClass.description}
							<div class="w-full">
								{#key selectedClass.description}
									<ClampedText
										text={selectedClass.description}
										class="max-w-3xl text-sm leading-relaxed text-foreground/65"
									/>
								{/key}
							</div>
						{/if}
					</header>

					{#if sortedModules.length > 0 || selectedSummary?.modules}
						<div class="mb-2 flex min-h-11 items-center justify-between gap-3 sm:min-h-8">
							<p class="text-xs text-foreground/60 tabular-nums">
								{#if selectedSummary?.modules}
									{selectedSummary.started} of {selectedSummary.modules}
									{selectedSummary.modules === 1 ? 'module' : 'modules'} started
									{#if selectedSummary.mastered}· {selectedSummary.mastered} mastered{/if}
								{/if}
							</p>
							{#if sortedModules.length > 0}
								<Button
									variant="ghost"
									tone="neutral"
									size="sm"
									class="min-h-11 text-foreground/60 sm:min-h-8"
									onclick={() => (resetOpen = true)}
								>
									<RotateCcw size={14} /> Reset all
								</Button>
							{/if}
						</div>
					{/if}

					{#if modules.isLoading}
						<div class="overflow-hidden surface">
							{#each Array(5), index (index)}
								<div
									class="flex items-center gap-4 border-b border-border px-4 py-4 last:border-b-0"
								>
									<Skeleton class="h-3 w-5" />
									<Skeleton class="size-7 rounded-lg" />
									<div class="flex-1 space-y-2">
										<Skeleton class="h-4 w-1/2" />
										<Skeleton class="h-3 w-24" />
									</div>
									<Skeleton class="hidden h-1.5 w-28 rounded-full md:block" />
								</div>
							{/each}
						</div>
					{:else if modules.error}
						<Alert.Root tone="error" class="rounded-2xl shadow-xs">
							<Alert.Title>Failed to load modules: {modules.error.toString()}</Alert.Title>
						</Alert.Root>
					{:else if !modules.data || modules.data.length === 0}
						<div class="surface shadow-xs p-8">
							<div class="text-center py-8">
								<div class="text-5xl mb-4">📚</div>
								<h3 class="text-lg font-semibold mb-2 text-foreground">No modules yet</h3>
								<p class="text-foreground/60 text-sm">
									Modules will appear here once they are added to this class.
								</p>
							</div>
						</div>
					{:else}
						<ol
							class="divide-y divide-border overflow-hidden surface"
							aria-label="Modules in {selectedClass.name}"
						>
							{#each sortedModules as module, i (module._id)}
								<li style="animation: moduleReveal 0.35s cubic-bezier(.16,1,.3,1) {i * 30}ms both;">
									<ModuleRow
										{module}
										classId={selectedClass._id}
										position={i + 1}
										progress={moduleProgress.get(module._id)}
									/>
								</li>
							{/each}
						</ol>
					{/if}

					<ResetProgressSheet
						bind:open={resetOpen}
						title="Reset all modules?"
						confirmLabel="Reset all modules"
						highlightsNote="Also erase your stem highlights in this class."
						onconfirm={resetAllModules}
					>
						Start every module in {selectedClass.name} over with blank answers. This clears your current
						results, flags, and saved answers. Your mastery and past study activity are kept.
					</ResetProgressSheet>
				</div>
			{/if}
		</div>

		<div class="hidden lg:block">
			<Sidebar />
		</div>
	</div>
</main>

{#if featureAnnouncement}
	<FeatureSpotlight
		announcement={featureAnnouncement}
		open={featureSpotlightOpen}
		saving={featureSpotlightAcknowledging}
		error={featureSpotlightError}
		showCta={featureCtaHref !== page.url.pathname}
		canOpen={(item) => featureHref(item) !== page.url.pathname}
		ondismiss={dismissFeatureSpotlight}
		onopenfeature={async (item) => {
			await dismissFeatureSpotlight();
			await goto(resolve(featureHref(item)));
		}}
		oncta={async () => {
			await dismissFeatureSpotlight();
			window.location.assign(featureCtaHref);
		}}
	/>
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
