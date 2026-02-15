<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { useClerkContext } from 'svelte-clerk/client';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';
	import { Confetti } from 'svelte-confetti';
	import BadgeShield from '$lib/components/badges/BadgeShield.svelte';
	import {
		Award,
		BookOpen,
		Flame,
		Heart,
		Lightbulb,
		Moon,
		Star,
		Sunrise,
		X,
		Zap
	} from 'lucide-svelte';

	const ctx = useClerkContext();
	const user = $derived(ctx.user);
	const client = useConvexClient();

	const unseenAwardQuery = useQuery(api.badges.getNextUnseenBadgeAwardForViewer, () =>
		user ? {} : 'skip'
	);

	const iconMap: Record<string, any> = {
		users: Award,
		flame: Flame,
		star: Star,
		book: BookOpen,
		sunrise: Sunrise,
		lightbulb: Lightbulb,
		heart: Heart,
		moon: Moon,
		zap: Zap
	};

	let hiddenAwardIds = $state<string[]>([]);
	let isAcknowledging = $state(false);

	const activeAward = $derived.by(() => {
		const award = unseenAwardQuery.data;
		if (!award) return null;
		if (hiddenAwardIds.includes(award.awardId)) return null;
		return award;
	});

	const badgeIcon = $derived.by(() => {
		if (!activeAward) return Award;
		return iconMap[activeAward.badge.iconKey] ?? Award;
	});

	async function acknowledge() {
		const award = activeAward;
		if (!award || isAcknowledging) return;

		isAcknowledging = true;
		hiddenAwardIds = [...hiddenAwardIds, award.awardId];

		try {
			await client.mutation(api.badges.markBadgeAwardSeen, {
				awardId: award.awardId as Id<'userBadgeAwards'>
			});
		} catch (error) {
			hiddenAwardIds = hiddenAwardIds.filter((id) => id !== award.awardId);
			console.error('Failed to mark badge award as seen:', error);
		} finally {
			isAcknowledging = false;
		}
	}
</script>

{#if activeAward}
	<div class="fixed inset-0 z-[9998] pointer-events-none">
		<Confetti
			x={[-0.5, 0.5]}
			y={[0.15, 1]}
			delay={[0, 45]}
			duration={2600}
			amount={140}
			fallDistance="95vh"
		/>
	</div>

	<dialog class="modal modal-open max-w-full p-4 z-[9999]">
		<div class="modal-box max-w-md rounded-2xl border border-base-300">
			<button
				type="button"
				class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
				onclick={acknowledge}
				disabled={isAcknowledging}
				aria-label="Dismiss badge modal"
			>
				<X size={16} />
			</button>

			<div class="mx-auto mb-4 w-fit">
				<BadgeShield
					idBase={`award-${activeAward.badge.key}-${activeAward.awardId}`}
					size={146}
					gradient={activeAward.badge.gradient}
					iconColor={activeAward.badge.iconColor}
					icon={badgeIcon}
				/>
			</div>

			<p class="text-xs uppercase tracking-[0.2em] text-base-content/60 text-center">
				Badge earned
			</p>
			<h3 class="text-2xl font-bold text-center mt-1">{activeAward.badge.name}</h3>
			<p class="text-sm text-base-content/70 text-center mt-2">{activeAward.badge.description}</p>
			<div class="mt-4 text-center text-xs text-base-content/60">
				Issued by {activeAward.badge.issuerName}
			</div>

			<div class="modal-action justify-center mt-6">
				<button
					type="button"
					class="btn btn-primary rounded-full min-w-40"
					onclick={acknowledge}
					disabled={isAcknowledging}
				>
					{isAcknowledging ? 'Saving...' : 'Awesome'}
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop bg-black/60">
			<button type="button" class="sr-only" aria-label="Dismiss badge modal" onclick={acknowledge}>
				Close
			</button>
		</form>
	</dialog>
{/if}
