<script lang="ts">
	import {
		Users,
		Flame,
		Star,
		BookOpen,
		Sunrise,
		Lightbulb,
		Heart,
		Moon,
		Zap,
		Globe,
		GraduationCap,
		Eye,
		EyeOff
	} from 'lucide-svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { Doc } from '../../../convex/_generated/dataModel';
	import BadgeShield from '$lib/components/badges/BadgeShield.svelte';

	const percentFormatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});

	const getIssuerLabel = (issuerType: Doc<'badgeDefinitions'>['issuerType']) => {
		if (issuerType === 'platform') return 'Platform';
		if (issuerType === 'cohort') return 'Cohort';
		return 'LearnTerms';
	};

	const badgeIconMap: Record<string, any> = {
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

	const issuerIconMap: Record<string, any> = {
		platform: Globe,
		cohort: GraduationCap
	};

	let showInternalDetails = $state(false);

	const badgesQuery = useQuery(api.badges.listBadgeCatalogForViewer, {});

	const badges = $derived.by(() => {
		const data = badgesQuery.data ?? [];
		return data.map((badge) => ({
			...badge,
			icon: badgeIconMap[badge.iconKey] ?? Star,
			issuerIcon: issuerIconMap[badge.issuerType] ?? Globe
		}));
	});
</script>

<main class="container mx-auto px-4 py-24">
	<h1 class="text-4xl font-bold text-center mb-12">Badge Catalog</h1>
	<p class="text-center text-sm text-base-content/65 -mt-9 mb-8">
		All possible badges users can earn.
	</p>
	<div class="flex justify-center mb-5">
		<a href="/cohort" class="btn btn-sm btn-outline">View Cohort Info</a>
	</div>
	<div class="view-toggle-wrap">
		<label class="view-toggle">
			<div class="view-toggle-copy">
				{#if showInternalDetails}
					<Eye size={14} />
					<span>Internal detail view</span>
				{:else}
					<EyeOff size={14} />
					<span>Public user view</span>
				{/if}
			</div>
			<input type="checkbox" class="toggle toggle-sm" bind:checked={showInternalDetails} />
		</label>
	</div>

	{#if badgesQuery.isLoading}
		<div class="text-center text-base-content/60">Loading badges...</div>
	{:else if badgesQuery.error}
		<div class="alert alert-error max-w-3xl mx-auto">
			Failed to load badges: {badgesQuery.error.message}
		</div>
	{:else if badges.length === 0}
		<div class="text-center text-base-content/60">No badges are published yet.</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
			{#each badges as badge, i}
				<div
					class="badge-frame flex flex-col items-center text-center w-full max-w-[340px] mx-auto px-6 py-7"
					style={`--delay: ${i * 45}ms`}
				>
					<div class="hover-3d badge-tilt">
						<BadgeShield
							idBase={`${badge.key}-${i}`}
							size={200}
							gradient={badge.gradient}
							iconColor={badge.iconColor}
							icon={badge.icon}
						/>

						<div></div>
						<div></div>
						<div></div>
						<div></div>
						<div></div>
						<div></div>
						<div></div>
						<div></div>
					</div>

					<div class="uppercase font-bold mt-4 text-lg">{badge.name}</div>
					<div class="text-sm text-base-content/70">{badge.description}</div>
					<div class="badge-stat">
						{percentFormatter.format(badge.ownedPct)}% of users have this badge
					</div>
					{#if showInternalDetails}
						<div class="badge-chip-row">
							<div class={`badge-source badge-source-${badge.issuerType}`}>
								{getIssuerLabel(badge.issuerType)}
							</div>
						</div>
					{/if}
					<div class="issuer-row">
						{#if badge.issuerIcon}
							{@const IssuerIcon = badge.issuerIcon}
							<IssuerIcon size={13} />
						{/if}
						{#if badge.issuerUrl}
							<a href={badge.issuerUrl} target="_blank" rel="noreferrer noopener"
								>Issued by {badge.issuerName}</a
							>
						{:else}
							<span>Issued by {badge.issuerName}</span>
						{/if}
					</div>
					{#if showInternalDetails}
						<div class="badge-meta-grid">
							<div class="badge-meta">
								<span class="badge-meta-label">Scope</span>
								<span>{badge.scopeLabel}</span>
							</div>
							<div class="badge-meta">
								<span class="badge-meta-label">Eligible</span>
								<span>{badge.eligibility}</span>
							</div>
							{#if badge.seasonLabel}
								<div class="badge-meta badge-meta-full">
									<span class="badge-meta-label">Season</span>
									<span>{badge.seasonLabel}</span>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</main>

<style>
	@keyframes badgeCardIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.badge-frame {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		border-radius: 1.1rem;
		border: 1px solid color-mix(in oklab, var(--color-base-content) 14%, transparent);
		background:
			linear-gradient(
					to right,
					color-mix(in oklab, var(--color-base-content) 8%, transparent) 1px,
					transparent 1px
				)
				0 0 / 28px 28px,
			linear-gradient(
					to bottom,
					color-mix(in oklab, var(--color-base-content) 8%, transparent) 1px,
					transparent 1px
				)
				0 0 / 28px 28px,
			linear-gradient(
				180deg,
				color-mix(in oklab, var(--color-base-200) 72%, transparent),
				color-mix(in oklab, var(--color-base-100) 95%, transparent)
			);
		animation: badgeCardIn 450ms ease both;
		animation-delay: var(--delay, 0ms);
	}

	.view-toggle-wrap {
		display: flex;
		justify-content: center;
		margin-bottom: 1.25rem;
	}

	.view-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.45rem 0.7rem;
		border-radius: 999px;
		border: 1px solid color-mix(in oklab, var(--color-base-content) 15%, transparent);
		background-color: color-mix(in oklab, var(--color-base-100) 80%, transparent);
	}

	.view-toggle-copy {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.78rem;
		color: color-mix(in oklab, var(--color-base-content) 74%, transparent);
	}

	.badge-frame::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		border-radius: inherit;
		box-shadow: inset 0 0 0 1px color-mix(in oklab, white 14%, transparent);
		opacity: 0.4;
	}

	.badge-frame::after {
		content: '';
		position: absolute;
		inset: 12px;
		pointer-events: none;
		border-radius: 0.85rem;
		border: 1px dashed color-mix(in oklab, var(--color-base-content) 14%, transparent);
		opacity: 0.45;
	}

	.badge-tilt > :first-child {
		overflow: visible;
		outline: none;
	}

	.badge-tilt > :first-child::before {
		display: none;
	}

	.badge-stat {
		margin-top: 0.6rem;
		font-size: 0.8rem;
		letter-spacing: 0.02em;
		color: color-mix(in oklab, var(--color-base-content) 66%, transparent);
	}

	.badge-chip-row {
		display: flex;
		gap: 0.45rem;
		align-items: center;
		margin-top: 0.6rem;
	}

	.badge-source {
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		border: 1px solid color-mix(in oklab, var(--color-base-content) 20%, transparent);
	}

	.badge-source-platform {
		color: color-mix(in oklab, var(--color-primary) 78%, var(--color-base-content));
		background-color: color-mix(in oklab, var(--color-primary) 16%, transparent);
	}

	.badge-source-cohort {
		color: color-mix(in oklab, var(--color-secondary) 78%, var(--color-base-content));
		background-color: color-mix(in oklab, var(--color-secondary) 16%, transparent);
	}

	.issuer-row {
		display: inline-flex;
		align-items: center;
		gap: 0.38rem;
		margin-top: 0.55rem;
		font-size: 0.78rem;
		color: color-mix(in oklab, var(--color-base-content) 74%, transparent);
	}

	.issuer-row a {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.badge-meta-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.45rem;
		margin-top: 0.75rem;
		width: min(100%, 270px);
	}

	.badge-meta {
		display: flex;
		flex-direction: column;
		gap: 0.16rem;
		font-size: 0.73rem;
		text-align: left;
		padding: 0.45rem 0.55rem;
		border-radius: 0.55rem;
		background-color: color-mix(in oklab, var(--color-base-100) 82%, transparent);
		border: 1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent);
		color: color-mix(in oklab, var(--color-base-content) 76%, transparent);
	}

	.badge-meta-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: color-mix(in oklab, var(--color-base-content) 48%, transparent);
	}

	.badge-meta-full {
		grid-column: 1 / -1;
	}
</style>
