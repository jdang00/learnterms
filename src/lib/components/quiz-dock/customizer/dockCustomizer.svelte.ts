import SeparatorVertical from '@lucide/svelte/icons/separator-vertical';
import type { getQuizCommands } from '../commands.svelte';
import type { getDockPreferences } from '../dockPreferences.svelte';
import { isPassive, TONE_BADGE } from '../dockStyles';
import { shortcutLabelFor } from '../shortcuts';
import {
	DEFAULT_DOCK,
	DIVIDER_ID,
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
	type DockConfig,
	type DockDisplay,
	type DockDrop,
	type DockSurface,
	type DockZone
} from '../layouts';
import type { CommandScope, QuizCommand } from '../types';
import { MOTION, QUICK_TOOLS, SECTIONS } from './constants';

export type PaletteEntry = {
	id: string;
	name: string;
	description: string;
	icon: QuizCommand['icon'];
	badge: string;
	shortcut?: string;
};

export type DragSource =
	| { from: 'palette'; id: string }
	| { from: DockZone; id: string; index: number; display: DockDisplay };

export type Drag = { source: DragSource; x: number; y: number; over: DockDrop | null };

export type ViewEntry<T> = { kind: 'chip'; value: T; index: number } | { kind: 'placeholder' };

export const ZONE_NAMES: Record<DockZone, string> = {
	items: 'dock',
	overflow: 'menu',
	tools: 'tools'
};

const DIVIDER_ENTRY: PaletteEntry = {
	id: DIVIDER_ID,
	name: 'Divider',
	description: 'Group tools into clusters',
	icon: SeparatorVertical,
	badge: TONE_BADGE.neutral
};

// Keys of dock items a typical phone moves into More to keep its one row.
const PHONE_PREVIEW_WIDTH = 375;

type Registry = ReturnType<typeof getQuizCommands>;
type Preferences = ReturnType<typeof getDockPreferences>;

/** Selection, drag-and-drop and derived views for the dock customizer sheet. */
export class DockCustomizerState {
	preview = $state<DockSurface>('desktop');
	selected = $state<{ zone: DockZone; key: string } | null>(null);
	drag = $state<Drag | null>(null);
	ghostOut = $state({ start: 0.6, duration: 180 * MOTION });
	itemsZone = $state<HTMLElement | null>(null);
	overflowZone = $state<HTMLElement | null>(null);
	toolsZone = $state<HTMLElement | null>(null);
	moreOpen = $state(false);
	confirmingReset = $state(false);

	private suppressClick = false;
	private pending: {
		source: DragSource;
		startX: number;
		startY: number;
		pointerType: string;
		immediate: boolean;
		timer: ReturnType<typeof setTimeout> | null;
	} | null = null;

	private readonly registry: Registry;
	private readonly preferences: Preferences;

	constructor(registry: Registry, preferences: Preferences) {
		this.registry = registry;
		this.preferences = preferences;
	}

	// Closures here: the registry and preferences are assigned in the constructor, after field initializers.
	open = $derived.by(() => this.preferences?.customizing ?? false);
	config = $derived.by<DockConfig>(() => this.preferences?.layout ?? DEFAULT_DOCK);
	advanced = $derived.by(() => this.preferences?.advanced ?? false);

	command(id: string) {
		return this.registry?.get(id);
	}

	private entryFor(command: QuizCommand): PaletteEntry {
		return {
			id: command.id,
			name: command.name,
			description: command.description,
			icon: command.icon,
			badge: TONE_BADGE[command.tone],
			shortcut: shortcutLabelFor(command.id)
		};
	}

	available = $derived.by(() =>
		Object.values(this.registry?.commands ?? {}).filter(
			(command) => command.available?.() !== false
		)
	);

	palette = $derived.by(() => {
		let offset = 0;
		return SECTIONS.map(({ scope, title }: { scope: CommandScope | 'layout'; title: string }) => {
			const entries =
				scope === 'layout'
					? [DIVIDER_ENTRY]
					: this.available
							.filter((command) => command.scope === scope)
							.map((command) => this.entryFor(command));
			const section = { title, entries, offset };
			offset += entries.length;
			return section;
		}).filter((section) => section.entries.length > 0);
	});

	quickTools = $derived(
		QUICK_TOOLS.map((id) => this.registry?.get(id)).filter(
			(command): command is QuizCommand => Boolean(command) && command!.available?.() !== false
		)
	);

	activePreset = $derived(matchPreset(this.config));

	commit(next: DockConfig) {
		this.preferences?.set(next);
	}

	applyPreset(presetConfig: DockConfig) {
		this.selected = null;
		const next = withTools(presetConfig, this.config.tools);
		if (sameDock(next, DEFAULT_DOCK)) this.preferences?.reset();
		else this.commit(next);
	}

	private addToHome(id: string, itemsIndex: number) {
		const zone = homeZoneFor(id);
		this.commit(
			insertIntoDock(
				this.config,
				{ zone, index: zone === 'items' ? itemsIndex : this.config[zone].length },
				id,
				this.registry?.get(id)?.defaultDisplay ?? 'icon'
			)
		);
	}

	toggleQuickTool(id: string) {
		if (dockHas(this.config, id)) {
			this.commit(removeTool(this.config, id));
			if (this.selection?.id === id) this.selected = null;
			return;
		}
		this.addToHome(id, quickAddIndex(this.config));
	}

	acceptsOverflow(id: string) {
		return id !== DIVIDER_ID && !isPassive(this.registry?.get(id));
	}

	accepts(zone: DockZone, id: string) {
		if (zone === 'overflow') return this.acceptsOverflow(id);
		if (zone === 'tools') return id !== DIVIDER_ID;
		return true;
	}

	nameOf(id: string) {
		return id === DIVIDER_ID ? 'Divider' : (this.registry?.get(id)?.name ?? id);
	}

	// ── selection ────────────────────────────────────────────────────────────
	selection = $derived.by(() => {
		const selected = this.selected;
		if (!selected) return null;
		if (selected.zone === 'items') {
			const index = this.config.items.findIndex((item) => item.key === selected.key);
			if (index === -1) return null;
			const item = this.config.items[index];
			return { zone: 'items' as const, index, id: item.id, display: item.display };
		}
		const zone = selected.zone;
		const index = this.config[zone].indexOf(selected.key);
		if (index === -1) return null;
		return { zone, index, id: selected.key, display: 'icon' as DockDisplay };
	});

	toggleSelected(zone: DockZone, key: string) {
		if (this.suppressClick) return;
		this.selected =
			this.selected?.key === key && this.selected.zone === zone ? null : { zone, key };
	}

	setDisplay(display: DockDisplay) {
		const selection = this.selection;
		if (selection?.zone !== 'items') return;
		this.commit({
			...this.config,
			items: this.config.items.map((item, i) =>
				i === selection.index ? { ...item, display } : item
			)
		});
	}

	moveSelected(delta: number) {
		const selection = this.selection;
		if (!selection) return;
		const target = selection.index + delta;
		const list =
			selection.zone === 'items' ? [...this.config.items] : [...this.config[selection.zone]];
		if (target < 0 || target >= list.length) return;
		[list[selection.index], list[target]] = [list[target], list[selection.index]];
		this.commit({ ...this.config, [selection.zone]: list });
	}

	moveToZone(zone: DockZone) {
		const selection = this.selection;
		if (!selection || zone === selection.zone || !this.accepts(zone, selection.id)) return;
		if (zone === 'overflow') this.moreOpen = true;
		const without = removeFromDock(this.config, selection.zone, selection.index);
		const next = insertIntoDock(
			without,
			{ zone, index: zone === 'items' ? quickAddIndex(without) : without[zone].length },
			selection.id,
			this.registry?.get(selection.id)?.defaultDisplay ?? 'icon'
		);
		this.commit(next);
		const key = zone === 'items' ? next.items.find((i) => i.id === selection.id)?.key : null;
		this.selected = { zone, key: key ?? selection.id };
	}

	removeSelected() {
		const selection = this.selection;
		if (!selection) return;
		this.commit(removeFromDock(this.config, selection.zone, selection.index));
		this.selected = null;
	}

	handleChipKeydown(event: KeyboardEvent, zone: DockZone, key: string) {
		if (this.selected?.key !== key || this.selected.zone !== zone) return;
		if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') this.moveSelected(-1);
		else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') this.moveSelected(1);
		else if (event.key === 'Delete' || event.key === 'Backspace') this.removeSelected();
		else return;
		event.preventDefault();
	}

	togglePaletteEntry(id: string) {
		if (this.suppressClick) return;
		if (id !== DIVIDER_ID && dockHas(this.config, id)) {
			this.commit(removeTool(this.config, id));
			if (this.selection?.id === id) this.selected = null;
			return;
		}
		if (id === DIVIDER_ID) {
			this.commit(
				insertIntoDock(this.config, { zone: 'items', index: this.config.items.length }, id)
			);
			return;
		}
		this.addToHome(id, this.config.items.length);
	}

	toggleMore() {
		this.moreOpen = !this.moreOpen;
		if (!this.moreOpen && this.selected?.zone === 'overflow') this.selected = null;
	}

	// ── drag and drop ────────────────────────────────────────────────────────
	removing = $derived(
		this.drag !== null && this.drag.source.from !== 'palette' && this.drag.over === null
	);

	handlePointerDown(event: PointerEvent, source: DragSource, immediate: boolean) {
		if (event.button !== 0) return;
		this.pending = {
			source,
			startX: event.clientX,
			startY: event.clientY,
			pointerType: event.pointerType,
			immediate: immediate || event.pointerType !== 'touch',
			timer: null
		};
		if (!this.pending.immediate) {
			this.pending.timer = setTimeout(() => this.startDrag(event.clientX, event.clientY), 220);
		}
		window.addEventListener('pointermove', this.handlePointerMove);
		window.addEventListener('pointerup', this.handlePointerUp);
		window.addEventListener('pointercancel', this.cancelDrag);
		window.addEventListener('touchmove', this.blockScroll, { passive: false });
	}

	private startDrag(x: number, y: number) {
		if (!this.pending) return;
		this.drag = { source: this.pending.source, x, y, over: null };
		this.drag.over = this.hitTest(x, y);
		this.selected = null;
		if (this.pending.pointerType === 'touch') navigator.vibrate?.(8);
	}

	private handlePointerMove = (event: PointerEvent) => {
		if (this.drag) {
			this.drag.x = event.clientX;
			this.drag.y = event.clientY;
			this.drag.over = this.hitTest(event.clientX, event.clientY);
			return;
		}
		if (!this.pending) return;
		const distance = Math.hypot(
			event.clientX - this.pending.startX,
			event.clientY - this.pending.startY
		);
		if (this.pending.immediate && distance > 4) this.startDrag(event.clientX, event.clientY);
		else if (!this.pending.immediate && distance > 10) this.cancelDrag();
	};

	private handlePointerUp = () => {
		if (this.drag) {
			const { source, over } = this.drag;
			let next = this.config;
			if (source.from !== 'palette') next = removeFromDock(next, source.from, source.index);
			if (over) {
				const display =
					source.from === 'items'
						? source.display
						: (this.registry?.get(source.id)?.defaultDisplay ?? 'icon');
				next = insertIntoDock(next, over, source.id, display);
			}
			this.ghostOut = { start: over ? 1 : 0.4, duration: over ? 0 : 200 * MOTION };
			if (next !== this.config) this.commit(next);
			this.suppressClick = true;
			setTimeout(() => (this.suppressClick = false), 0);
		}
		this.cancelDrag();
	};

	cancelDrag = () => {
		if (this.pending?.timer) clearTimeout(this.pending.timer);
		this.pending = null;
		this.drag = null;
		window.removeEventListener('pointermove', this.handlePointerMove);
		window.removeEventListener('pointerup', this.handlePointerUp);
		window.removeEventListener('pointercancel', this.cancelDrag);
		window.removeEventListener('touchmove', this.blockScroll);
	};

	private blockScroll = (event: TouchEvent) => {
		if (this.drag) event.preventDefault();
	};

	private hitTest(x: number, y: number): DockDrop | null {
		const id = this.drag?.source.id ?? this.pending?.source.id;
		for (const [zone, element] of [
			['tools', this.toolsZone],
			['items', this.itemsZone],
			['overflow', this.overflowZone]
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
			if (id && !this.accepts(zone, id)) return null;
			// The collapsed More menu still takes drops; they land at the end.
			if (zone === 'overflow' && !this.moreOpen)
				return { zone, index: this.config.overflow.length };
			return { zone, index: this.indexAt(element, x, y) };
		}
		return null;
	}

	private indexAt(zone: HTMLElement, x: number, y: number) {
		const chips = zone.querySelectorAll<HTMLElement>('[data-chip]');
		for (let i = 0; i < chips.length; i++) {
			const rect = chips[i].getBoundingClientRect();
			if (y < rect.top) return i;
			if (y <= rect.bottom && x < rect.left + rect.width / 2) return i;
		}
		return chips.length;
	}

	private withPlaceholder<T>(list: T[], zone: DockZone): ViewEntry<T>[] {
		let view: ViewEntry<T>[] = list.map((value, index) => ({ kind: 'chip', value, index }));
		const drag = this.drag;
		if (drag && drag.source.from === zone) {
			const hidden = drag.source.index;
			view = view.filter((entry) => entry.kind !== 'chip' || entry.index !== hidden);
		}
		if (drag?.over?.zone === zone) view.splice(drag.over.index, 0, { kind: 'placeholder' });
		return view;
	}

	itemsView = $derived(this.withPlaceholder(this.config.items, 'items'));
	overflowView = $derived(this.withPlaceholder(this.config.overflow, 'overflow'));
	toolsView = $derived(this.withPlaceholder(this.config.tools, 'tools'));
	itemIds = $derived(this.config.items.map((item) => item.id));

	foldedOnPhone = $derived.by(() => {
		if (this.preview !== 'mobile') return [] as string[];
		const middle = this.config.items.filter(
			(item) => item.id !== DIVIDER_ID && item.id !== 'previous' && item.id !== 'next'
		);
		const navButtons = this.config.items.filter(
			(item) => item.id === 'previous' || item.id === 'next'
		).length;
		const fit = phoneRowFit(
			middle.map((item) => ({ id: item.id, passive: isPassive(this.registry?.get(item.id)) })),
			PHONE_PREVIEW_WIDTH,
			navButtons
		);
		return middle.filter((_, index) => !fit.has(index)).map((item) => item.key);
	});

	foldedNames = $derived(
		this.config.items
			.filter((item) => this.foldedOnPhone.includes(item.key))
			.map((item) => this.nameOf(item.id))
	);

	// ── chrome ───────────────────────────────────────────────────────────────
	/** Runs when the sheet opens: clears transient state and picks the preview for this screen. */
	opened() {
		this.selected = null;
		this.confirmingReset = false;
		this.moreOpen = false;
		this.preview = window.matchMedia('(min-width: 768px)').matches ? 'desktop' : 'mobile';
	}

	resetDock() {
		if (!this.confirmingReset) {
			this.confirmingReset = true;
			return;
		}
		this.preferences?.reset();
		this.selected = null;
		this.confirmingReset = false;
	}

	close() {
		this.cancelDrag();
		this.preferences?.close();
	}

	// Escape backs out one step at a time: a drag, then a selection, then the customizer.
	handleEscape(event: KeyboardEvent) {
		if (this.drag) this.cancelDrag();
		else if (this.selected) this.selected = null;
		else return;
		event.preventDefault();
	}
}
