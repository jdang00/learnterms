<script lang="ts">
	import {
		ArrowRight,
		ArrowUpWideNarrow,
		Check,
		Ellipsis,
		SlidersHorizontal,
		X
	} from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import { Confetti } from 'svelte-confetti';
	import Sheet from '$lib/components/Sheet.svelte';
	import DockButton from './DockButton.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Tip } from '$lib/components/ui/tooltip';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { getQuizCommands, isCommandShown } from './commands.svelte';
	import { getDockPreferences } from './dockPreferences.svelte';
	import { isPassive, segmentShape, TONE_TEXT } from './dockStyles';
	import {
		DEFAULT_DOCK,
		DIVIDER_ID,
		displayFor,
		phoneRowFit,
		type DockConfig,
		type DockDisplay,
		type DockSurface
	} from './layouts';
	import type { CommandSource, QuizCommand } from './types';

	let {
		surface,
		source,
		config: configOverride,
		celebrate = false,
		above
	}: {
		surface: DockSurface;
		source: CommandSource;
		config?: DockConfig;
		celebrate?: boolean;
		// Phone only: content pinned just above the dock, e.g. the rationale peek.
		above?: Snippet;
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

	// Phones get one fixed row (see phoneRowFit); whatever doesn't fit folds into More.
	type CommandSlot = Extract<Slot, { kind: 'command' }>;
	let dockWidth = $state(0);
	const phone = $derived.by(() => {
		if (surface !== 'mobile') return null;
		const commands = slots.filter((slot): slot is CommandSlot => slot.kind === 'command');
		const prev = commands.find((slot) => slot.command.id === 'previous');
		const next = commands.find((slot) => slot.command.id === 'next');
		const middle = commands.filter((slot) => slot !== prev && slot !== next);
		const fit = phoneRowFit(
			middle.map((slot) => ({ id: slot.command.id, passive: isPassive(slot.command) })),
			dockWidth || 360,
			Number(Boolean(prev)) + Number(Boolean(next))
		);
		return {
			prev,
			next,
			shown: middle.filter((_, index) => fit.has(index)),
			more: [
				...middle.filter((_, index) => !fit.has(index)).map((slot) => slot.command),
				...overflow
			]
		};
	});
	let moreOpen = $state(false);

	const checkOutcome = $derived(registry?.get('check')?.outcome?.() ?? null);
	const nextCommand = $derived(registry?.get('next'));
	let shaking = $state(false);
	let shakeTimer: ReturnType<typeof setTimeout> | undefined;
	function shake() {
		clearTimeout(shakeTimer);
		shaking = false;
		requestAnimationFrame(() => (shaking = true));
		shakeTimer = setTimeout(() => (shaking = false), 450);
		navigator.vibrate?.([8, 60, 8]);
	}
	$effect(() => {
		if (surface !== 'mobile' || !checkOutcome || checkOutcome === 'answered') return;
		if (checkOutcome === 'correct') navigator.vibrate?.(12);
		else shake();
	});

	function runFromMore(command: QuizCommand) {
		moreOpen = false;
		void command.run(source);
	}

	// The desktop island: centred with margins (not translate) so its rise-in animation can't knock it off-centre.
	const DESKTOP_CLASS =
		'dock-glass fixed inset-x-0 bottom-5 z-40 mx-auto hidden w-fit items-center gap-2 rounded-full p-2.5 md:inline-flex animate-in fade-in-0 slide-in-from-bottom-6 duration-500 ease-out motion-reduce:animate-none';
</script>

{#snippet checkSlot(slot: CommandSlot)}
	{#if (checkOutcome === 'correct' || checkOutcome === 'answered') && nextCommand}
		<Button
			tone={checkOutcome === 'correct' ? 'success' : 'primary'}
			class="h-11 min-w-28 flex-1 gap-1.5"
			disabled={nextCommand.enabled?.() === false}
			aria-label={checkOutcome === 'correct' ? 'Correct. Next question' : 'Next question'}
			onclick={() => nextCommand.run(source)}
		>
			{#if checkOutcome === 'correct'}<Check size={18} strokeWidth={3} />Correct{:else}Next{/if}
			<ArrowRight size={18} class="opacity-80" />
		</Button>
	{:else if checkOutcome === 'incorrect'}
		<!-- Stays until the answer changes; re-checking the same answer would only log another miss. -->
		<Button
			tone="error"
			class="h-11 min-w-28 flex-1 gap-1.5 {shaking ? 'dock-shake' : ''}"
			aria-label="Incorrect. Change your answer, then check again"
			onclick={shake}
		>
			<X size={18} strokeWidth={3} />Incorrect
		</Button>
	{:else}
		<DockButton
			command={slot.command}
			display={slot.display}
			{source}
			touch
			class="min-w-28 flex-1"
		/>
	{/if}
{/snippet}

{#if phone}
	<div
		class="dock-glass bottom-dock fixed inset-x-0 z-50 rounded-t-[1.75rem] border-b-0 md:hidden"
		bind:clientWidth={dockWidth}
	>
		{#if above}
			<div class="absolute inset-x-0 bottom-full">{@render above()}</div>
		{/if}
		{#if showConfetti}
			<div class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-[65] w-0 h-0">
				<Confetti />
			</div>
		{/if}
		<div
			class="flex items-center gap-1 px-2 pt-2"
			style="--dock-gap: 0.25rem"
			role="toolbar"
			aria-label="Quiz controls"
		>
			<div class="flex min-w-0 flex-1 items-center justify-center gap-1">
				{#each phone.shown as slot (slot.key)}
					{#if slot.command.id === 'check'}
						{@render checkSlot(slot)}
					{:else}
						<DockButton command={slot.command} display={slot.display} {source} touch />
					{/if}
				{/each}
				{#if phone.more.length || customizable}
					<Button
						variant="ghost"
						tone="neutral"
						shape="circle"
						class="size-11 text-foreground/70"
						aria-label="More quiz options"
						aria-haspopup="dialog"
						onclick={() => (moreOpen = true)}
					>
						<Ellipsis size={20} />
					</Button>
				{/if}
			</div>
			{#if phone.prev || phone.next}
				<!-- The same split pill as the desktop dock. -->
				<div class="ms-1 flex shrink-0 items-center" style="--dock-gap: 0px">
					{#if phone.prev}
						<DockButton
							command={phone.prev.command}
							display="icon"
							shape={phone.next ? 'segment-start' : 'auto'}
							{source}
							touch
						/>
					{/if}
					{#if phone.next}
						<DockButton
							command={phone.next.command}
							display="icon"
							shape={phone.prev ? 'segment-end' : 'auto'}
							{source}
							touch
						/>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<Sheet bind:open={moreOpen} title="More">
		<ul class="-mx-2 flex flex-col">
			{#each phone.more as command (command.id)}
				{@const active = command.active?.() ?? false}
				{@const Icon = active && command.activeIcon ? command.activeIcon : command.icon}
				{@const value = isPassive(command) ? command.label() : command.menuValue?.()}
				<li>
					{#if command.href}
						<!-- eslint-disable svelte/no-navigation-without-resolve -- resolved at command creation -->
						<a
							href={command.href()}
							target="_blank"
							rel="noopener noreferrer"
							class="flex min-h-12 items-center gap-3 rounded-xl px-2 active:bg-muted"
						>
							<Icon size={20} class={TONE_TEXT[command.tone]} />
							<span class="flex-1">{command.name}</span>
						</a>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{:else if isPassive(command)}
						<div class="flex min-h-12 items-center gap-3 px-2">
							<Icon size={20} class={TONE_TEXT[command.tone]} />
							<span class="flex-1">{command.name}</span>
							<span class="text-sm tabular-nums text-foreground/60">{value}</span>
						</div>
					{:else}
						<button
							type="button"
							class="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left active:bg-muted disabled:opacity-40 {command.tone ===
							'error'
								? 'text-error-ink'
								: ''}"
							aria-pressed={command.active ? active : undefined}
							disabled={command.enabled?.() === false}
							onclick={() => runFromMore(command)}
						>
							<Icon size={20} class={TONE_TEXT[command.tone]} />
							<span class="flex-1">{command.name}</span>
							{#if value}
								<span class="text-sm tabular-nums text-foreground/60">{value}</span>
							{:else if active}
								<Badge tone={command.tone}>On</Badge>
							{/if}
						</button>
					{/if}
				</li>
			{/each}
		</ul>
		{#if customizable && preferences}
			<Button
				variant="ghost"
				tone="neutral"
				class="mt-2 h-11 w-full text-foreground/70"
				onclick={() => {
					moreOpen = false;
					preferences.open();
				}}
			>
				<SlidersHorizontal size={16} /> Customize dock
			</Button>
		{/if}
	</Sheet>
{:else}
	<div class={DESKTOP_CLASS} style="--dock-gap: 0.5rem" role="toolbar" aria-label="Quiz controls">
		{#if showConfetti}
			<div class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-[65] w-0 h-0">
				<Confetti />
			</div>
		{/if}

		{#if overflow.length > 0}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="ghost"
							tone="neutral"
							shape="circle"
							class="text-foreground/70 hover:bg-white/60 dark:hover:bg-white/10"
							aria-label="More quiz options"
							title="More"
						>
							<ArrowUpWideNarrow size={19} />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content side="top" align="center" sideOffset={10} class="w-56">
					{#each overflow as command (command.id)}
						{@const active = command.active?.() ?? false}
						{@const Icon = active && command.activeIcon ? command.activeIcon : command.icon}
						{@const value = command.menuValue?.()}
						{#if command.href}
							<DropdownMenu.Item>
								{#snippet child({ props })}
									<!-- eslint-disable svelte/no-navigation-without-resolve -- resolved at command creation -->
									<a
										{...props}
										href={command.href?.()}
										target="_blank"
										rel="noopener noreferrer"
										title={command.description}
									>
										<Icon size={16} class={TONE_TEXT[command.tone]} />{command.name}
									</a>
									<!-- eslint-enable svelte/no-navigation-without-resolve -->
								{/snippet}
							</DropdownMenu.Item>
						{:else}
							<DropdownMenu.Item
								class={command.tone === 'error' ? 'text-error-ink' : ''}
								title={command.detail?.() ?? command.description}
								disabled={command.enabled?.() === false}
								onSelect={() => command.run(source)}
							>
								<Icon size={16} class={TONE_TEXT[command.tone]} />
								<span class="flex-1">{command.name}</span>
								{#if value}
									<span class="text-xs tabular-nums text-foreground/55">{value}</span>
								{:else if active}
									<Badge size="xs" tone={command.tone}>On</Badge>
								{/if}
							</DropdownMenu.Item>
						{/if}
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{/if}

		{#each slots as slot, index (slot.key)}
			{#if slot.kind === 'divider'}
				<span
					class="mx-1 h-7 w-px shrink-0 bg-linear-to-b from-transparent via-foreground/18 to-transparent"
					aria-hidden="true"
				></span>
			{:else}
				<DockButton
					command={slot.command}
					display={slot.display}
					shape={segmentShape(slotIds, index)}
					{source}
				/>
			{/if}
		{/each}

		{#if customizable && preferences}
			<Tip label="Customize dock">
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						tone="neutral"
						shape="circle"
						class="text-foreground/45 hover:bg-white/60 hover:text-foreground dark:hover:bg-white/10"
						aria-label="Customize dock"
						onclick={() => preferences.open()}
					>
						<SlidersHorizontal size={16} />
					</Button>
				{/snippet}
			</Tip>
		{/if}
	</div>
{/if}

<style>
	@keyframes dock-shake {
		0%,
		100% {
			translate: 0;
		}
		20%,
		60% {
			translate: -6px 0;
		}
		40%,
		80% {
			translate: 6px 0;
		}
	}
	.dock-shake {
		animation: dock-shake 400ms ease-in-out;
	}
	@media (prefers-reduced-motion: reduce) {
		.dock-shake {
			animation: none;
		}
	}
</style>
