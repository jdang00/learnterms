import { expect, test } from 'bun:test';
import {
	cloneDock,
	DEFAULT_DOCK,
	DIVIDER_ID,
	displayFor,
	DOCK_PRESETS,
	dockHas,
	DEFAULT_TOOLS,
	dockItem,
	insertIntoDock,
	matchPreset,
	quickAddIndex,
	removeFromDock,
	removeTool,
	sanitizeDock,
	toStoredDock,
	withTools,
	zoneOf,
	type DockConfig
} from '../src/lib/components/quiz-dock/layouts';

const ids = (config: DockConfig) => config.items.map((item) => item.id);

test('sanitize falls back to the default dock on malformed data', () => {
	expect(ids(sanitizeDock(null))).toEqual(ids(DEFAULT_DOCK));
	expect(ids(sanitizeDock({ items: 'nope' }))).toEqual(ids(DEFAULT_DOCK));
});

test('sanitize dedupes commands across zones but keeps multiple dividers', () => {
	const config = sanitizeDock({
		items: [
			{ id: 'check', display: 'label' },
			{ id: DIVIDER_ID },
			{ id: 'check' },
			{ id: DIVIDER_ID },
			{ id: 'flag', display: 'bogus' }
		],
		overflow: ['flag', 'reset', DIVIDER_ID, 'reset']
	});
	expect(ids(config)).toEqual(['check', DIVIDER_ID, DIVIDER_ID, 'flag']);
	expect(config.items[3].display).toBe('icon');
	expect(config.overflow).toEqual(['reset']);
	expect(new Set(config.items.map((item) => item.key)).size).toBe(config.items.length);
});

test('inserting an existing command moves it instead of duplicating', () => {
	const config: DockConfig = {
		items: [dockItem('check'), dockItem('flag')],
		overflow: ['reset'],
		tools: []
	};
	const moved = insertIntoDock(config, { zone: 'items', index: 0 }, 'reset');
	expect(ids(moved)).toEqual(['reset', 'check', 'flag']);
	expect(moved.overflow).toEqual([]);
	expect(dockHas(moved, 'reset')).toBe(true);
});

test('dividers never land in the overflow menu', () => {
	const config: DockConfig = { items: [], overflow: [], tools: [] };
	expect(insertIntoDock(config, { zone: 'overflow', index: 0 }, DIVIDER_ID)).toBe(config);
});

test('remove then insert reorders within a zone', () => {
	const config: DockConfig = {
		items: [dockItem('a'), dockItem('b'), dockItem('c')],
		overflow: [],
		tools: []
	};
	const next = insertIntoDock(removeFromDock(config, 'items', 0), { zone: 'items', index: 2 }, 'a');
	expect(ids(next)).toEqual(['b', 'c', 'a']);
});

test('removeTool clears a tool from either zone', () => {
	const config: DockConfig = { items: [dockItem('a')], overflow: ['b'], tools: [] };
	expect(dockHas(removeTool(config, 'b'), 'b')).toBe(false);
	expect(dockHas(removeTool(config, 'a'), 'a')).toBe(false);
});

test('quick-added tools land before the navigation cluster', () => {
	const config: DockConfig = {
		items: [dockItem('check'), dockItem(DIVIDER_ID), dockItem('previous'), dockItem('next')],
		overflow: [],
		tools: []
	};
	expect(quickAddIndex(config)).toBe(1);
	expect(quickAddIndex({ items: [dockItem('check')], overflow: [], tools: [] })).toBe(1);
});

test('presets are recognised, and any edit becomes a custom layout', () => {
	for (const preset of DOCK_PRESETS) expect(matchPreset(cloneDock(preset.config))).toBe(preset.id);
	expect(matchPreset(DEFAULT_DOCK)).toBe('classic');
	expect(matchPreset(removeTool(DEFAULT_DOCK, 'flag'))).toBeNull();
});

test('phones keep text only on the primary action', () => {
	expect(displayFor('check', 'both', 'mobile')).toBe('label');
	expect(displayFor('shuffle', 'both', 'mobile')).toBe('icon');
	expect(displayFor('clear', 'label', 'mobile')).toBe('icon');
	expect(displayFor('shuffle', 'both', 'desktop')).toBe('both');
});

test('the default dock leaves highlight and streak to the tools bar', () => {
	expect(ids(DEFAULT_DOCK)).not.toContain('highlight');
	expect(DEFAULT_DOCK.tools).toEqual(DEFAULT_TOOLS);
	expect(DEFAULT_TOOLS).toEqual(['highlight', 'calculator', 'notes', 'streak']);
});

test('layouts saved before the tools bar move default tools out of the dock', () => {
	const config = sanitizeDock({
		items: [{ id: 'check', display: 'label' }, { id: 'highlight' }, { id: 'streak' }],
		overflow: ['highlight', 'reset']
	});
	expect(ids(config)).toEqual(['check']);
	expect(config.overflow).toEqual(['reset']);
	expect(config.tools).toEqual(['highlight', 'calculator', 'notes', 'streak']);
});

test('saved tools win over dock copies, and an empty tools bar stays empty', () => {
	const config = sanitizeDock({
		items: [{ id: 'check' }, { id: 'timer' }],
		overflow: [],
		tools: ['timer', 'timer', DIVIDER_ID]
	});
	expect(ids(config)).toEqual(['check']);
	expect(config.tools).toEqual(['timer']);
	expect(sanitizeDock({ items: [{ id: 'highlight' }], overflow: [], tools: [] }).tools).toEqual([]);
	expect(toStoredDock(config).tools).toEqual(['timer']);
});

test('tools move between the tools bar and the dock without duplicating', () => {
	const config: DockConfig = { items: [dockItem('check')], overflow: [], tools: ['highlight'] };
	const docked = insertIntoDock(config, { zone: 'items', index: 1 }, 'highlight');
	expect(ids(docked)).toEqual(['check', 'highlight']);
	expect(docked.tools).toEqual([]);
	expect(zoneOf(docked, 'highlight')).toBe('items');
	const back = insertIntoDock(docked, { zone: 'tools', index: 0 }, 'highlight');
	expect(zoneOf(back, 'highlight')).toBe('tools');
	expect(insertIntoDock(back, { zone: 'tools', index: 0 }, DIVIDER_ID)).toBe(back);
	expect(dockHas(removeTool(back, 'highlight'), 'highlight')).toBe(false);
});

test('presets swap the dock but keep your tools bar', () => {
	const power = DOCK_PRESETS.find((preset) => preset.id === 'power')!.config;
	const next = withTools(power, ['timer']);
	expect(next.tools).toEqual(['timer']);
	expect(next.overflow).not.toContain('timer');
	expect(matchPreset(next)).toBe('power');
	expect(matchPreset({ ...cloneDock(DEFAULT_DOCK), tools: ['timer'] })).toBe('classic');
});
