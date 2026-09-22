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

	const DESKTOP_CLASS =
		'items-center gap-2 px-3 sm:px-4 md:px-5 lg:px-6 py-3 sm:py-4 md:py-5 rounded-full backdrop-blur-md border border-base-300 shadow-xl w-auto fixed left-1/2 -translate-x-1/2 bottom-4 z-40 hidden md:inline-flex';
</script>

{#snippet checkSlot(slot: CommandSlot)}
	{#if (checkOutcome === 'correct' || checkOutcome === 'answered') && nextCommand}
		<button
			type="button"
			class="btn h-11 min-w-28 flex-1 gap-1.5 rounded-full {checkOutcome === 'correct'
				? 'btn-success'
				: 'btn-primary'}"
			disabled={nextCommand.enabled?.() === false}
			aria-label={checkOutcome === 'correct' ? 'Correct. Next question' : 'Next question'}
			onclick={() => nextCommand.run(source)}
		>
			{#if checkOutcome === 'correct'}<Check size={18} strokeWidth={3} />Correct{:else}Next{/if}
			<ArrowRight size={18} class="opacity-80" />
		</button>
	{:else if checkOutcome === 'incorrect'}
		<!-- Stays until the answer changes; re-checking the same answer would only log another miss. -->
		<button
			type="button"
			class="btn btn-error h-11 min-w-28 flex-1 gap-1.5 rounded-full {shaking ? 'dock-shake' : ''}"
			aria-label="Incorrect. Change your answer, then check again"
			onclick={shake}
		>
			<X size={18} strokeWidth={3} />Incorrect
		</button>
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
		class="bottom-dock fixed inset-x-0 z-50 border-t border-base-300 bg-base-100/95 backdrop-blur-md md:hidden"
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
					<button
						type="button"
						class="btn btn-ghost btn-circle [--size:2.75rem] text-base-content/70"
						aria-label="More quiz options"
						aria-haspopup="dialog"
						onclick={() => (moreOpen = true)}
					>
						<Ellipsis size={20} />
					</button>
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
							class="flex min-h-12 items-center gap-3 rounded-xl px-2 active:bg-base-200"
						>
							<Icon size={20} class={TONE_TEXT[command.tone]} />
							<span class="flex-1">{command.name}</span>
						</a>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{:else if isPassive(command)}
						<div class="flex min-h-12 items-center gap-3 px-2">
							<Icon size={20} class={TONE_TEXT[command.tone]} />
							<span class="flex-1">{command.name}</span>
							<span class="text-sm tabular-nums text-base-content/60">{value}</span>
						</div>
					{:else}
						<button
							type="button"
							class="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left active:bg-base-200 disabled:opacity-40 {command.tone ===
							'error'
								? 'text-error'
								: ''}"
							aria-pressed={command.active ? active : undefined}
							disabled={command.enabled?.() === false}
							onclick={() => runFromMore(command)}
						>
							<Icon size={20} class={TONE_TEXT[command.tone]} />
							<span class="flex-1">{command.name}</span>
							{#if value}
								<span class="text-sm tabular-nums text-base-content/60">{value}</span>
							{:else if active}
								<span class="badge badge-sm badge-soft {TONE_BADGE_CLASS[command.tone]}">On</span>
							{/if}
						</button>
					{/if}
				</li>
			{/each}
		</ul>
		{#if customizable && preferences}
			<button
				type="button"
				class="btn btn-ghost mt-2 min-h-11 w-full rounded-full text-base-content/70"
				onclick={() => {
					moreOpen = false;
					preferences.open();
				}}
			>
				<SlidersHorizontal size={16} /> Customize dock
			</button>
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
			<div class="dropdown dropdown-top dropdown-center">
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
										<span class="badge badge-xs badge-soft {TONE_BADGE_CLASS[command.tone]}"
											>On</span
										>
									{/if}
								</button>
							{/if}
						</li>
					{/each}
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

		{#if customizable && preferences}
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
