<script lang="ts">
	import type { PageData } from './$types';
	import { useQuery } from 'convex-svelte';
	import { resolve } from '$app/paths';
	import { api } from '../../convex/_generated/api';
	import BadgeShield from '$lib/components/badges/BadgeShield.svelte';
	import { ArrowLeft, HelpCircle, Search, Star, Trophy, Users } from 'lucide-svelte';
	import { getBadgeIcon } from '$lib/components/badges/icons';

	let { data }: { data: PageData } = $props();

	const boardQuery = useQuery(api.badges.getCohortBadgeBoard, {});
	let searchQuery = $state('');
	let sortMode = $state<'leaderboard' | 'az'>('leaderboard');
	let selectedMemberId = $state<string | null>(null);

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

	function formatRelative(ts: number | undefined | null) {
		if (!ts) return '—';
		const diffMs = Date.now() - ts;
		const minutes = Math.floor(diffMs / 60000);
		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days}d ago`;
		const weeks = Math.floor(days / 7);
		if (weeks < 5) return `${weeks}w ago`;
		const months = Math.floor(days / 30);
		if (months < 12) return `${months}mo ago`;
		return `${Math.floor(days / 365)}y ago`;
	}

	function formatRole(role: string) {
		if (!role) return 'Member';
		return role.charAt(0).toUpperCase() + role.slice(1);
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
	const selectedMember = $derived(
		boardQuery.data?.members.find((member) => member.userId === selectedMemberId) ?? null
	);
</script>

<main class="mx-auto min-h-screen w-full max-w-7xl px-4 py-10 md:px-8">
	<a class="btn btn-ghost btn-sm rounded-full mb-4" href={resolve('/classes')}>
		<ArrowLeft size={16} />
		Back to classes
	</a>

	{#if boardQuery.isLoading}
		<div class="space-y-4">
			<div class="skeleton h-44 w-full rounded-2xl"></div>
			{#each Array.from({ length: 6 }, (_, i) => i) as i (i)}
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
							class="w-full bg-transparent py-2 text-sm outline-hidden"
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
					{#each filteredMembers as member (member.userId)}
						{@const isCurrentUser = currentUserId && member.userId === currentUserId}
						<button
							type="button"
							class="member-row flex w-full items-center gap-4 px-3 py-3 text-left"
							class:member-row--you={isCurrentUser}
							onclick={() => (selectedMemberId = member.userId)}
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
								{#each member.recentAwards.slice(0, BADGE_SLOT_COUNT) as award (award.awardId)}
									{@const BadgeIcon = getBadgeIcon(award.iconKey)}
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
								{#each Array.from({ length: mysterySlotsFor(member.recentAwards.length) }, (_, mysteryIdx) => mysteryIdx) as mysteryIdx (mysteryIdx)}
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
						</button>
					{/each}
				</div>
			{/if}
		</section>

		{#if selectedMember}
			<dialog class="modal modal-open">
				<div
					class="trophy-modal modal-box max-w-xl overflow-visible rounded-2xl border border-base-300 p-0"
				>
					<button
						type="button"
						class="btn btn-circle btn-ghost btn-sm absolute right-3 top-3 z-10"
						aria-label="Close member details"
						onclick={() => (selectedMemberId = null)}
					>
						✕
					</button>

					<header class="trophy-header relative flex flex-col items-center px-6 pt-10 pb-6">
						<div class="trophy-halo" aria-hidden="true"></div>
						<div class="avatar-stage relative">
							<div class="avatar-glow" aria-hidden="true"></div>
							<div class="avatar-ring" aria-hidden="true"></div>
							<div class="avatar relative">
								<div class="avatar-img h-28 w-28 rounded-full bg-base-200 ring-2 ring-base-100">
									{#if selectedMember.imageUrl}
										<img src={selectedMember.imageUrl} alt={selectedMember.name} />
									{:else}
										<div class="flex h-full w-full items-center justify-center text-base-content/50">
											<Users size={40} />
										</div>
									{/if}
								</div>
							</div>
						</div>

						<h3 class="mt-5 text-center text-xl font-semibold leading-tight">
							{selectedMember.name}
						</h3>

						<div class="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
							<span class="role-chip">{formatRole(selectedMember.role)}</span>
							{#if selectedMember.userId === currentUserId}
								<span class="role-chip role-chip--you">You</span>
							{/if}
						</div>
					</header>

					<div class="trophy-divider" aria-hidden="true"></div>

					<dl class="grid grid-cols-3 px-6 py-5">
						<div class="stat-cell">
							<dt class="stat-label">Badges</dt>
							<dd class="stat-value">{selectedMember.earnedCount}</dd>
						</div>
						<div class="stat-cell stat-cell--bordered">
							<dt class="stat-label">Contributed</dt>
							<dd class="stat-value">{selectedMember.questionsContributed}</dd>
							<dd class="stat-meta">questions</dd>
						</div>
						<div class="stat-cell">
							<dt class="stat-label">Last seen</dt>
							<dd class="stat-value-sm">{formatRelative(selectedMember.lastActiveAt)}</dd>
						</div>
					</dl>

					<div class="trophy-divider" aria-hidden="true"></div>

					{#if selectedMember.awards.length === 0}
						<div class="px-6 py-12 text-center">
							<p class="text-sm text-base-content/55">No badges earned yet.</p>
						</div>
					{:else}
						<section class="px-6 pt-6 pb-7">
							<p
								class="mb-5 text-[10px] font-medium uppercase tracking-[0.22em] text-base-content/45"
							>
								Trophy case
							</p>
							<ul class="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4">
								{#each selectedMember.awards as award, i (award.awardId)}
									{@const AwardIcon = getBadgeIcon(award.iconKey)}
									<li
										class="trophy-tile flex flex-col items-center text-center"
										style={`--delay:${Math.min(i, 11) * 45}ms`}
									>
										<div class="tooltip tooltip-top" data-tip={award.description}>
											<BadgeShield
												idBase={`modal-${selectedMember.userId}-${award.awardId}`}
												size={60}
												gradient={award.gradient}
												iconColor={award.iconColor}
												icon={AwardIcon}
											/>
										</div>
										<p
											class="mt-2.5 line-clamp-2 text-[11px] font-medium leading-tight text-base-content/85"
										>
											{award.name}
										</p>
										<p class="mt-1 text-[10px] tracking-wide text-base-content/45">
											{formatDate(award.awardedAt)}
										</p>
									</li>
								{/each}
							</ul>
						</section>
					{/if}
				</div>
				<button
					type="button"
					class="modal-backdrop"
					aria-label="Close member details"
					onclick={() => (selectedMemberId = null)}
				>
					close
				</button>
			</dialog>
		{/if}
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

	.member-row {
		position: relative;
		border-radius: 0.5rem;
		transition:
			background-color 220ms ease,
			transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1);
	}

	.member-row::after {
		content: '';
		position: absolute;
		left: 0;
		top: 50%;
		width: 3px;
		height: 0;
		background: var(--color-primary);
		border-radius: 999px;
		transform: translateY(-50%);
		transition: height 240ms cubic-bezier(0.2, 0.7, 0.2, 1);
	}

	.member-row:hover {
		background: color-mix(in oklab, var(--color-base-content) 4%, transparent);
		transform: translateX(2px);
	}

	.member-row:hover::after {
		height: 60%;
	}

	.member-row :global(.avatar > div) {
		transition:
			transform 260ms cubic-bezier(0.2, 0.7, 0.2, 1),
			box-shadow 260ms ease;
	}

	.member-row:hover :global(.avatar > div) {
		transform: scale(1.06);
		box-shadow: 0 6px 18px color-mix(in oklab, var(--color-primary) 22%, transparent);
	}

	.member-row :global(.tooltip > div) {
		transition: transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1);
	}

	.member-row:hover :global(.tooltip:nth-child(1) > div) {
		transform: translateY(-2px) rotate(-3deg);
	}
	.member-row:hover :global(.tooltip:nth-child(2) > div) {
		transform: translateY(-2px) rotate(-1deg);
	}
	.member-row:hover :global(.tooltip:nth-child(3) > div) {
		transform: translateY(-2px) rotate(1deg);
	}
	.member-row:hover :global(.tooltip:nth-child(4) > div) {
		transform: translateY(-2px) rotate(3deg);
	}

	.member-row--you {
		border-left: 3px solid var(--color-primary);
		background: color-mix(in oklab, var(--color-primary) 5%, transparent);
	}

	.member-row--you::after {
		display: none;
	}

	.mystery-badge-wrap {
		opacity: 0.92;
	}

	.mystery-badge {
		filter: blur(1px) saturate(0.86);
		opacity: 0.88;
	}

	.trophy-modal {
		background:
			radial-gradient(
				ellipse 80% 70% at 50% -10%,
				color-mix(in oklab, var(--color-primary) 12%, transparent),
				transparent 60%
			),
			var(--color-base-100);
		animation: modalRise 360ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
	}

	@keyframes modalRise {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.985);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.trophy-header {
		isolation: isolate;
		overflow: hidden;
		border-top-left-radius: 1rem;
		border-top-right-radius: 1rem;
	}

	.trophy-tile :global(.tooltip):before {
		max-width: 200px;
		width: max-content;
		white-space: normal;
		text-align: center;
		font-size: 11px;
		line-height: 1.35;
		padding: 0.4rem 0.6rem;
	}

	.trophy-halo {
		position: absolute;
		left: 50%;
		top: -40%;
		width: 360px;
		height: 360px;
		transform: translateX(-50%);
		background: radial-gradient(
			circle at center,
			color-mix(in oklab, var(--color-primary) 22%, transparent),
			transparent 60%
		);
		filter: blur(20px);
		opacity: 0.7;
		pointer-events: none;
		z-index: -1;
	}

	.avatar-stage {
		animation: avatarIn 520ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
		animation-delay: 80ms;
	}

	@keyframes avatarIn {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.85);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.avatar-glow {
		position: absolute;
		inset: -22px;
		border-radius: 999px;
		background: conic-gradient(
			from 220deg,
			color-mix(in oklab, var(--color-primary) 55%, transparent),
			color-mix(in oklab, var(--color-secondary) 40%, transparent),
			color-mix(in oklab, var(--color-primary) 55%, transparent)
		);
		filter: blur(18px);
		opacity: 0.55;
		pointer-events: none;
		animation: haloSpin 14s linear infinite;
	}

	@keyframes haloSpin {
		to {
			transform: rotate(360deg);
		}
	}

	.avatar-ring {
		position: absolute;
		inset: -6px;
		border-radius: 999px;
		background: conic-gradient(
			from 0deg,
			color-mix(in oklab, var(--color-primary) 80%, white),
			color-mix(in oklab, var(--color-secondary) 70%, white),
			#fde68a,
			color-mix(in oklab, var(--color-primary) 80%, white)
		);
		padding: 2px;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
		pointer-events: none;
	}

	.avatar-img {
		box-shadow: 0 14px 40px color-mix(in oklab, black 22%, transparent);
	}

	.role-chip {
		display: inline-flex;
		align-items: center;
		padding: 0.15rem 0.55rem;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: color-mix(in oklab, var(--color-base-content) 65%, transparent);
		background: color-mix(in oklab, var(--color-base-content) 6%, transparent);
		border: 1px solid color-mix(in oklab, var(--color-base-content) 12%, transparent);
		border-radius: 999px;
	}

	.role-chip--you {
		color: var(--color-primary-content);
		background: var(--color-primary);
		border-color: transparent;
	}

	.stat-cell {
		text-align: center;
		padding: 0 0.5rem;
	}

	.stat-cell--bordered {
		border-left: 1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent);
		border-right: 1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent);
	}

	.stat-label {
		font-size: 9.5px;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: color-mix(in oklab, var(--color-base-content) 50%, transparent);
	}

	.stat-value {
		margin-top: 0.35rem;
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		color: color-mix(in oklab, var(--color-base-content) 92%, transparent);
	}

	.stat-value-sm {
		margin-top: 0.5rem;
		font-size: 0.95rem;
		font-weight: 600;
		line-height: 1.1;
		color: color-mix(in oklab, var(--color-base-content) 88%, transparent);
	}

	.stat-meta {
		margin-top: 0.2rem;
		font-size: 10px;
		color: color-mix(in oklab, var(--color-base-content) 45%, transparent);
	}

	.trophy-divider {
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in oklab, var(--color-base-content) 14%, transparent) 20%,
			color-mix(in oklab, var(--color-base-content) 14%, transparent) 80%,
			transparent
		);
	}

	@keyframes trophyTileIn {
		from {
			opacity: 0;
			transform: translateY(6px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.trophy-tile {
		opacity: 0;
		animation: trophyTileIn 380ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
		animation-delay: var(--delay, 0ms);
	}
</style>
