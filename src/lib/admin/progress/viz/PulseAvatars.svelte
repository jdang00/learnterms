<script lang="ts">
	import type { Id } from '../../../../convex/_generated/dataModel';
	import { Tip } from '#lib/components/ui/tooltip/index.js';
	import StudentAvatar from '../StudentAvatar.svelte';

	type Person = { _id: Id<'users'>; name: string; imageUrl?: string };

	// Overlapping avatars for students studying right now, each with a breathing live ring.
	let {
		people,
		max = 5,
		size = 'xs',
		onStudent
	}: {
		people: Person[];
		max?: number;
		size?: 'xs' | 'sm';
		onStudent?: (id: Id<'users'>) => void;
	} = $props();
	const shown = $derived(people.slice(0, max));
	const extra = $derived(people.length - shown.length);
</script>

{#if people.length}
	<span class="flex items-center -space-x-2">
		{#each shown as person (person._id)}
			<Tip label={person.name}>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="rounded-full ring-2 ring-card motion-safe:animate-live-breathe"
						aria-label="Open {person.name}"
						onclick={(event) => {
							event.stopPropagation();
							onStudent?.(person._id);
						}}
					>
						<StudentAvatar name={person.name} imageUrl={person.imageUrl} {size} />
					</button>
				{/snippet}
			</Tip>
		{/each}
		{#if extra > 0}
			<span
				class="relative grid size-7 place-items-center rounded-full bg-success/15 text-[10px] font-semibold text-success-ink ring-2 ring-card tabular-nums"
				>+{extra}</span
			>
		{/if}
	</span>
{/if}
