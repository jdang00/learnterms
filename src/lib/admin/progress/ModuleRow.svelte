<script lang="ts">
	import type { Id } from '../../../convex/_generated/dataModel';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Tip } from '#lib/components/ui/tooltip/index.js';
	import type { ModuleSummary, ModuleWindow } from './dashboard.svelte';
	import { relativeTime } from './utils';
	import LiveDot from './viz/LiveDot.svelte';
	import PulseAvatars from './viz/PulseAvatars.svelte';
	import ReachBar from './viz/ReachBar.svelte';
	import Sparkline from './viz/Sparkline.svelte';
	import LiveNumber from './viz/LiveNumber.svelte';

	type Person = { _id: Id<'users'>; name: string; imageUrl?: string };

	let {
		module,
		window,
		cohortSize,
		livePeople,
		pulse,
		now,
		showClass = true,
		onOpen,
		onStudent
	}: {
		module: ModuleSummary;
		window: ModuleWindow;
		cohortSize: number;
		livePeople: Person[];
		pulse?: number;
		now: number;
		showClass?: boolean;
		onOpen: (moduleId: Id<'module'>) => void;
		onStudent: (id: Id<'users'>) => void;
	} = $props();

	const windowLabel = { now: 'now', today: 'today', week: 'this week' } as const;
	const live = $derived(livePeople.length > 0);
</script>

<div
	class="group relative grid grid-cols-[2.5rem_minmax(0,1fr)_5.5rem] items-center gap-x-3 px-4 py-3 transition-colors hover:bg-muted/60 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_6rem_7rem] sm:px-5"
>
	<span class="relative grid size-10 place-items-center rounded-xl bg-muted text-xl">
		{module.emoji ?? '📚'}
		{#if pulse}{#key pulse}<span
					class="absolute inset-0 rounded-xl motion-safe:animate-live-flash"
					aria-hidden="true"
				></span>{/key}{/if}
	</span>
	<span class="min-w-0">
		<button
			type="button"
			class="block max-w-full truncate text-left text-sm font-medium after:absolute after:inset-0 group-hover:text-primary-ink focus-visible:outline-none"
			onclick={() => onOpen(module.moduleId)}
			>{module.title}{#if module.status !== 'published'}<Badge
					size="xs"
					class="ml-1.5 align-middle capitalize">{module.status}</Badge
				>{/if}</button
		>
		<span class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
			{#if live}
				<LiveDot />
				<span class="shrink-0 font-medium text-success-ink">{livePeople.length} here now</span>
			{:else}
				<span class="shrink-0"
					>{module.lastActivityAt
						? relativeTime(module.lastActivityAt, now)
						: 'Not studied yet'}</span
				>
			{/if}
			{#if showClass}<span aria-hidden="true">·</span><span class="truncate"
					>{module.className}</span
				>{/if}
		</span>
	</span>
	<span class="relative hidden justify-end sm:flex">
		<PulseAvatars people={livePeople} max={4} {onStudent} />
	</span>
	<Sparkline
		values={module.daily}
		{live}
		class="hidden h-7 w-full sm:flex"
		label="First attempts per day, last {module.daily.length} days"
	/>
	<span class="block text-right">
		<span class="flex items-baseline justify-end gap-1">
			<LiveNumber value={module.counts[window]} class="text-base font-semibold" />
			<span class="text-[11px] text-muted-foreground">{windowLabel[window]}</span>
		</span>
		<Tip label="{module.reach} of {cohortSize} students have studied it">
			{#snippet child({ props })}
				<span {...props} class="relative mt-1 block py-0.5">
					<ReachBar
						reach={module.reach}
						inWindow={module.counts[window]}
						total={cohortSize}
						{live}
					/>
				</span>
			{/snippet}
		</Tip>
	</span>
</div>
