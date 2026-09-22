<script lang="ts">
	import { tick } from 'svelte';
	import { fade, fly, scale, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { backOut, cubicOut } from 'svelte/easing';
	import {
		ArrowLeft,
		ArrowUpWideNarrow,
		Check,
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		CloudOff,
		Eye,
		Minus,
		Monitor,
		RotateCcw,
		SeparatorVertical,
		SlidersHorizontal,
		Smartphone,
		ToolCase,
		Trash2
	} from 'lucide-svelte';
	import { getQuizCommands } from './commands.svelte';
	import { getDockPreferences } from './dockPreferences.svelte';
	import {
		dockButtonClass,
		READOUT_CLASS,
		segmentShape,
		isPassive,
		segmentStyle,
		TONE_BADGE
	} from './dockStyles';
	import ReadoutContent from './ReadoutContent.svelte';
	import { shortcutLabelFor } from './shortcuts';
	import {
		DEFAULT_DOCK,
		DIVIDER_ID,
		displayFor,
		DOCK_PRESETS,
		dockHas,
		homeZoneFor,
		insertIntoDock,
		matchPreset,
		phoneRowFit,
		quickAddIndex,
		removeFromDock,
		removeTool,
		sameDock,
		withTools,
		zoneOf,
		type DockConfig,
		type DockDisplay,
		type DockDrop,
		type DockSurface,
		type DockZone
	} from './layouts';
	import type { CommandScope, QuizCommand } from './types';

	const registry = getQuizCommands();
	const preferences = getDockPreferences();

	const open = $derived(preferences?.customizing ?? false);
	const config = $derived<DockConfig>(preferences?.layout ?? DEFAULT_DOCK);
	const advanced = $derived(preferences?.advanced ?? false);

	const motion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
			? 0
			: 1;

	let preview = $state<DockSurface>('desktop');

	const SECTIONS: { scope: CommandScope | 'layout'; title: string }[] = [
		{ scope: 'answer', title: 'Answer' },
		{ scope: 'question', title: 'Question' },
		{ scope: 'navigation', title: 'Navigate' },
		{ scope: 'insight', title: 'At a glance' },
		{ scope: 'session', title: 'Session' },
		{ scope: 'preference', title: 'Preferences' },
		{ scope: 'layout', title: 'Layout' }
	];

	const QUICK_TOOLS = [
		'notes',
		'calculator',
		'reveal',
		'highlight',
		'streak',
		'shuffle',
		'progress',
		'timer',
		'nextUnanswered',
		'autoNext',
		'textSize',
		'reset'
	];

	const MINI_DOCK_LIMIT = 7;
	const BONE = 'rounded-full bg-base-content/[0.06]';
	const MOCK = 'rounded-2xl border border-dashed border-base-content/15 bg-base-100';
	const PHONE = 'rounded-[2rem] border-[3px] border-base-content/10 bg-base-100';
	const CAPTION = 'px-1 text-[0.65rem] font-semibold uppercase tracking-wider text-base-content/40';

	const DISPLAY_OPTIONS: [DockDisplay, string][] = [
		['icon', 'Icon'],
		['label', 'Text'],
		['both', 'Both']
	];

	type PaletteEntry = {
		id: string;
		name: string;
		description: string;
		icon: QuizCommand['icon'];
		badge: string;
		shortcut?: string;
	};

	const DIVIDER_ENTRY: PaletteEntry = {
		id: DIVIDER_ID,
		name: 'Divider',
		description: 'Group tools into clusters',
		icon: SeparatorVertical,
		badge: TONE_BADGE.neutral
	};

	function entryFor(command: QuizCommand): PaletteEntry {
		return {
			id: command.id,
			name: command.name,
			description: command.description,
			icon: command.icon,
			badge: TONE_BADGE[command.tone],
			shortcut: shortcutLabelFor(command.id)
		};
	}

	const available = $derived(
		Object.values(registry?.commands ?? {}).filter((command) => command.available?.() !== false)
	);

	const palette = $derived.by(() => {
		let offset = 0;
		return SECTIONS.map(({ scope, title }) => {
			const entries =
				scope === 'layout'
					? [DIVIDER_ENTRY]
					: available.filter((command) => command.scope === scope).map(entryFor);
			const section = { title, entries, offset };
			offset += entries.length;
			return section;
		}).filter((section) => section.entries.length > 0);
	});

	const quickTools = $derived(
		QUICK_TOOLS.map((id) => registry?.get(id)).filter(
			(command): command is QuizCommand => Boolean(command) && command!.available?.() !== false
		)
	);

	const activePreset = $derived(matchPreset(config));

	function commit(next: DockConfig) {
		preferences?.set(next);
	}

	function applyPreset(presetConfig: DockConfig) {
		selected = null;
		const next = withTools(presetConfig, config.tools);
		if (sameDock(next, DEFAULT_DOCK)) preferences?.reset();
		else commit(next);
	}

	function addToHome(id: string, itemsIndex: number) {
		const zone = homeZoneFor(id);
		commit(
			insertIntoDock(
				config,
				{ zone, index: zone === 'items' ? itemsIndex : config[zone].length },
				id,
				registry?.get(id)?.defaultDisplay ?? 'icon'
			)
		);
	}

	function toggleQuickTool(id: string) {
		if (dockHas(config, id)) {
			commit(removeTool(config, id));
			if (selection?.id === id) selected = null;
			return;
		}
		addToHome(id, quickAddIndex(config));
	}

	function acceptsOverflow(id: string) {
		return id !== DIVIDER_ID && !isPassive(registry?.get(id));
	}

	function accepts(zone: DockZone, id: string) {
		if (zone === 'overflow') return acceptsOverflow(id);
		if (zone === 'tools') return id !== DIVIDER_ID;
		return true;
	}

	const ZONE_NAMES: Record<DockZone, string> = {
		items: 'dock',
		overflow: 'menu',
		tools: 'tools'
	};

	function nameOf(id: string) {
		return id === DIVIDER_ID ? 'Divider' : (registry?.get(id)?.name ?? id);
	}

	// ── selection ────────────────────────────────────────────────────────────
	let selected = $state<{ zone: DockZone; key: string } | null>(null);

	const selection = $derived.by(() => {
		if (!selected) return null;
		if (selected.zone === 'items') {
			const index = config.items.findIndex((item) => item.key === selected!.key);
			if (index === -1) return null;
			const item = config.items[index];
			return { zone: 'items' as const, index, id: item.id, display: item.display };
		}
		const zone = selected.zone;
		const index = config[zone].indexOf(selected.key);
		if (index === -1) return null;
		return { zone, index, id: selected.key, display: 'icon' as DockDisplay };
	});

	function toggleSelected(zone: DockZone, key: string) {
		if (suppressClick) return;
		selected = selected?.key === key && selected.zone === zone ? null : { zone, key };
	}

	function setDisplay(display: DockDisplay) {
		if (selection?.zone !== 'items') return;
		commit({
			...config,
			items: config.items.map((item, i) => (i === selection.index ? { ...item, display } : item))
		});
	}

	function moveSelected(delta: number) {
		if (!selection) return;
		const target = selection.index + delta;
		const list = selection.zone === 'items' ? [...config.items] : [...config[selection.zone]];
		if (target < 0 || target >= list.length) return;
		[list[selection.index], list[target]] = [list[target], list[selection.index]];
		commit({ ...config, [selection.zone]: list });
	}

	function moveToZone(zone: DockZone) {
		if (!selection || zone === selection.zone || !accepts(zone, selection.id)) return;
		if (zone === 'overflow') moreOpen = true;
		const without = removeFromDock(config, selection.zone, selection.index);
		const next = insertIntoDock(
			without,
			{ zone, index: zone === 'items' ? quickAddIndex(without) : without[zone].length },
			selection.id,
			registry?.get(selection.id)?.defaultDisplay ?? 'icon'
		);
		commit(next);
		const key = zone === 'items' ? next.items.find((i) => i.id === selection.id)?.key : null;
		selected = { zone, key: key ?? selection.id };
	}

	function removeSelected() {
		if (!selection) return;
		commit(removeFromDock(config, selection.zone, selection.index));
		selected = null;
	}

	function handleChipKeydown(event: KeyboardEvent, zone: DockZone, key: string) {
		if (selected?.key !== key || selected.zone !== zone) return;
		if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') moveSelected(-1);
		else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') moveSelected(1);
		else if (event.key === 'Delete' || event.key === 'Backspace') removeSelected();
		else return;
		event.preventDefault();
	}

	function togglePaletteEntry(id: string) {
		if (suppressClick) return;
		if (id !== DIVIDER_ID && dockHas(config, id)) {
			commit(removeTool(config, id));
			if (selection?.id === id) selected = null;
			return;
		}
		if (id === DIVIDER_ID) {
			commit(insertIntoDock(config, { zone: 'items', index: config.items.length }, id));
			return;
		}
		addToHome(id, config.items.length);
	}

	// ── drag and drop ────────────────────────────────────────────────────────
	type DragSource =
		| { from: 'palette'; id: string }
		| { from: DockZone; id: string; index: number; display: DockDisplay };

	type Drag = { source: DragSource; x: number; y: number; over: DockDrop | null };

	let drag = $state<Drag | null>(null);
	let ghostOut = $state({ start: 0.6, duration: 180 * motion });
	let itemsZone = $state<HTMLElement | null>(null);
	let overflowZone = $state<HTMLElement | null>(null);
	let toolsZone = $state<HTMLElement | null>(null);
	let moreOpen = $state(false);
	let suppressClick = false;
	let pending: {
		source: DragSource;
		startX: number;
		startY: number;
		pointerType: string;
		immediate: boolean;
		timer: ReturnType<typeof setTimeout> | null;
	} | null = null;

	const removing = $derived(drag !== null && drag.source.from !== 'palette' && drag.over === null);

	function handlePointerDown(event: PointerEvent, source: DragSource, immediate: boolean) {
		if (event.button !== 0) return;
		pending = {
			source,
			startX: event.clientX,
			startY: event.clientY,
			pointerType: event.pointerType,
			immediate: immediate || event.pointerType !== 'touch',
			timer: null
		};
		if (!pending.immediate) {
			pending.timer = setTimeout(() => startDrag(event.clientX, event.clientY), 220);
		}
		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp);
		window.addEventListener('pointercancel', cancelDrag);
		window.addEventListener('touchmove', blockScroll, { passive: false });
	}

	function startDrag(x: number, y: number) {
		if (!pending) return;
		drag = { source: pending.source, x, y, over: null };
		drag.over = hitTest(x, y);
		selected = null;
		if (pending.pointerType === 'touch') navigator.vibrate?.(8);
	}

	function handlePointerMove(event: PointerEvent) {
		if (drag) {
			drag.x = event.clientX;
			drag.y = event.clientY;
			drag.over = hitTest(event.clientX, event.clientY);
			return;
		}
		if (!pending) return;
		const distance = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY);
		if (pending.immediate && distance > 4) startDrag(event.clientX, event.clientY);
		else if (!pending.immediate && distance > 10) cancelDrag();
	}

	function handlePointerUp() {
		if (drag) {
			const { source, over } = drag;
			let next = config;
			if (source.from !== 'palette') next = removeFromDock(next, source.from, source.index);
			if (over) {
				const display =
					source.from === 'items'
						? source.display
						: (registry?.get(source.id)?.defaultDisplay ?? 'icon');
				next = insertIntoDock(next, over, source.id, display);
			}
			ghostOut = { start: over ? 1 : 0.4, duration: over ? 0 : 200 * motion };
			if (next !== config) commit(next);
			suppressClick = true;
			setTimeout(() => (suppressClick = false), 0);
		}
		cancelDrag();
	}

	function cancelDrag() {
		if (pending?.timer) clearTimeout(pending.timer);
		pending = null;
		drag = null;
		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', handlePointerUp);
		window.removeEventListener('pointercancel', cancelDrag);
		window.removeEventListener('touchmove', blockScroll);
	}

	function blockScroll(event: TouchEvent) {
		if (drag) event.preventDefault();
	}

	function hitTest(x: number, y: number): DockDrop | null {
		const id = drag?.source.id ?? pending?.source.id;
		for (const [zone, element] of [
			['tools', toolsZone],
			['items', itemsZone],
			['overflow', overflowZone]
		] as const) {
			if (!element) continue;
			const rect = element.getBoundingClientRect();
			const slack = 18;
			if (
				x < rect.left - slack ||
				x > rect.right + slack ||
				y < rect.top - slack ||
				y > rect.bottom + slack
			)
				continue;
			if (id && !accepts(zone, id)) return null;
			// The collapsed More menu still takes drops; they land at the end.
			if (zone === 'overflow' && !moreOpen) return { zone, index: config.overflow.length };
			return { zone, index: indexAt(element, x, y) };
		}
		return null;
	}

	function indexAt(zone: HTMLElement, x: number, y: number) {
		const chips = zone.querySelectorAll<HTMLElement>('[data-chip]');
		for (let i = 0; i < chips.length; i++) {
			const rect = chips[i].getBoundingClientRect();
			if (y < rect.top) return i;
			if (y <= rect.bottom && x < rect.left + rect.width / 2) return i;
		}
		return chips.length;
	}

	type ViewEntry<T> = { kind: 'chip'; value: T; index: number } | { kind: 'placeholder' };

	function withPlaceholder<T>(list: T[], zone: DockZone): ViewEntry<T>[] {
		let view: ViewEntry<T>[] = list.map((value, index) => ({ kind: 'chip', value, index }));
		if (drag && drag.source.from === zone) {
			const hidden = drag.source.index;
			view = view.filter((entry) => entry.kind !== 'chip' || entry.index !== hidden);
		}
		if (drag?.over?.zone === zone) view.splice(drag.over.index, 0, { kind: 'placeholder' });
		return view;
	}

	const itemsView = $derived(withPlaceholder(config.items, 'items'));
	const overflowView = $derived(withPlaceholder(config.overflow, 'overflow'));
	const toolsView = $derived(withPlaceholder(config.tools, 'tools'));
	const itemIds = $derived(config.items.map((item) => item.id));
	// Keys of dock items a typical phone moves into More to keep its one row.
	const PHONE_PREVIEW_WIDTH = 375;
	const foldedOnPhone = $derived.by(() => {
		if (preview !== 'mobile') return new Set<string>();
		const middle = config.items.filter(
			(item) => item.id !== DIVIDER_ID && item.id !== 'previous' && item.id !== 'next'
		);
		const navButtons = config.items.filter(
			(item) => item.id === 'previous' || item.id === 'next'
		).length;
		const fit = phoneRowFit(
			middle.map((item) => ({ id: item.id, passive: isPassive(registry?.get(item.id)) })),
			PHONE_PREVIEW_WIDTH,
			navButtons
		);
		return new Set(middle.filter((_, index) => !fit.has(index)).map((item) => item.key));
	});
	const foldedNames = $derived(
		config.items.filter((item) => foldedOnPhone.has(item.key)).map((item) => nameOf(item.id))
	);

	// ── chrome ───────────────────────────────────────────────────────────────
	let doneButton = $state<HTMLButtonElement | null>(null);
	let confirmingReset = $state(false);

	$effect(() => {
		if (!open) return;
		selected = null;
		confirmingReset = false;
		moreOpen = false;
		preview = window.matchMedia('(min-width: 768px)').matches ? 'desktop' : 'mobile';
		void tick().then(() => doneButton?.focus());
	});

	$effect(() => {
		if (!confirmingReset) return;
		const timer = setTimeout(() => (confirmingReset = false), 3000);
		return () => clearTimeout(timer);
	});

	function resetDock() {
		if (!confirmingReset) {
			confirmingReset = true;
			return;
		}
		preferences?.reset();
		selected = null;
		confirmingReset = false;
	}

	function close() {
		cancelDrag();
		preferences?.close();
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (!open || event.key !== 'Escape') return;
		event.preventDefault();
		if (drag) cancelDrag();
		else if (selected) selected = null;
		else close();
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#snippet miniDock(preset: DockConfig)}
	{@const shown = preset.items.slice(0, MINI_DOCK_LIMIT)}
	{@const extra = preset.items.length - shown.length + preset.overflow.length}
	<span class="flex min-w-0 max-w-full items-center gap-1 overflow-hidden">
		{#each shown as item (item.key)}
			{@const command = registry?.get(item.id)}
			{#if item.id === DIVIDER_ID}
				<span class="mx-0.5 h-3.5 w-px shrink-0 bg-base-content/20"></span>
			{:else if command}
				{@const Icon = command.icon}
				<span
					class="grid size-5 shrink-0 place-items-center rounded-full {TONE_BADGE[command.tone]}"
				>
					<Icon size={11} />
				</span>
			{/if}
		{/each}
		{#if extra > 0}
			<span class="ml-0.5 shrink-0 text-[0.65rem] font-medium text-base-content/45">+{extra}</span>
		{/if}
	</span>
{/snippet}

{#snippet toolsZoneEl()}
	{@const phone = preview === 'mobile'}
	{@const tileSize = phone ? 'h-14 w-[4.5rem]' : 'h-12 w-14'}
	<div
		bind:this={toolsZone}
		class="mx-auto w-full rounded-2xl border bg-base-100/95 p-2 shadow-lg backdrop-blur transition-all duration-200
			{phone ? 'max-w-[21rem] pt-1.5' : ''}
			{drag?.over?.zone === 'tools' ? 'border-primary/60 ring-4 ring-primary/15' : 'border-base-300'}"
	>
		{#if phone}
			<span class="mx-auto mb-1.5 block h-1 w-8 rounded-full bg-base-300"></span>
			<div class="mb-1.5 px-0.5 text-xs font-semibold">Tools</div>
		{:else}
			<div
				class="mb-1 flex items-center justify-between px-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-base-content/45"
			>
				Tools
				<SlidersHorizontal size={10} />
			</div>
		{/if}
		<div class="flex flex-wrap gap-1" role="list" aria-label="Tools bar preview">
			{#each toolsView as entry (entry.kind === 'chip' ? entry.value : 'placeholder')}
				<div
					class="flex"
					role="listitem"
					animate:flip={{ duration: 220 * motion, easing: cubicOut }}
					in:scale={{ start: 0.6, duration: 260 * motion, easing: backOut }}
				>
					{#if entry.kind === 'placeholder'}
						<span
							class="{tileSize} rounded-xl border-2 border-dashed border-primary/50 bg-primary/10"
						></span>
					{:else}
						{@const id = entry.value}
						{@const command = registry?.get(id)}
						{@const Icon = command?.icon}
						{@const isSelected = selected?.zone === 'tools' && selected.key === id}
						<button
							type="button"
							data-chip
							class="flex {tileSize} touch-none select-none cursor-grab flex-col items-center justify-center gap-0.5 rounded-xl text-[0.6rem] font-semibold shadow-xs ring-1 ring-inset ring-current/20 transition active:cursor-grabbing hover:ring-current/40 {command
								? TONE_BADGE[command.tone]
								: 'bg-base-100'}
							{isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100' : ''}"
							aria-label={`${nameOf(id)}${isSelected ? ', selected' : ''}`}
							aria-pressed={isSelected}
							onpointerdown={(event) =>
								handlePointerDown(
									event,
									{ from: 'tools', id, index: entry.index, display: 'icon' },
									true
								)}
							onclick={() => toggleSelected('tools', id)}
							onkeydown={(event) => handleChipKeydown(event, 'tools', id)}
						>
							{#if Icon}<Icon size={16} />{/if}
							<span class="max-w-full truncate px-1">{command?.name ?? id}</span>
						</button>
					{/if}
				</div>
			{:else}
				<span
					class="flex min-h-12 w-full items-center justify-center rounded-xl border border-dashed border-base-300 px-2 text-center text-[0.68rem] text-base-content/45"
				>
					Drop study tools here
				</span>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet optionBone(width: number)}
	<span class="flex h-7 items-center gap-2 rounded-full border border-base-content/10 px-2.5">
		<span class="size-3 shrink-0 rounded-full border border-base-content/15"></span>
		<span class="h-1.5 {BONE}" style="width: {width}%"></span>
	</span>
{/snippet}

{#snippet dockZoneEl()}
	<div
		bind:this={itemsZone}
		style="--dock-gap: {preview === 'desktop' ? '0.5rem' : '0.25rem'}"
		class="flex min-h-14 flex-wrap items-center justify-center border bg-base-100/95 py-3 backdrop-blur transition-all duration-300
			{preview === 'desktop'
			? 'min-w-[14rem] max-w-full gap-2 rounded-full px-4 shadow-lg'
			: 'w-full max-w-[21rem] gap-1 rounded-2xl px-2 shadow-lg'}
			{drag?.over?.zone === 'items' ? 'border-primary/60 ring-4 ring-primary/15' : 'border-base-300'}"
		role="list"
		aria-label="Dock preview"
	>
		{#each itemsView as entry (entry.kind === 'chip' ? entry.value.key : 'placeholder')}
			<div
				class="flex"
				role="listitem"
				animate:flip={{ duration: 220 * motion, easing: cubicOut }}
				in:scale={{ start: 0.5, duration: 280 * motion, easing: backOut }}
			>
				{#if entry.kind === 'placeholder'}
					<span class="h-8 w-10 rounded-full border-2 border-dashed border-primary/50 bg-primary/10"
					></span>
				{:else}
					{@const item = entry.value}
					{@const command = registry?.get(item.id)}
					{@const display = displayFor(item.id, item.display, preview)}
					{@const isSelected = selected?.zone === 'items' && selected.key === item.key}
					{@const ring = isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100' : ''}
					{@const contextual = command?.visible?.() === false}
					{@const hiddenOnPhone = item.id === DIVIDER_ID && preview === 'mobile'}
					{@const inMoreOnPhone = foldedOnPhone.has(item.key)}
					<button
						type="button"
						data-chip
						class="touch-none select-none cursor-grab active:cursor-grabbing {item.id === DIVIDER_ID
							? `flex h-8 w-4 items-center justify-center rounded-full ${ring} ${hiddenOnPhone ? 'opacity-30' : ''}`
							: isPassive(command)
								? `${READOUT_CLASS} ${ring}`
								: command
									? `${dockButtonClass(command, {
											display,
											shape: segmentShape(itemIds, entry.index),
											active: command.active?.() ?? false
										})} ${ring}`
									: `btn btn-sm btn-dash rounded-full ${ring}`}
							{contextual || inMoreOnPhone
							? 'outline-1 outline-dashed outline-offset-2 outline-base-content/30'
							: ''}
							{inMoreOnPhone ? 'opacity-45' : ''}"
						style={item.id === DIVIDER_ID || isPassive(command)
							? undefined
							: segmentStyle(segmentShape(itemIds, entry.index))}
						title={hiddenOnPhone
							? 'Divider · hidden on phones'
							: inMoreOnPhone
								? `${nameOf(item.id)} · in More on phones`
								: contextual
									? `${nameOf(item.id)} · appears when available`
									: nameOf(item.id)}
						aria-label={`${nameOf(item.id)}${isSelected ? ', selected' : ''}`}
						aria-pressed={isSelected}
						onpointerdown={(event) =>
							handlePointerDown(
								event,
								{ from: 'items', id: item.id, index: entry.index, display: item.display },
								true
							)}
						onclick={() => toggleSelected('items', item.key)}
						onkeydown={(event) => handleChipKeydown(event, 'items', item.key)}
					>
						{#if item.id === DIVIDER_ID}
							<span class="h-6 w-px bg-base-content/25"></span>
						{:else if command && isPassive(command)}
							<ReadoutContent {command} />
						{:else if command}
							{@const Icon =
								command.active?.() && command.activeIcon ? command.activeIcon : command.icon}
							{#if display !== 'label'}<Icon size={18} />{/if}
							{#if display !== 'icon'}{command.label()}{/if}
						{:else}
							{nameOf(item.id)}
						{/if}
					</button>
				{/if}
			</div>
		{:else}
			<span class="px-2 text-sm text-base-content/50">Drop tools here</span>
		{/each}
	</div>
{/snippet}

{#if open && preferences}
	<div class="fixed inset-0 z-[90]">
		<button
			type="button"
			class="absolute inset-0 bg-black/35 backdrop-blur-[3px] cursor-default"
			aria-label="Close dock customizer"
			onclick={close}
			transition:fade={{ duration: 200 * motion }}
		></button>

		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="dock-customizer-title"
			class="absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] w-full max-w-4xl flex-col rounded-t-[2rem] border border-b-0 border-base-300 bg-base-100 shadow-2xl"
			transition:fly={{ y: 120, opacity: 0, duration: 420 * motion, easing: backOut }}
		>
			<div class="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-base-300"></div>

			<header class="flex flex-wrap items-start justify-between gap-3 px-5 pt-3 sm:px-7">
				<div>
					<h2 id="dock-customizer-title" class="text-lg font-semibold tracking-tight">
						Dock and tools
					</h2>
					<p class="text-sm text-base-content/60">
						One layout, synced to your account on every device.
					</p>
				</div>
				<div role="tablist" aria-label="Preview on" class="tabs tabs-box tabs-sm rounded-full p-1">
					<button
						role="tab"
						type="button"
						class="tab gap-1.5 rounded-full px-3.5 {preview === 'desktop' ? 'tab-active' : ''}"
						aria-selected={preview === 'desktop'}
						onclick={() => (preview = 'desktop')}
					>
						<Monitor size={14} /> Desktop
					</button>
					<button
						role="tab"
						type="button"
						class="tab gap-1.5 rounded-full px-3.5 {preview === 'mobile' ? 'tab-active' : ''}"
						aria-selected={preview === 'mobile'}
						onclick={() => (preview = 'mobile')}
					>
						<Smartphone size={14} /> Phone
					</button>
				</div>
			</header>

			<!-- Phones scroll the stage and the palette together; wider screens pin the stage. -->
			<div
				class="min-h-0 flex-1 overflow-y-auto overscroll-contain sm:flex sm:flex-col sm:overflow-hidden"
			>
				<!-- Stage: each zone framed by the part of the module page it lives in. -->
				<div
					class="dock-stage mx-5 mt-4 flex shrink-0 flex-col items-center gap-3 rounded-3xl border border-base-300/70 bg-base-200/50 px-3 py-4 sm:mx-7"
				>
					<!-- Mock cards sit on top; the editable zones break out below them, side by side. -->
					<div class="grid w-full gap-x-3 sm:grid-cols-[minmax(11rem,14rem)_1fr]">
						<span
							class="{CAPTION} mb-1.5 sm:col-start-1 sm:row-start-1 {preview === 'mobile'
								? 'text-center'
								: ''}">{preview === 'desktop' ? 'Sidebar' : 'Tools sheet, from the top bar'}</span
						>
						{#if preview === 'desktop'}
							<div
								class="flex flex-col gap-2.5 {MOCK} p-3 pb-12 sm:col-start-1 sm:row-start-2"
								aria-label="Sidebar"
							>
								<span class="h-2 w-10 {BONE}"></span>
								<span class="flex items-center gap-1.5">
									<span class="size-4 shrink-0 {BONE}"></span>
									<span class="h-2.5 w-3/4 {BONE}"></span>
								</span>
								<span class="flex flex-col gap-1.5 rounded-xl border border-base-content/10 p-2">
									<span class="h-1.5 w-1/2 {BONE}"></span>
									<span class="h-1 w-full {BONE}"
										><span class="block h-1 w-1/6 rounded-full bg-base-content/15"></span></span
									>
								</span>
								<span class="h-1.5 w-2/3 {BONE}"></span>
							</div>
						{:else}
							<div
								class="mx-auto flex w-full max-w-[21rem] flex-col gap-2 {PHONE} px-4 pb-12 pt-4 sm:col-start-1 sm:row-start-2"
								aria-label="Phone"
							>
								<span
									class="-mx-1 flex items-center gap-1.5 border-b border-base-content/10 pb-2"
									aria-label="Top bar"
								>
									<ChevronLeft size={14} class="shrink-0 text-base-content/35" />
									<span class="flex flex-1 flex-col gap-1">
										<span class="h-2 w-3/4 {BONE}"></span>
										<span class="h-1.5 w-1/3 {BONE}"></span>
									</span>
									<span class="size-5 shrink-0 rounded-full border-2 border-base-content/15"></span>
									<Eye size={14} class="shrink-0 text-base-content/35" />
									<span
										class="grid size-7 shrink-0 place-items-center rounded-full text-primary ring-1 ring-primary/40"
										title="The Tools button in the top bar opens the sheet below"
									>
										<ToolCase size={14} />
									</span>
								</span>
								<span class="h-2.5 w-full {BONE}"></span>
								{@render optionBone(40)}
							</div>
						{/if}
						<div class="relative z-10 -mt-9 px-2 sm:col-start-1 sm:row-start-3">
							{@render toolsZoneEl()}
						</div>

						<span
							class="{CAPTION} mb-1.5 mt-4 sm:col-start-2 sm:row-start-1 sm:mt-0 {preview ===
							'mobile'
								? 'text-center'
								: ''}">Question</span
						>
						{#if preview === 'desktop'}
							<div
								class="flex flex-col gap-2 {MOCK} p-3 pb-12 sm:col-start-2 sm:row-start-2"
								aria-label="Question"
							>
								<span
									class="mb-1 flex gap-1 overflow-hidden rounded-full border border-base-content/10 p-1"
								>
									{#each { length: 12 }, i (i)}
										<span
											class="size-3.5 shrink-0 rounded-full {i === 3
												? 'bg-base-content/15'
												: 'bg-base-content/[0.06]'}"
										></span>
									{/each}
								</span>
								<span class="h-2.5 w-11/12 {BONE}"></span>
								<span class="mb-1 h-2.5 w-2/3 {BONE}"></span>
								{#each { length: 2 }, i (i)}
									{@render optionBone([45, 30][i])}
								{/each}
							</div>
						{:else}
							<div
								class="mx-auto flex w-full max-w-[21rem] flex-col gap-2 {PHONE} px-4 pb-12 pt-4 sm:col-start-2 sm:row-start-2"
								aria-label="Phone"
							>
								<span class="h-2.5 w-full {BONE}"></span>
								<span class="mb-1 h-2.5 w-2/3 {BONE}"></span>
								{@render optionBone(50)}
							</div>
						{/if}
						<div
							class="relative z-10 -mt-9 flex items-start justify-center px-2 sm:col-start-2 sm:row-start-3"
						>
							{@render dockZoneEl()}
						</div>
					</div>

					<div class="grid w-full gap-3 sm:grid-cols-[minmax(11rem,14rem)_1fr]">
						<span class="hidden sm:block"></span>
						<div class="flex justify-center">
							<div
								bind:this={overflowZone}
								class="transition-all duration-200
							{moreOpen
									? 'w-full max-w-md rounded-2xl border bg-base-100/85 p-2.5'
									: 'self-center rounded-full border'}
							{drag?.over?.zone === 'overflow'
									? 'scale-[1.02] border-primary/60 ring-4 ring-primary/15'
									: moreOpen
										? 'border-base-300'
										: 'border-transparent'}"
							>
								<button
									type="button"
									class="flex items-center gap-1.5 rounded-full text-xs font-medium text-base-content/55 transition-colors hover:text-base-content
								{moreOpen ? 'mb-2 px-1' : 'px-3 py-1.5 hover:bg-base-content/5'}"
									aria-expanded={moreOpen}
									aria-controls="dock-more-menu"
									onclick={() => {
										moreOpen = !moreOpen;
										if (!moreOpen && selected?.zone === 'overflow') selected = null;
									}}
								>
									<ArrowUpWideNarrow size={13} />
									More menu
									{#if config.overflow.length}
										<span class="badge badge-ghost badge-xs tabular-nums"
											>{config.overflow.length}</span
										>
									{/if}
									{#if moreOpen}
										<span class="font-normal text-base-content/40">· tucked behind one button</span>
									{/if}
									<ChevronDown
										size={13}
										class="transition-transform duration-200 {moreOpen ? 'rotate-180' : ''}"
									/>
								</button>
								{#if moreOpen}
									<div
										id="dock-more-menu"
										class="flex min-h-8 flex-wrap gap-1.5"
										role="list"
										aria-label="More menu preview"
										transition:slide={{ duration: 180 * motion, easing: cubicOut }}
									>
										{#each overflowView as entry (entry.kind === 'chip' ? entry.value : 'placeholder')}
											<div
												class="flex"
												role="listitem"
												animate:flip={{ duration: 220 * motion, easing: cubicOut }}
												in:scale={{ start: 0.6, duration: 260 * motion, easing: backOut }}
											>
												{#if entry.kind === 'placeholder'}
													<span
														class="h-8 w-20 rounded-field border-2 border-dashed border-primary/50 bg-primary/10"
													></span>
												{:else}
													{@const id = entry.value}
													{@const command = registry?.get(id)}
													{@const Icon = command?.icon}
													{@const isSelected = selected?.zone === 'overflow' && selected.key === id}
													<button
														type="button"
														data-chip
														class="inline-flex h-8 touch-none select-none cursor-grab items-center gap-1.5 rounded-field border border-base-300 bg-base-100 px-2.5 text-xs font-medium shadow-xs transition active:cursor-grabbing hover:border-base-content/25
												{command?.tone === 'error' ? 'text-error' : ''}
												{isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100' : ''}"
														aria-label={`${nameOf(id)}${isSelected ? ', selected' : ''}`}
														aria-pressed={isSelected}
														onpointerdown={(event) =>
															handlePointerDown(
																event,
																{ from: 'overflow', id, index: entry.index, display: 'icon' },
																true
															)}
														onclick={() => toggleSelected('overflow', id)}
														onkeydown={(event) => handleChipKeydown(event, 'overflow', id)}
													>
														{#if Icon}<Icon size={14} />{/if}
														{nameOf(id)}
													</button>
												{/if}
											</div>
										{:else}
											<span
												class="flex h-8 w-full items-center justify-center rounded-field border border-dashed border-base-300 text-xs text-base-content/45"
											>
												Drop tools here to tuck them away
											</span>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</div>

					<div class="flex min-h-9 items-center justify-center text-center">
						{#if selection}
							{@const canOverflow = acceptsOverflow(selection.id)}
							{@const isReadout = isPassive(registry?.get(selection.id))}
							<div
								class="flex flex-wrap items-center justify-center gap-2 rounded-full border border-base-300 bg-base-100 px-2 py-1 shadow-sm"
								in:fly={{ y: 6, duration: 200 * motion, easing: cubicOut }}
							>
								<span class="px-2 text-sm font-medium">{nameOf(selection.id)}</span>
								{#if selection.zone === 'items' && selection.id !== DIVIDER_ID && !isReadout}
									{#if preview === 'mobile' && selection.id !== 'check'}
										<span class="text-xs text-base-content/50">Icon only on phones</span>
									{:else}
										<div class="join" role="group" aria-label="Button style">
											{#each DISPLAY_OPTIONS as [value, text] (value)}
												<button
													type="button"
													class="btn join-item btn-xs {selection.display === value
														? 'btn-primary'
														: 'btn-ghost'}"
													aria-pressed={selection.display === value}
													onclick={() => setDisplay(value)}>{text}</button
												>
											{/each}
										</div>
									{/if}
								{/if}
								<div class="flex items-center">
									<button
										type="button"
										class="btn btn-ghost btn-xs btn-circle"
										aria-label="Move earlier"
										title="Move earlier (←)"
										disabled={selection.index === 0}
										onclick={() => moveSelected(-1)}><ChevronLeft size={14} /></button
									>
									<button
										type="button"
										class="btn btn-ghost btn-xs btn-circle"
										aria-label="Move later"
										title="Move later (→)"
										disabled={selection.index ===
											(selection.zone === 'items'
												? config.items.length
												: config[selection.zone].length) -
												1}
										onclick={() => moveSelected(1)}><ChevronRight size={14} /></button
									>
								</div>
								{#if selection.id !== DIVIDER_ID}
									{#each ['tools', 'items', 'overflow'] as const as zone (zone)}
										{#if zone !== selection.zone && (zone !== 'overflow' || canOverflow)}
											<button
												type="button"
												class="btn btn-ghost btn-xs rounded-full"
												onclick={() => moveToZone(zone)}
											>
												Move to {ZONE_NAMES[zone]}
											</button>
										{/if}
									{/each}
								{/if}
								<button
									type="button"
									class="btn btn-ghost btn-xs btn-circle text-error"
									aria-label="Remove"
									title="Remove (Delete)"
									onclick={removeSelected}><Trash2 size={14} /></button
								>
							</div>
						{:else if foldedNames.length}
							<p
								class="rounded-full bg-warning/15 px-3 py-1 text-xs text-base-content/80"
								in:fade={{ duration: 150 * motion }}
							>
								Phones keep one row, so {new Intl.ListFormat('en', { type: 'conjunction' }).format(
									foldedNames
								)}
								{foldedNames.length === 1 ? 'moves' : 'move'} into More there.
							</p>
						{:else if preferences.syncError}
							<p
								class="flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs text-base-content/80"
							>
								<CloudOff size={13} class="text-warning" /> Saved on this device. It will sync once you're
								back online.
							</p>
						{:else}
							<p class="text-xs text-base-content/45">
								{preview === 'mobile'
									? 'Phones show one row of icons: Check stretches, and previous and next sit together on the right.'
									: 'Drag to reorder. Tap a tool to fine-tune it.'}
							</p>
						{/if}
					</div>
				</div>

				<div
					class="px-5 pb-4 pt-5 sm:min-h-0 sm:flex-1 sm:overflow-y-auto sm:overscroll-contain sm:px-7"
				>
					{#if !advanced}
						<div in:fade={{ duration: 180 * motion }}>
							<div class="mb-2 flex items-baseline justify-between">
								<h3
									class="text-[0.7rem] font-semibold uppercase tracking-wider text-base-content/45"
								>
									Start from
								</h3>
								{#if !activePreset}
									<span class="badge badge-ghost badge-sm" in:scale={{ duration: 180 * motion }}
										>Custom layout</span
									>
								{/if}
							</div>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
								{#each DOCK_PRESETS as preset, i (preset.id)}
									{@const current = activePreset === preset.id}
									<button
										type="button"
										class="group relative flex flex-col items-start gap-2 rounded-box border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
										{current
											? 'border-primary bg-primary/[0.05] ring-1 ring-primary/30'
											: 'border-base-300 bg-base-100 hover:border-base-content/20'}"
										aria-pressed={current}
										onclick={() => applyPreset(preset.config)}
										in:fly|global={{
											y: 10,
											duration: 280 * motion,
											delay: (60 + i * 40) * motion,
											easing: cubicOut
										}}
									>
										<span class="flex w-full items-center justify-between">
											<span class="text-sm font-semibold">{preset.name}</span>
											{#if current}
												<span
													class="grid size-5 place-items-center rounded-full bg-primary text-primary-content"
													in:scale={{ start: 0.3, duration: 240 * motion, easing: backOut }}
												>
													<Check size={11} strokeWidth={3} />
												</span>
											{/if}
										</span>
										{@render miniDock(preset.config)}
										<span class="text-xs text-base-content/55">{preset.description}</span>
									</button>
								{/each}
							</div>

							<h3
								class="mb-2 mt-6 text-[0.7rem] font-semibold uppercase tracking-wider text-base-content/45"
							>
								Quick tools
							</h3>
							<ul class="divide-y divide-base-300/70 rounded-box border border-base-300">
								{#each quickTools as command, i (command.id)}
									{@const on = dockHas(config, command.id)}
									{@const zone = zoneOf(config, command.id)}
									{@const Icon = command.icon}
									<li
										in:fly|global={{
											y: 8,
											duration: 260 * motion,
											delay: (160 + i * 22) * motion,
											easing: cubicOut
										}}
									>
										<label
											class="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-base-200/50"
										>
											<span
												class="grid size-8 shrink-0 place-items-center rounded-field {TONE_BADGE[
													command.tone
												]}"
											>
												<Icon size={16} />
											</span>
											<span class="min-w-0 flex-1">
												<span class="flex items-center gap-1.5 text-sm font-medium">
													{command.name}
													{#if zone === 'overflow' || zone === 'tools'}
														<span class="badge badge-ghost badge-xs">in {ZONE_NAMES[zone]}</span>
													{/if}
												</span>
												<span class="block truncate text-xs text-base-content/55"
													>{command.description}</span
												>
											</span>
											<input
												type="checkbox"
												class="toggle toggle-primary toggle-sm"
												checked={on}
												onchange={() => toggleQuickTool(command.id)}
												aria-label={`Show ${command.name} in ${ZONE_NAMES[zone ?? homeZoneFor(command.id)]}`}
											/>
										</label>
									</li>
								{/each}
							</ul>

							<button
								type="button"
								class="group mt-4 flex w-full items-center gap-3 rounded-box border border-dashed border-base-300 px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
								onclick={() => preferences.setAdvanced(true)}
							>
								<span
									class="grid size-8 place-items-center rounded-field bg-base-content/5 text-base-content/70"
								>
									<SlidersHorizontal size={16} />
								</span>
								<span class="flex-1">
									<span class="block text-sm font-medium">Fine-tune every button</span>
									<span class="block text-xs text-base-content/55"
										>All {available.length} tools, drag and drop, labels, and dividers</span
									>
								</span>
								<ChevronRight
									size={16}
									class="text-base-content/40 transition-transform group-hover:translate-x-0.5"
								/>
							</button>
						</div>
					{:else}
						<div in:fade={{ duration: 180 * motion }}>
							<button
								type="button"
								class="btn btn-ghost btn-xs -ml-2 mb-3 rounded-full text-base-content/60"
								onclick={() => preferences.setAdvanced(false)}
							>
								<ArrowLeft size={13} /> Presets and quick tools
							</button>
							{#each palette as section (section.title)}
								<h3
									class="mb-2 mt-4 text-[0.7rem] font-semibold uppercase tracking-wider text-base-content/45"
								>
									{section.title}
								</h3>
								<div class="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3">
									{#each section.entries as entry, i (entry.id)}
										{@const added = entry.id !== DIVIDER_ID && dockHas(config, entry.id)}
										{@const lifted = drag?.source.from === 'palette' && drag.source.id === entry.id}
										{@const Icon = entry.icon}
										<button
											type="button"
											class="group relative flex select-none [-webkit-touch-callout:none] items-center gap-3 rounded-box border p-2.5 text-left transition-all duration-200 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md
											{added
												? 'border-primary/30 bg-primary/[0.04]'
												: 'border-base-300 bg-base-100 hover:border-base-content/20'}
											{lifted ? 'scale-95 opacity-40' : ''}"
											aria-pressed={added}
											aria-label={`${entry.name}: ${entry.description}. ${added ? 'Added, activate to remove' : 'Activate to add'}`}
											onpointerdown={(event) =>
												handlePointerDown(event, { from: 'palette', id: entry.id }, false)}
											onclick={() => togglePaletteEntry(entry.id)}
											in:fly|global={{
												y: 10,
												duration: 280 * motion,
												delay: (40 + (section.offset + i) * 14) * motion,
												easing: cubicOut
											}}
										>
											<span
												class="grid size-9 shrink-0 place-items-center rounded-field transition-transform duration-200 group-hover:scale-110 {entry.badge}"
											>
												<Icon size={18} />
											</span>
											<span class="min-w-0 flex-1">
												<span class="flex items-center gap-1.5 text-sm font-medium">
													<span class="truncate">{entry.name}</span>
													{#if entry.shortcut}
														<kbd class="kbd kbd-xs shrink-0 opacity-60">{entry.shortcut}</kbd>
													{/if}
												</span>
												<span class="block truncate text-xs text-base-content/55"
													>{entry.description}</span
												>
											</span>
											{#if added}
												<span
													class="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-content shadow-sm ring-2 ring-base-100"
													in:scale={{ start: 0.3, duration: 260 * motion, easing: backOut }}
												>
													<Check size={11} strokeWidth={3} class="group-hover:hidden" />
													<Minus size={11} strokeWidth={3} class="hidden group-hover:block" />
												</span>
											{/if}
										</button>
									{/each}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<footer
				class="flex shrink-0 items-center justify-between gap-3 border-t border-base-300 px-5 py-3 sm:px-7"
				style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
			>
				<button
					type="button"
					class="btn btn-sm min-h-11 rounded-full sm:min-h-0 {confirmingReset
						? 'btn-error btn-soft'
						: 'btn-ghost'}"
					onclick={resetDock}
				>
					<RotateCcw size={14} />
					{confirmingReset ? 'Tap again to reset' : 'Reset to default'}
				</button>
				<button
					bind:this={doneButton}
					type="button"
					class="btn btn-primary btn-sm min-h-11 rounded-full px-5 sm:min-h-0"
					onclick={close}
				>
					Done
				</button>
			</footer>
		</div>

		{#if drag}
			{@const command = registry?.get(drag.source.id)}
			{@const Icon = drag.source.id === DIVIDER_ID ? SeparatorVertical : command?.icon}
			<div
				class="pointer-events-none fixed left-0 top-0 z-[100]"
				style="transform: translate3d({drag.x}px, {drag.y}px, 0);"
			>
				<div
					class="flex -translate-x-1/2 -translate-y-1/2 -rotate-3 items-center gap-2 whitespace-nowrap rounded-full border bg-base-100 px-3.5 py-2 text-sm font-medium shadow-2xl transition-colors duration-150
						{removing
						? 'border-error/50 text-error'
						: drag.over
							? 'border-primary/50 ring-4 ring-primary/15'
							: 'border-base-300'}"
					in:scale={{ start: 0.7, duration: 180 * motion, easing: backOut }}
					out:scale={ghostOut}
				>
					{#if removing}
						<Trash2 size={16} />
					{:else if Icon}
						<Icon size={16} />
					{/if}
					{nameOf(drag.source.id)}
					{#if removing}
						<span class="text-xs font-normal opacity-70">· release to remove</span>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Graph-paper grid, the same motif as the landing page and Question Studio. */
	.dock-stage {
		position: relative;
		isolation: isolate;
	}

	.dock-stage::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		border-radius: inherit;
		pointer-events: none;
		background:
			linear-gradient(
					to right,
					color-mix(in oklab, var(--color-base-content) 9%, transparent) 1px,
					transparent 1px
				)
				0 0 / 24px 24px,
			linear-gradient(
					to bottom,
					color-mix(in oklab, var(--color-base-content) 9%, transparent) 1px,
					transparent 1px
				)
				0 0 / 24px 24px;
		mask-image: radial-gradient(ellipse 90% 85% at 50% 45%, black 30%, transparent 100%);
		-webkit-mask-image: radial-gradient(ellipse 90% 85% at 50% 45%, black 30%, transparent 100%);
	}
</style>
