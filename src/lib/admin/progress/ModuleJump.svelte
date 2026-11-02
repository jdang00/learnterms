<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import type { Id } from '../../../convex/_generated/dataModel';
	import * as Command from '#lib/components/ui/command/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Kbd } from '#lib/components/ui/kbd/index.js';
	import { modulesByClass } from './aggregate';
	import type { ModuleSummary, ProgressDashboard } from './dashboard.svelte';
	import LiveDot from './viz/LiveDot.svelte';

	// Any module in two keystrokes: press / anywhere on the page, type, enter.
	let {
		dashboard,
		onOpen
	}: { dashboard: ProgressDashboard; onOpen: (moduleId: Id<'module'>) => void } = $props();
	let open = $state(false);

	const live = $derived(
		dashboard.modules
			.filter((m) => dashboard.liveByModule.has(m.moduleId))
			.sort(
				(a, b) =>
					(dashboard.liveByModule.get(b.moduleId)?.length ?? 0) -
					(dashboard.liveByModule.get(a.moduleId)?.length ?? 0)
			)
	);
	const groups = $derived(modulesByClass(dashboard.modules));

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
		const target = event.target as HTMLElement | null;
		if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
		event.preventDefault();
		open = true;
	}
	function choose(moduleId: Id<'module'>) {
		open = false;
		onOpen(moduleId);
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#snippet entry(module: ModuleSummary, group: string)}
	{@const here = dashboard.liveByModule.get(module.moduleId)?.length ?? 0}
	<Command.Item
		value="{module.title} · {module.className}{group === 'live' ? ' · now' : ''}"
		onSelect={() => choose(module.moduleId)}
	>
		<span class="w-5 text-center">{module.emoji ?? '📚'}</span>
		<span class="min-w-0 flex-1 truncate">{module.title}</span>
		{#if here}
			<span class="flex items-center gap-1.5 text-xs text-success-ink tabular-nums"
				><LiveDot />{here}</span
			>
		{:else if module.counts.today}
			<span class="text-xs text-muted-foreground tabular-nums">{module.counts.today} today</span>
		{/if}
	</Command.Item>
{/snippet}

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="soft" tone="neutral" size="sm" class="gap-2">
				<Search size={15} />Find a module<Kbd class="hidden sm:inline-flex">/</Kbd>
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content align="end" collisionPadding={12} class="w-[min(26rem,calc(100vw-24px))] p-0">
		<Command.Root loop>
			<Command.Input placeholder="Module or class" />
			<Command.List class="max-h-[min(24rem,60vh)] overflow-y-auto">
				<Command.Empty>No modules match.</Command.Empty>
				{#if live.length}
					<Command.Group heading="Studying now">
						{#each live as module (module.moduleId)}{@render entry(module, 'live')}{/each}
					</Command.Group>
				{/if}
				{#each groups as [classId, group] (classId)}
					<Command.Group heading={group.name}>
						{#each group.modules as module (module.moduleId)}{@render entry(module, classId)}{/each}
					</Command.Group>
				{/each}
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
