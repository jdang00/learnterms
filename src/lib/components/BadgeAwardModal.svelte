<script lang="ts">
	import { useAuth, useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';
	import { Confetti } from 'svelte-confetti';
	import BadgeShield from '#lib/components/badges/BadgeShield.svelte';
	import Award from '@lucide/svelte/icons/award';
	import { getBadgeIcon } from '#lib/components/badges/icons.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';

	const convexAuth = useAuth();
	const client = useConvexClient();

	const unseenAwardQuery = useQuery(api.badges.getNextUnseenBadgeAwardForViewer, () =>
		convexAuth.isAuthenticated ? {} : 'skip'
	);

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
		return getBadgeIcon(activeAward.badge.iconKey);
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
{/if}

<Dialog.Root
	open={activeAward !== null}
	onOpenChange={(open) => {
		if (!open) acknowledge();
	}}
>
	<Dialog.Content showCloseButton={false} class="z-[9999] rounded-2xl">
		{#if activeAward}
			<Dialog.CornerClose
				onclick={acknowledge}
				disabled={isAcknowledging}
				label="Dismiss badge modal"
			/>

			<div class="mx-auto mb-4 w-fit">
				<BadgeShield
					idBase={`award-${activeAward.badge.key}-${activeAward.awardId}`}
					size={146}
					gradient={activeAward.badge.gradient}
					iconColor={activeAward.badge.iconColor}
					icon={badgeIcon}
				/>
			</div>

			<p class="text-xs uppercase tracking-[0.2em] text-foreground/60 text-center">Badge earned</p>
			<Dialog.Title class="mt-1 text-center text-2xl leading-8 font-bold"
				>{activeAward.badge.name}</Dialog.Title
			>
			<Dialog.Description class="mt-2 text-center text-sm text-foreground/70"
				>{activeAward.badge.description}</Dialog.Description
			>
			<div class="mt-4 text-center text-xs text-foreground/60">
				Issued by {activeAward.badge.issuerName}
			</div>

			<Dialog.Footer class="mt-6 justify-center sm:justify-center">
				<Button class="min-w-40" onclick={acknowledge} disabled={isAcknowledging}>
					{isAcknowledging ? 'Saving...' : 'Awesome'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
