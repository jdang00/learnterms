<script lang="ts">
	import type { PageData } from './$types';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import BadgeShield from '$lib/components/badges/BadgeShield.svelte';
	import {
		ArrowLeft,
		BookOpen,
		Flame,
		Heart,
		HelpCircle,
		Lightbulb,
		Moon,
		Search,
		Star,
		Sunrise,
		Trophy,
		Users,
		Zap
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	const boardQuery = useQuery(api.badges.getCohortBadgeBoard, {});
	let searchQuery = $state('');
	let sortMode = $state<'leaderboard' | 'az'>('leaderboard');

	const iconMap: Record<string, any> = {
		users: Users,
		flame: Flame,
		star: Star,
		book: BookOpen,
		sunrise: Sunrise,
		lightbulb: Lightbulb,
		heart: Heart,
		moon: Moon,
		zap: Zap
	};
	const BADGE_SLOT_COUNT = 4;
	const mysteryGradient = { from: '#93c5fd', mid: '#3b82f6', to: '#1d4ed8' };
	const mysteryIconColor = '#dbeafe';

	function formatDate(ts: number) {
		return new Date(ts).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function mysterySlotsFor(awardCount: number) {
		return Math.max(0, BADGE_SLOT_COUNT - Math.min(awardCount, BADGE_SLOT_COUNT));
	}

	const filteredMembers = $derived.by(() => {
		const members = boardQuery.data?.members ?? [];
		const query = searchQuery.trim().toLowerCase();

		const filtered = members.filter((member) => {
			return !query || member.name.toLowerCase().includes(query);
		});

		if (sortMode === 'az') {
			return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
		}

		return [...filtered].sort((a, b) => {
			if (b.earnedCount !== a.earnedCount) return b.earnedCount - a.earnedCount;
			return a.name.localeCompare(b.name);
		});
	});

	const currentUserId = $derived(data.userData?._id);
</script>

<main class="mx-auto min-h-screen w-full max-w-7xl px-4 py-10 md:px-8">
	<a class="btn btn-ghost btn-sm rounded-full mb-4" href="/classes">
		<ArrowLeft size={16} />
		Back to classes
	</a>

	{#if boardQuery.isLoading}
		<div class="space-y-4">
			<div class="skeleton h-44 w-full rounded-2xl"></div>
			{#each Array(6) as _, i}
				<div class="skeleton h-16 w-full rounded-xl" style={`--i:${i}`}></div>
			{/each}
		</div>
	{:else if boardQuery.error}
		<div class="alert alert-error rounded-2xl">
			Failed to load class activity: {boardQuery.error.message}
		</div>
	{:else if boardQuery.data}
		{@const cohort = boardQuery.data.cohort}
		<section
			class="hero-card relative isolate overflow-hidden rounded-2xl border border-base-300 p-5 md:p-7"
		>
			<div class="hero-orb hero-orb-a"></div>
			<div class="hero-orb hero-orb-b"></div>
			<div class="hero-shine"></div>
			<div class="relative z-10 flex items-start gap-4">
				<div class="avatar mt-1 shrink-0">
					<div class="hero-avatar w-14 rounded-2xl ring-1 ring-base-300">
						{#if cohort.picUrl}
							<img src={cohort.picUrl} alt={cohort.name} />
						{:else}
							<div
								class="flex h-full w-full items-center justify-center bg-base-200 text-base-content/60"
							>
								<Users size={20} />
							</div>
						{/if}
					</div>
				</div>
				<div>
					<h1 class="text-2xl font-bold md:text-3xl">{cohort.name}</h1>
					<div
						class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/70"
					>
						{#if data.userData?.schoolName}
							<span>{data.userData.schoolName}</span>
						{/if}
						{#if cohort.startYear && cohort.endYear}
							<span>{cohort.startYear}–{cohort.endYear}</span>
						{/if}
						<span class="flex items-center gap-1">
							<Users size={14} />
							{boardQuery.data.members.length}
							{boardQuery.data.members.length === 1 ? 'member' : 'members'}
						</span>
					</div>
				</div>
			</div>
		</section>

		<section class="member-panel mt-5 rounded-2xl border border-base-300 p-4 md:p-5">
			<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<h2 class="font-semibold">Your Class</h2>
				<div class="join w-full max-w-md">
					<div
						class="join-item flex w-full items-center gap-2 border border-base-300 bg-base-100 px-3"
					>
						<Search size={14} class="text-base-content/50" />
						<input
							type="text"
							class="w-full bg-transparent py-2 text-sm outline-none"
							placeholder="Search classmate..."
							bind:value={searchQuery}
						/>
					</div>
				</div>
				<div class="flex flex-wrap gap-2">
					<button
						class="btn btn-sm rounded-full"
						class:btn-primary={sortMode === 'leaderboard'}
						class:btn-ghost={sortMode !== 'leaderboard'}
						onclick={() => (sortMode = 'leaderboard')}
					>
						<Trophy size={14} />
						Leaderboard
					</button>
					<button
						class="btn btn-sm rounded-full"
						class:btn-primary={sortMode === 'az'}
						class:btn-ghost={sortMode !== 'az'}
						onclick={() => (sortMode = 'az')}
					>
						A-Z
					</button>
				</div>
			</div>

			{#if filteredMembers.length === 0}
				<div
					class="mt-4 rounded-xl border border-dashed border-base-300 p-5 text-center text-sm text-base-content/60"
				>
					No matching members.
				</div>
			{:else}
				<div class="mt-4 divide-y divide-base-300">
					{#each filteredMembers as member}
						{@const isCurrentUser = currentUserId && member.userId === currentUserId}
						<div
							class="member-row flex items-center gap-4 px-3 py-3"
							class:member-row--you={isCurrentUser}
						>
							<div class="avatar shrink-0">
								<div class="h-10 w-10 rounded-full bg-base-200">
									{#if member.imageUrl}
										<img src={member.imageUrl} alt={member.name} />
									{:else}
										<div
											class="flex h-full w-full items-center justify-center text-base-content/60"
										>
											<Users size={16} />
										</div>
									{/if}
								</div>
							</div>

							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<p class="truncate font-semibold">{member.name}</p>
									{#if isCurrentUser}
										<span class="badge badge-xs badge-primary">You</span>
									{/if}
								</div>
								<p class="text-xs text-base-content/60">
									{member.earnedCount}
									{member.earnedCount === 1 ? 'badge' : 'badges'}
									{#if member.recentAwards.length > 0}
										<span class="text-base-content/40">·</span>
										Latest: {formatDate(member.recentAwards[0].awardedAt)}
									{/if}
								</p>
							</div>

							<div class="flex shrink-0 items-center gap-1.5">
								{#each member.recentAwards.slice(0, BADGE_SLOT_COUNT) as award}
									{@const BadgeIcon = iconMap[award.iconKey] ?? Star}
									<div class="tooltip tooltip-top z-20" data-tip={award.name}>
										<BadgeShield
											idBase={`member-${member.userId}-${award.awardId}`}
											size={36}
											gradient={award.gradient}
											iconColor={award.iconColor}
											icon={BadgeIcon}
										/>
									</div>
								{/each}
								{#each Array(mysterySlotsFor(member.recentAwards.length)) as _, mysteryIdx}
									<div class="tooltip tooltip-top z-20 mystery-badge-wrap" data-tip="?">
										<div class="mystery-badge">
											<BadgeShield
												idBase={`mystery-${member.userId}-${mysteryIdx}`}
												size={36}
												gradient={mysteryGradient}
												iconColor={mysteryIconColor}
												icon={HelpCircle}
											/>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</main>

<style>
	@keyframes heroSweep {
		0% {
			transform: translateX(-110%) rotate(12deg);
		}
		100% {
			transform: translateX(120%) rotate(12deg);
		}
	}

	.hero-card {
		position: relative;
		background:
			radial-gradient(
				ellipse 80% 100% at 8% 0%,
				color-mix(in oklab, var(--color-primary) 18%, transparent),
				transparent 55%
			),
			radial-gradient(
				ellipse 60% 90% at 92% 100%,
				color-mix(in oklab, var(--color-secondary) 14%, transparent),
				transparent 50%
			),
			var(--color-base-100);
	}

	.hero-card::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: linear-gradient(
				to right,
				color-mix(in oklab, var(--color-base-content) 6%, transparent) 1px,
				transparent 1px
			)
			0 0 / 28px 28px;
		pointer-events: none;
		mask-image: linear-gradient(to right, black 30%, transparent 70%);
		-webkit-mask-image: linear-gradient(to right, black 30%, transparent 70%);
	}

	.hero-shine {
		position: absolute;
		inset: -45% -35%;
		background: linear-gradient(
			110deg,
			transparent 40%,
			color-mix(in oklab, white 30%, transparent) 52%,
			transparent 63%
		);
		opacity: 0.15;
		mix-blend-mode: screen;
		pointer-events: none;
		z-index: 1;
		animation: heroSweep 1800ms ease-out 1 both;
		animation-delay: 300ms;
	}

	.hero-avatar {
		background: color-mix(in oklab, var(--color-base-100) 88%, transparent);
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--color-base-content) 10%, transparent),
			0 4px 12px color-mix(in oklab, black 10%, transparent);
	}

	.hero-orb {
		position: absolute;
		border-radius: 999px;
		filter: blur(40px);
		opacity: 0.35;
		pointer-events: none;
	}

	.hero-orb-a {
		width: 200px;
		height: 200px;
		top: -90px;
		left: -60px;
		background: color-mix(in oklab, var(--color-primary) 30%, transparent);
	}

	.hero-orb-b {
		width: 160px;
		height: 160px;
		right: -40px;
		bottom: -80px;
		background: color-mix(in oklab, var(--color-secondary) 24%, transparent);
	}

	.member-panel {
		background: var(--color-base-100);
	}

	.member-row--you {
		border-left: 3px solid var(--color-primary);
		background: color-mix(in oklab, var(--color-primary) 5%, transparent);
		border-radius: 0.5rem;
	}

	.mystery-badge-wrap {
		opacity: 0.92;
	}

	.mystery-badge {
		filter: blur(1px) saturate(0.86);
		opacity: 0.88;
	}
</style>
