<script lang="ts">
	import { Settings, SlidersHorizontal, ToolCase } from 'lucide-svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import { getQuizCommands, isCommandShown } from './commands.svelte';
	import { getDockPreferences } from './dockPreferences.svelte';
	import { isPassive, TONE_BADGE, TONE_TEXT } from './dockStyles';
	import { DEFAULT_DOCK } from './layouts';
	import { ariaShortcutFor, shortcutLabelFor } from './shortcuts';
	import type { QuizCommand } from './types';

	// panel: expanded sidebar · rail: collapsed sidebar · sheet: top-bar button + bottom sheet below lg
	let { variant }: { variant: 'panel' | 'rail' | 'sheet' } = $props();

	const registry = getQuizCommands();
	const preferences = getDockPreferences();
	const source = $derived(variant === 'sheet' ? 'mobile' : 'button');

	const tools = $derived(
		(preferences?.layout ?? DEFAULT_DOCK).tools
			.map((id) => registry?.get(id))
			.filter((command): command is QuizCommand => isCommandShown(command))
	);
	const actionable = $derived(tools.filter((command) => !isPassive(command)));
	const anyActive = $derived(actionable.some((command) => command.active?.() ?? false));

	let announcement = $state('');
	let focusIndex = $state(0);
	const rovingIndex = $derived(Math.min(focusIndex, Math.max(actionable.length - 1, 0)));
	let toolbar = $state<HTMLElement | null>(null);
	let sheetOpen = $state(false);
	const settings = $derived(registry?.get('settings'));

	async function run(command: QuizCommand) {
		if (variant === 'sheet') sheetOpen = false;
		await command.run(source);
		if (command.active) announcement = `${command.name} ${command.active() ? 'on' : 'off'}`;
	}

	// Arrow keys move within the toolbar so Tab jumps straight to the next landmark.
	function handleToolbarKeydown(event: KeyboardEvent) {
		const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
		if (!toolbar || !keys.includes(event.key)) return;
		const buttons = [...toolbar.querySelectorAll<HTMLElement>('[data-tool]')];
		const current = buttons.indexOf(document.activeElement as HTMLElement);
		if (current === -1) return;
		const last = buttons.length - 1;
		const next =
			event.key === 'Home'
				? 0
				: event.key === 'End'
					? last
					: event.key === 'ArrowLeft' || event.key === 'ArrowUp'
						? current === 0
							? last
							: current - 1
						: current === last
							? 0
							: current + 1;
		event.preventDefault();
		buttons[next]?.focus();
	}

	function tileTone(command: QuizCommand, active: boolean) {
		return active
			? `${TONE_BADGE[command.tone]} font-semibold ring-1 ring-inset ring-current/25`
			: 'text-base-content/70 hover:bg-base-100 hover:text-base-content';
	}

	function titleFor(command: QuizCommand) {
		const text = command.detail?.() ?? command.description;
		const shortcut = shortcutLabelFor(command.id);
		return shortcut ? `${text} (${shortcut})` : text;
	}

	function openSheet() {
		sheetOpen = true;
	}

	function customize() {
		sheetOpen = false;
		preferences?.open();
	}
</script>

{#snippet readout(command: QuizCommand, compact: boolean)}
	{@const Icon = command.icon}
	{@const lit = command.active ? command.active() : true}
	<span
		class="flex flex-col items-center justify-center gap-1 rounded-xl tabular-nums {compact
			? 'size-11 text-xs'
			: 'min-h-14 px-1 text-[0.68rem]'}"
		title={command.detail?.() ?? command.description}
	>
		<span class="flex items-center gap-1 text-sm font-semibold text-base-content">
			<Icon
				size={compact ? 14 : 16}
				aria-hidden="true"
				class={lit ? TONE_TEXT[command.tone] : 'text-base-content/40'}
				fill={command.active && lit ? 'currentColor' : 'none'}
			/>
			<span class="sr-only">{command.name}:</span>
			{command.label()}
		</span>
		{#if !compact}
			<span class="font-medium text-base-content/55">{command.caption?.() ?? command.name}</span>
		{/if}
	</span>
{/snippet}

{#snippet tile(command: QuizCommand, index: number, compact: boolean)}
	{@const active = command.active?.() ?? false}
	{@const Icon = active && command.activeIcon ? command.activeIcon : command.icon}
	<button
		type="button"
		data-tool
		tabindex={index === rovingIndex ? 0 : -1}
		class="flex flex-col items-center justify-center gap-1 rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-40
			{compact ? 'size-11' : 'min-h-14 px-1 text-[0.68rem] font-medium'}
			{tileTone(command, active)}"
		aria-label={command.name}
		aria-pressed={command.active ? active : undefined}
		aria-keyshortcuts={ariaShortcutFor(command.id)}
		title={titleFor(command)}
		disabled={command.enabled?.() === false}
		onfocus={() => (focusIndex = index)}
		onclick={() => run(command)}
	>
		<Icon
			size={compact ? 20 : 18}
			aria-hidden="true"
			class={active ? '' : TONE_TEXT[command.tone]}
		/>
		{#if !compact}<span class="max-w-full truncate">{command.name}</span>{/if}
	</button>
{/snippet}

<p class="sr-only" aria-live="polite">{announcement}</p>

{#if variant === 'panel'}
	<section aria-labelledby="quiz-tools-heading">
		<div class="mb-1.5 flex items-center justify-between px-1">
			<h3
				id="quiz-tools-heading"
				class="text-[0.7rem] font-semibold uppercase tracking-wider text-base-content/45"
			>
				Tools
			</h3>
			{#if preferences}
				<button
					type="button"
					class="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-base-content"
					aria-label="Customize tools"
					title="Customize tools"
					onclick={customize}
				>
					<SlidersHorizontal size={13} />
				</button>
			{/if}
		</div>
		{#if tools.length}
			<div
				bind:this={toolbar}
				role="toolbar"
				aria-label="Exam tools"
				tabindex="-1"
				class="grid grid-cols-4 gap-1 rounded-2xl border border-base-300 bg-base-200/50 p-1"
				onkeydown={handleToolbarKeydown}
			>
				{#each tools as command (command.id)}
					{#if isPassive(command)}
						{@render readout(command, false)}
					{:else}
						{@render tile(command, actionable.indexOf(command), false)}
					{/if}
				{/each}
			</div>
		{:else if preferences}
			<button
				type="button"
				class="flex h-14 w-full items-center justify-center rounded-2xl border border-dashed border-base-300 text-xs text-base-content/50 hover:border-base-content/25"
				onclick={customize}
			>
				Add study tools
			</button>
		{/if}
	</section>
{:else if variant === 'rail'}
	{#if tools.length}
		<div
			bind:this={toolbar}
			role="toolbar"
			aria-label="Exam tools"
			aria-orientation="vertical"
			tabindex="-1"
			class="flex flex-col items-center gap-1 rounded-2xl border border-base-300 bg-base-200/50 p-1"
			onkeydown={handleToolbarKeydown}
		>
			{#each tools as command (command.id)}
				{#if isPassive(command)}
					{@render readout(command, true)}
				{:else}
					{@render tile(command, actionable.indexOf(command), true)}
				{/if}
			{/each}
		</div>
	{/if}
{:else}
	<button
		type="button"
		class="btn btn-ghost btn-circle relative size-11 shrink-0 text-base-content/70"
		aria-label="Tools"
		aria-haspopup="dialog"
		aria-expanded={sheetOpen}
		title="Tools"
		onclick={openSheet}
	>
		<ToolCase size={20} aria-hidden="true" />
		{#if anyActive}
			<span
				class="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-base-100"
				aria-hidden="true"
			></span>
		{/if}
	</button>

	<Sheet bind:open={sheetOpen} title="Tools" desktop="bottom" width="sm:max-w-lg sm:mx-auto">
		{#if tools.length}
			<ul class="grid grid-cols-3 gap-2 pt-1">
				{#each tools as command (command.id)}
					{@const active = command.active?.() ?? false}
					{@const Icon = active && command.activeIcon ? command.activeIcon : command.icon}
					<li>
						{#if isPassive(command)}
							<div class="rounded-2xl border border-base-300 bg-base-200/50 py-2">
								{@render readout(command, false)}
							</div>
						{:else}
							<button
								type="button"
								class="flex min-h-20 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-base-300 px-2 text-sm font-medium transition-colors active:scale-[0.97] disabled:opacity-40
									{tileTone(command, active)}"
								aria-pressed={command.active ? active : undefined}
								disabled={command.enabled?.() === false}
								onclick={() => run(command)}
							>
								<Icon size={22} aria-hidden="true" class={active ? '' : TONE_TEXT[command.tone]} />
								<span class="max-w-full truncate">{command.name}</span>
								{#if command.active}
									<span class="text-xs font-normal opacity-70">{active ? 'On' : 'Off'}</span>
								{/if}
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="py-4 text-sm text-base-content/60">
				No tools yet. Add a calculator, notes, or highlighter.
			</p>
		{/if}
		<div class="mt-4 flex gap-2">
			{#if settings}
				<button
					type="button"
					class="btn btn-ghost min-h-11 flex-1 rounded-full text-base-content/70"
					onclick={() => run(settings)}
				>
					<Settings size={16} /> Settings
				</button>
			{/if}
			{#if preferences}
				<button
					type="button"
					class="btn btn-ghost min-h-11 flex-1 rounded-full text-base-content/70"
					onclick={customize}
				>
					<SlidersHorizontal size={16} /> Customize tools
				</button>
			{/if}
		</div>
	</Sheet>
{/if}
