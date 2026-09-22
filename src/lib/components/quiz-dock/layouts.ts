export type DockDisplay = 'icon' | 'label' | 'both';
// One layout, rendered two ways: a floating pill on desktop and an edge bar on mobile.
export type DockSurface = 'desktop' | 'mobile';
export type DockZone = 'items' | 'overflow';

export type DockItem = { key: string; id: string; display: DockDisplay };
export type DockConfig = { items: DockItem[]; overflow: string[] };
export type StoredDock = { items: { id: string; display: DockDisplay }[]; overflow: string[] };

export const DIVIDER_ID = 'divider';
const DISPLAYS: DockDisplay[] = ['icon', 'label', 'both'];

let dividerSeq = 0;
function keyFor(id: string) {
	return id === DIVIDER_ID ? `${DIVIDER_ID}-${++dividerSeq}` : id;
}

export function dockItem(id: string, display: DockDisplay = 'icon'): DockItem {
	return { key: keyFor(id), id, display };
}

const layout = (items: [string, DockDisplay?][], overflow: string[]): DockConfig => ({
	items: items.map(([id, display]) => dockItem(id, display ?? 'icon')),
	overflow
});

// Classic: the original LearnTerms bar, unchanged. Most people never customize, so this is the default.
export const DEFAULT_DOCK: DockConfig = layout(
	[
		['clear', 'label'],
		['check', 'label'],
		['flag'],
		['shuffle', 'both'],
		['highlight'],
		[DIVIDER_ID],
		['previous'],
		['next']
	],
	[]
);

export type DockPreset = { id: string; name: string; description: string; config: DockConfig };

export const DOCK_PRESETS: DockPreset[] = [
	{
		id: 'essentials',
		name: 'Essentials',
		description: 'Check, flag, and go',
		config: layout(
			[['check', 'label'], ['flag'], [DIVIDER_ID], ['previous'], ['next']],
			['clear', 'reveal', 'highlight', 'shuffle', 'reset', 'settings']
		)
	},
	{
		id: 'classic',
		name: 'Classic',
		description: 'The familiar LearnTerms dock',
		config: DEFAULT_DOCK
	},
	{
		id: 'power',
		name: 'Power',
		description: 'Every tool within reach',
		config: layout(
			[
				['progress'],
				['clear', 'label'],
				['check', 'label'],
				['flag'],
				['reveal'],
				['highlight'],
				['attachments'],
				['rationale'],
				[DIVIDER_ID],
				['previous'],
				['next'],
				['nextUnanswered']
			],
			[
				'nextFlagged',
				'timer',
				'textSize',
				'shuffle',
				'shuffleOptions',
				'autoNext',
				'filterFlagged',
				'filterIncomplete',
				'focus',
				'edit',
				'reset',
				'settings'
			]
		)
	}
];

export function cloneDock(config: DockConfig): DockConfig {
	return {
		items: config.items.map((item) => dockItem(item.id, item.display)),
		overflow: [...config.overflow]
	};
}

export function toStoredDock(config: DockConfig): StoredDock {
	return {
		items: config.items.map(({ id, display }) => ({ id, display })),
		overflow: [...config.overflow]
	};
}

export function sameDock(a: DockConfig, b: DockConfig): boolean {
	return JSON.stringify(toStoredDock(a)) === JSON.stringify(toStoredDock(b));
}

export function matchPreset(config: DockConfig): string | null {
	return DOCK_PRESETS.find((preset) => sameDock(preset.config, config))?.id ?? null;
}

export function dockHas(config: DockConfig, id: string): boolean {
	return config.overflow.includes(id) || config.items.some((item) => item.id === id);
}

// Phones keep the same tools in the same order, but only the primary action keeps its text.
export function displayFor(id: string, display: DockDisplay, surface: DockSurface): DockDisplay {
	if (surface === 'desktop') return display;
	if (id === 'check') return display === 'icon' ? 'icon' : 'label';
	return 'icon';
}

export function sanitizeDock(raw: unknown, fallback: DockConfig = DEFAULT_DOCK): DockConfig {
	if (!raw || typeof raw !== 'object') return cloneDock(fallback);
	const value = raw as { items?: unknown; overflow?: unknown };
	if (!Array.isArray(value.items) || !Array.isArray(value.overflow)) return cloneDock(fallback);

	const seen = new Set<string>();
	const items: DockItem[] = [];
	for (const entry of value.items) {
		const id = (entry as { id?: unknown })?.id;
		if (typeof id !== 'string' || !id) continue;
		if (id !== DIVIDER_ID && seen.has(id)) continue;
		seen.add(id);
		const display = (entry as { display?: unknown }).display;
		items.push(
			dockItem(id, DISPLAYS.includes(display as DockDisplay) ? (display as DockDisplay) : 'icon')
		);
	}

	const overflow: string[] = [];
	for (const id of value.overflow) {
		if (typeof id !== 'string' || !id || id === DIVIDER_ID || seen.has(id)) continue;
		seen.add(id);
		overflow.push(id);
	}

	return { items, overflow };
}

export type DockDrop = { zone: DockZone; index: number };

export function removeFromDock(config: DockConfig, zone: DockZone, index: number): DockConfig {
	return zone === 'items'
		? { ...config, items: config.items.filter((_, i) => i !== index) }
		: { ...config, overflow: config.overflow.filter((_, i) => i !== index) };
}

export function removeTool(config: DockConfig, id: string): DockConfig {
	return {
		items: config.items.filter((item) => item.id !== id),
		overflow: config.overflow.filter((existing) => existing !== id)
	};
}

export function insertIntoDock(
	config: DockConfig,
	drop: DockDrop,
	id: string,
	display: DockDisplay = 'icon'
): DockConfig {
	const base = id === DIVIDER_ID ? config : removeTool(config, id);

	if (drop.zone === 'overflow') {
		if (id === DIVIDER_ID) return config;
		const overflow = [...base.overflow];
		overflow.splice(clamp(drop.index, overflow.length), 0, id);
		return { ...base, overflow };
	}

	const items = [...base.items];
	items.splice(clamp(drop.index, items.length), 0, dockItem(id, display));
	return { ...base, items };
}

// Where a quick-added tool lands: just before the navigation cluster, not after it.
export function quickAddIndex(config: DockConfig): number {
	const nav = config.items.findIndex((item) => item.id === 'previous' || item.id === 'next');
	if (nav === -1) return config.items.length;
	return config.items[nav - 1]?.id === DIVIDER_ID ? nav - 1 : nav;
}

function clamp(index: number, length: number) {
	return Math.max(0, Math.min(index, length));
}
