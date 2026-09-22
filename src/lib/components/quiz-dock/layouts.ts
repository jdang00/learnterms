export type DockDisplay = 'icon' | 'label' | 'both';
// One layout, rendered two ways: a floating pill on desktop and an edge bar on mobile.
export type DockSurface = 'desktop' | 'mobile';
// tools: the Exam tools bar beside the question, for instruments rather than answer actions.
export type DockZone = 'items' | 'overflow' | 'tools';

export type DockItem = { key: string; id: string; display: DockDisplay };
export type DockConfig = { items: DockItem[]; overflow: string[]; tools: string[] };
export type StoredDock = {
	items: { id: string; display: DockDisplay }[];
	overflow: string[];
	tools?: string[];
};

export const DIVIDER_ID = 'divider';
const DISPLAYS: DockDisplay[] = ['icon', 'label', 'both'];

let dividerSeq = 0;
function keyFor(id: string) {
	return id === DIVIDER_ID ? `${DIVIDER_ID}-${++dividerSeq}` : id;
}

export function dockItem(id: string, display: DockDisplay = 'icon'): DockItem {
	return { key: keyFor(id), id, display };
}

export const DEFAULT_TOOLS = ['highlight', 'calculator', 'notes', 'streak'];

const layout = (items: [string, DockDisplay?][], overflow: string[]): DockConfig => ({
	items: items.map(([id, display]) => dockItem(id, display ?? 'icon')),
	overflow,
	tools: [...DEFAULT_TOOLS]
});

// Classic: the original LearnTerms bar, minus Highlight, which now lives in the tools bar.
// Most people never customize, so this is the default.
export const DEFAULT_DOCK: DockConfig = layout(
	[
		['clear', 'label'],
		['check', 'label'],
		['flag'],
		['shuffle', 'both'],
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
			['clear', 'reveal', 'shuffle', 'reset', 'settings']
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
		overflow: [...config.overflow],
		tools: [...config.tools]
	};
}

export function toStoredDock(config: DockConfig): StoredDock {
	return {
		items: config.items.map(({ id, display }) => ({ id, display })),
		overflow: [...config.overflow],
		tools: [...config.tools]
	};
}

export function sameDock(a: DockConfig, b: DockConfig): boolean {
	return JSON.stringify(toStoredDock(a)) === JSON.stringify(toStoredDock(b));
}

const barKey = (config: DockConfig) =>
	JSON.stringify([config.items.map(({ id, display }) => [id, display]), config.overflow]);

// Presets describe the dock only; the tools bar is chosen separately.
export function matchPreset(config: DockConfig): string | null {
	const key = barKey(config);
	return (
		DOCK_PRESETS.find((preset) => barKey(withTools(preset.config, config.tools)) === key)?.id ??
		null
	);
}

// A preset's dock with the user's own tools bar kept; tools win over the preset's copies.
export function withTools(config: DockConfig, tools: string[]): DockConfig {
	return {
		items: config.items
			.filter((item) => !tools.includes(item.id))
			.map((item) => dockItem(item.id, item.display)),
		overflow: config.overflow.filter((id) => !tools.includes(id)),
		tools: [...tools]
	};
}

export function dockHas(config: DockConfig, id: string): boolean {
	return zoneOf(config, id) !== null;
}

export function zoneOf(config: DockConfig, id: string): DockZone | null {
	if (config.tools.includes(id)) return 'tools';
	if (config.overflow.includes(id)) return 'overflow';
	if (config.items.some((item) => item.id === id)) return 'items';
	return null;
}

// Where a tool goes when switched on without a drop target.
export function homeZoneFor(id: string): DockZone {
	return DEFAULT_TOOLS.includes(id) ? 'tools' : 'items';
}

// Phones keep one row: Check stretched, More, and previous/next as the split pill on the right.
// Other tools stay on the row in layout order while they fit; the rest move into More.
// Returns the indexes of `middle` (everything except previous/next) that stay on the row.
export function phoneRowFit(
	middle: { id: string; passive: boolean }[],
	width: number,
	navButtons: number
): Set<number> {
	const hasCheck = middle.some((item) => item.id === 'check');
	let budget = width - 16 - navButtons * 50 - 48 - (hasCheck ? 112 : 0);
	const shown = new Set<number>();
	let folding = false;
	middle.forEach((item, index) => {
		if (item.id === 'check') {
			shown.add(index);
			return;
		}
		const cost = item.passive ? 80 : 48;
		if (!folding && budget >= cost) {
			shown.add(index);
			budget -= cost;
		} else folding = true;
	});
	return shown;
}

// Phones keep the same tools in the same order, but only the primary action keeps its text.
export function displayFor(id: string, display: DockDisplay, surface: DockSurface): DockDisplay {
	if (surface === 'desktop') return display;
	if (id === 'check') return display === 'icon' ? 'icon' : 'label';
	return 'icon';
}

export function sanitizeDock(raw: unknown, fallback: DockConfig = DEFAULT_DOCK): DockConfig {
	if (!raw || typeof raw !== 'object') return cloneDock(fallback);
	const value = raw as { items?: unknown; overflow?: unknown; tools?: unknown };
	if (!Array.isArray(value.items) || !Array.isArray(value.overflow)) return cloneDock(fallback);

	// Layouts saved before the tools bar existed get the default tools, pulled out of the dock.
	const legacy = !Array.isArray(value.tools);
	const rawTools: unknown[] = legacy ? DEFAULT_TOOLS : (value.tools as unknown[]);
	const tools: string[] = [];
	const seen = new Set<string>();
	for (const id of rawTools) {
		if (typeof id !== 'string' || !id || id === DIVIDER_ID || seen.has(id)) continue;
		seen.add(id);
		tools.push(id);
	}

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

	return { items, overflow, tools };
}

export type DockDrop = { zone: DockZone; index: number };

export function removeFromDock(config: DockConfig, zone: DockZone, index: number): DockConfig {
	if (zone === 'items') return { ...config, items: config.items.filter((_, i) => i !== index) };
	return { ...config, [zone]: config[zone].filter((_, i) => i !== index) };
}

export function removeTool(config: DockConfig, id: string): DockConfig {
	return {
		items: config.items.filter((item) => item.id !== id),
		overflow: config.overflow.filter((existing) => existing !== id),
		tools: config.tools.filter((existing) => existing !== id)
	};
}

export function insertIntoDock(
	config: DockConfig,
	drop: DockDrop,
	id: string,
	display: DockDisplay = 'icon'
): DockConfig {
	const base = id === DIVIDER_ID ? config : removeTool(config, id);

	if (drop.zone !== 'items') {
		if (id === DIVIDER_ID) return config;
		const list = [...base[drop.zone]];
		list.splice(clamp(drop.index, list.length), 0, id);
		return { ...base, [drop.zone]: list };
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
