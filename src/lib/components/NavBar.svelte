<script lang="ts">
	import { SignedIn, SignedOut, SignInButton, UserButton } from 'svelte-clerk';
	import { useClerkContext } from 'svelte-clerk/client';
	import ThemeToggle from './ThemeToggle.svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';
	import { Search, Check, ArrowRightLeft, School, Users, BookOpen, BarChart3, Hash, KeyRound, Layers } from 'lucide-svelte';

	const ctx = useClerkContext();
	const user = $derived(ctx.user);

	const client = useConvexClient();

	// useQuery at top level with skip pattern
	const userDataQuery = useQuery(
		api.users.getUserById,
		() => (user ? { id: user.id } : 'skip')
	);

	// Check subscription status for pro badge
	const subscriptionQuery = useQuery(api.polar.getCurrentUserWithSubscription, () =>
		user ? {} : 'skip'
	);

	const dev = $derived(userDataQuery.data?.role === 'dev');
	// Check subscription status instead of plan field
	const isPro = $derived(
		subscriptionQuery.data?.isPro ||
			subscriptionQuery.data?.subscription?.status === 'active' ||
			subscriptionQuery.data?.subscription?.status === 'trialing'
	);

	const cohortsList = useQuery(
		api.cohort.listCohortsWithSchools,
		() => dev ? {} : 'skip'
	);

	let selectedCohortId = $state('');
	let isCohortPaletteOpen = $state(false);
	let cohortSearch = $state('');
	let isSwitchingCohort = $state(false);

	type CohortItem = {
		_id: string;
		name: string;
		schoolName?: string;
		startYear?: string;
		endYear?: string;
		classCode?: string;
		stats?: { totalStudents?: number; totalQuestions?: number; totalModules?: number; averageCompletion?: number };
	};
	const allCohorts = $derived((cohortsList?.data ?? []) as CohortItem[]);
	const activeCohortId = $derived.by(
		() => selectedCohortId || (userDataQuery.data?.cohortId as string | undefined) || ''
	);
	const selectedCohort = $derived.by(() => {
		const targetId = activeCohortId;
		if (!targetId) return null;
		return allCohorts.find((c) => c._id === targetId) ?? null;
	});
	const filteredCohorts = $derived.by(() => {
		const query = cohortSearch.trim().toLowerCase();
		if (!query) return allCohorts;
		return allCohorts.filter((c) =>
			`${c.name} ${c.schoolName ?? ''} ${c._id}`.toLowerCase().includes(query)
		);
	});

	// Reflect database cohort to selection
	$effect(() => {
		if (userDataQuery && !userDataQuery.isLoading && userDataQuery.data) {
			const dbCohortId = userDataQuery.data.cohortId as string | undefined;
			selectedCohortId = dbCohortId || '';
		}
	});

	$effect(() => {
		if (!user) {
			selectedCohortId = '';
		}
	});

	async function handleCohortChange(cohortIdStr: string) {
		if (!user) return;
		if (!cohortIdStr || cohortIdStr === activeCohortId) {
			isCohortPaletteOpen = false;
			return;
		}
		selectedCohortId = cohortIdStr;
		isSwitchingCohort = true;
		try {
			await client.mutation(api.authQueries.switchCohort, {
				cohortId: cohortIdStr as Id<'cohort'>
			});
			isCohortPaletteOpen = false;
			setTimeout(() => location.reload(), 10);
		} finally {
			isSwitchingCohort = false;
		}
	}
</script>

<div class="navbar bg-base-100 h-16">
	<div class="navbar-start">
		<a class="btn btn-ghost rounded-full text-xl" href="/">LearnTerms</a>
	</div>

	{#if dev}
		<!-- Mobile: hamburger that opens the palette -->
		<div class="navbar-center flex sm:hidden">
			<button
				type="button"
				class="btn btn-ghost btn-sm btn-circle"
				onclick={() => {
					isCohortPaletteOpen = true;
					cohortSearch = '';
				}}
				aria-label="Switch cohort"
			>
				<ArrowRightLeft size={16} />
			</button>
		</div>

		<!-- Desktop: full pill button -->
		<div class="navbar-center hidden sm:flex">
			<button
				type="button"
				class="btn btn-outline btn-sm rounded-full border-base-300 hover:border-primary hover:bg-primary/5 px-3 max-w-[20rem] lg:max-w-[26rem]"
				onclick={() => {
					isCohortPaletteOpen = true;
					cohortSearch = '';
				}}
			>
				<ArrowRightLeft size={12} class="shrink-0 opacity-50" />
				<span class="truncate text-xs">
					{#if selectedCohort}
						<span class="font-medium">{selectedCohort.name}</span>{#if selectedCohort.schoolName}<span class="font-normal text-base-content/40">&ensp;·&ensp;{selectedCohort.schoolName}</span>{/if}
					{:else}
						<span class="font-medium">Select cohort</span>
					{/if}
				</span>
			</button>
		</div>
	{/if}

	<div class="navbar-end">
		<div class="flex flex-row gap-4">
			<ThemeToggle variant="ghost" size="md" class="btn-circle m-1" />

			{#if isPro}
				<div class="self-center">
					<div class="badge badge-primary badge-outline rounded-full hidden sm:block">PRO</div>
				</div>
			{/if}

			<div class="self-center">
				<SignedIn>
					<div class="mt-1">
						<UserButton afterSignOutUrl="/" />
					</div>
				</SignedIn>
				<SignedOut>
					<div class="btn btn-outline btn-primary rounded-full self-end">
						<SignInButton
							forceRedirectUrl="/sign-in"
							fallbackRedirectUrl="/sign-in"
							signUpForceRedirectUrl="/sign-up"
							signUpFallbackRedirectUrl="/sign-up"
						/>
					</div>
				</SignedOut>
			</div>
		</div>
	</div>
</div>

{#if dev}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<dialog
		class="modal max-w-full p-4"
		class:modal-open={isCohortPaletteOpen}
		onkeydown={(e) => { if (e.key === 'Escape') isCohortPaletteOpen = false; }}
	>
		<div class="modal-box w-full max-w-xl rounded-2xl border border-base-300 p-0 shadow-2xl">
			<div class="flex items-center gap-2.5 border-b border-base-300 px-4">
				<Search size={15} class="shrink-0 text-base-content/40" />
				<input
					type="text"
					class="h-12 w-full bg-transparent text-sm outline-none placeholder:text-base-content/40"
					placeholder="Search by name, school, or ID..."
					bind:value={cohortSearch}
				/>
				<kbd class="kbd kbd-xs opacity-40">esc</kbd>
			</div>

			<div class="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
				{#if cohortsList?.isLoading}
					<div class="flex items-center justify-center py-10">
						<span class="loading loading-spinner loading-sm text-base-content/30"></span>
					</div>
				{:else if filteredCohorts.length === 0}
					<p class="py-10 text-center text-sm text-base-content/40">No cohorts match your search</p>
				{:else}
					<div class="px-3 pb-1 pt-1.5">
						<span class="text-[11px] font-medium uppercase tracking-wider text-base-content/30">
							{filteredCohorts.length} cohort{filteredCohorts.length !== 1 ? 's' : ''}
						</span>
					</div>
					{#each filteredCohorts as c (c._id)}
						{@const hasStats = c.stats?.totalStudents != null || c.stats?.totalQuestions != null}
						<button
							type="button"
							class="group w-full rounded-xl px-3 py-2.5 text-left transition-colors duration-100
								{activeCohortId === c._id
									? 'bg-primary/8 ring-1 ring-primary/20'
									: 'hover:bg-base-200/50'}"
							onclick={() => handleCohortChange(c._id)}
							disabled={isSwitchingCohort}
						>
							<div class="flex items-start gap-2.5">
								<div class="flex h-4 w-4 shrink-0 items-center justify-center mt-[3px]">
									{#if activeCohortId === c._id}
										<Check size={14} class="text-primary" />
									{/if}
								</div>
								<div class="min-w-0 flex-1 space-y-1">
									<div class="flex items-baseline justify-between gap-2">
										<p class="text-[13px] font-semibold leading-snug break-words
											{activeCohortId === c._id ? 'text-primary' : ''}">{c.name}</p>
										{#if c.startYear && c.endYear}
											<span class="shrink-0 text-[10px] tabular-nums text-base-content/35">{c.startYear}–{c.endYear}</span>
										{/if}
									</div>

									{#if c.schoolName}
										<div class="flex items-start gap-1.5 text-base-content/45">
											<School size={11} class="shrink-0 mt-px" />
											<span class="text-[11px] leading-snug break-words">{c.schoolName}</span>
										</div>
									{/if}

									<div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-base-content/30">
										{#if hasStats}
											{#if c.stats?.totalStudents != null}
												<span class="flex items-center gap-1">
													<Users size={10} class="shrink-0" />
													{c.stats.totalStudents}
												</span>
											{/if}
											{#if c.stats?.totalQuestions != null}
												<span class="flex items-center gap-1">
													<BookOpen size={10} class="shrink-0" />
													{c.stats.totalQuestions}
												</span>
											{/if}
											{#if c.stats?.totalModules != null}
												<span class="flex items-center gap-1">
													<Layers size={10} class="shrink-0" />
													{c.stats.totalModules}
												</span>
											{/if}
											{#if c.stats?.averageCompletion != null}
												<span class="flex items-center gap-1">
													<BarChart3 size={10} class="shrink-0" />
													{Math.round(c.stats.averageCompletion)}%
												</span>
											{/if}
										{/if}
										{#if c.classCode}
											<span class="flex items-center gap-1">
												<KeyRound size={10} class="shrink-0" />
												{c.classCode}
											</span>
										{/if}
									</div>

									<div class="flex items-center gap-1 text-base-content/20">
										<Hash size={9} class="shrink-0" />
										<span class="font-mono text-[9px] break-all leading-tight">{c._id}</span>
									</div>
								</div>
							</div>
						</button>
					{/each}
				{/if}
			</div>

			{#if selectedCohort}
				<div class="border-t border-base-300 px-4 py-2 flex items-center justify-between gap-3">
					<div class="flex items-center gap-2 text-[11px] text-base-content/40 min-w-0">
						<span class="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success"></span>
						<span class="truncate font-medium">{selectedCohort.name}</span>
						{#if selectedCohort.schoolName}
							<span class="text-base-content/20">·</span>
							<span class="truncate text-base-content/30">{selectedCohort.schoolName}</span>
						{/if}
					</div>
					<span class="font-mono text-[9px] text-base-content/20 shrink-0">{selectedCohort._id}</span>
				</div>
			{/if}
		</div>

		<form method="dialog" class="modal-backdrop">
			<button onclick={() => (isCohortPaletteOpen = false)}>close</button>
		</form>
	</dialog>
{/if}
