<script lang="ts">
	import { ArrowUpWideNarrow, SlidersHorizontal } from 'lucide-svelte';
	import { Confetti } from 'svelte-confetti';
	import DockButton from './DockButton.svelte';
	import { getQuizCommands, isCommandShown } from './commands.svelte';
	import { getDockPreferences } from './dockPreferences.svelte';
	import { segmentShape, TONE_TEXT } from './dockStyles';
	import {
		DEFAULT_DOCK,
		DIVIDER_ID,
		displayFor,
		type DockConfig,
		type DockDisplay,
		type DockSurface
	} from './layouts';
	import type { CommandSource, QuizCommand } from './types';

	let {
		surface,
		source,
		config: configOverride,
		celebrate = false
	}: {
		surface: DockSurface;
		source: CommandSource;
		config?: DockConfig;
		celebrate?: boolean;
	} = $props();

	const registry = getQuizCommands();
	const preferences = getDockPreferences();

	let showConfetti = $state(false);
	$effect(() => {
		if (!celebrate) return;
		showConfetti = true;
		const timer = setTimeout(() => (showConfetti = false), 1200);
		return () => {
			clearTimeout(timer);
			showConfetti = false;
		};
	});

	const config = $derived(configOverride ?? preferences?.layout ?? DEFAULT_DOCK);
	const customizable = $derived(Boolean(preferences) && !configOverride);

	type Slot =
		| { kind: 'command'; key: string; command: QuizCommand; display: DockDisplay }
		| { kind: 'divider'; key: string };

	const slots = $derived.by(() => {
		const resolved: Slot[] = [];
		for (const item of config.items) {
			if (item.id === DIVIDER_ID) {
				const last = resolved.at(-1);
				if (surface === 'desktop' && last && last.kind !== 'divider') {
					resolved.push({ kind: 'divider', key: item.key });
				}
				continue;
			}
			const command = registry?.get(item.id);
			if (isCommandShown(command)) {
				resolved.push({
					kind: 'command',
					key: item.key,
					command,
					display: displayFor(item.id, item.display, surface)
				});
			}
		}
		if (resolved.at(-1)?.kind === 'divider') resolved.pop();
		return resolved;
	});

	const slotIds = $derived(slots.map((slot) => (slot.kind === 'command' ? slot.command.id : '')));

	const overflow = $derived(
		config.overflow
			.map((id) => registry?.get(id))
			.filter((command): command is QuizCommand => isCommandShown(command))
	);

	// Phones fold the customize entry into the More menu to save a slot.
	const customizeInMenu = $derived(surface === 'mobile' && overflow.length > 0);

	const TONE_BADGE_CLASS: Record<QuizCommand['tone'], string> = {
		neutral: '',
		primary: 'badge-primary',
		success: 'badge-success',
		warning: 'badge-warning',
		secondary: 'badge-secondary',
		info: 'badge-info',
		accent: 'badge-accent',
		error: 'badge-error',
		highlighter: 'badge-warning',
		ember: 'badge-warning'
	};

	const SURFACE_CLASS: Record<DockSurface, string> = {
		desktop:
			'items-center gap-2 px-3 sm:px-4 md:px-5 lg:px-6 py-3 sm:py-4 md:py-5 rounded-full backdrop-blur-md border border-base-300 shadow-xl w-auto fixed left-1/2 -translate-x-1/2 bottom-4 z-40 hidden md:inline-flex',
		mobile:
			'fixed bottom-0 left-0 w-full bg-base-100 shadow-lg border-t border-base-300 rounded-t-2xl z-50 flex gap-1 items-center px-2 py-3 md:hidden flex-wrap justify-center'
	};
</script>

<div
	class={SURFACE_CLASS[surface]}
	style="--dock-gap: {surface === 'desktop' ? '0.5rem' : '0.25rem'}"
	role="toolbar"
	aria-label="Quiz controls"
>
	{#if showConfetti}
		<div class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-[65] w-0 h-0">
			<Confetti />
		</div>
	{/if}

	{#if overflow.length > 0}
		<div class="dropdown dropdown-top {surface === 'desktop' ? 'dropdown-center' : ''}">
			<div
				tabindex="0"
				role="button"
				class="btn btn-sm btn-ghost btn-circle text-base-content/70"
				aria-label="More quiz options"
				title="More"
			>
				<ArrowUpWideNarrow size={18} />
			</div>
			<ul
				tabindex="-1"
				class="dropdown-content menu bg-base-100 rounded-2xl z-1 w-56 p-2 shadow-lg mb-2"
			>
				{#each overflow as command (command.id)}
					{@const active = command.active?.() ?? false}
					{@const Icon = active && command.activeIcon ? command.activeIcon : command.icon}
					{@const value = command.menuValue?.()}
					<li>
						{#if command.href}
							<!-- eslint-disable svelte/no-navigation-without-resolve -- resolved at command creation -->
							<a
								href={command.href()}
								target="_blank"
								rel="noopener noreferrer"
								title={command.description}
							>
								<Icon size={16} class={TONE_TEXT[command.tone]} />{command.name}
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{:else}
							<button
								type="button"
								class={command.tone === 'error' ? 'text-error' : ''}
								title={command.detail?.() ?? command.description}
								aria-pressed={command.active ? active : undefined}
								disabled={command.enabled?.() === false}
								onclick={() => command.run(source)}
							>
								<Icon size={16} class={TONE_TEXT[command.tone]} />
								<span class="flex-1">{command.name}</span>
								{#if value}
									<span class="text-xs tabular-nums text-base-content/55">{value}</span>
								{:else if active}
									<span class="badge badge-xs badge-soft {TONE_BADGE_CLASS[command.tone]}">On</span>
								{/if}
							</button>
						{/if}
					</li>
				{/each}
				{#if customizeInMenu && preferences}
					<li class="mt-1 border-t border-base-300 pt-1">
						<button type="button" onclick={() => preferences.open()}>
							<SlidersHorizontal size={16} />Customize dock
						</button>
					</li>
				{/if}
			</ul>
		</div>
	{/if}

	{#each slots as slot, index (slot.key)}
		{#if slot.kind === 'divider'}
			<div class="divider divider-horizontal mx-0.5"></div>
		{:else}
			<DockButton
				command={slot.command}
				display={slot.display}
				shape={segmentShape(slotIds, index)}
				{source}
			/>
		{/if}
	{/each}

	{#if customizable && !customizeInMenu && preferences}
		<button
			type="button"
			class="btn btn-ghost btn-sm btn-circle text-base-content/40 hover:text-base-content transition-colors"
			aria-label="Customize dock"
			title="Customize dock"
			onclick={() => preferences.open()}
		>
			<SlidersHorizontal size={16} />
		</button>
	{/if}
</div>
