import { expect, test } from 'bun:test';
import {
	cloneDock,
	DEFAULT_DOCK,
	DIVIDER_ID,
	displayFor,
	DOCK_PRESETS,
	dockHas,
	dockItem,
	insertIntoDock,
	matchPreset,
	quickAddIndex,
	removeFromDock,
	removeTool,
	sanitizeDock,
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
	const config: DockConfig = { items: [dockItem('check'), dockItem('flag')], overflow: ['reset'] };
	const moved = insertIntoDock(config, { zone: 'items', index: 0 }, 'reset');
	expect(ids(moved)).toEqual(['reset', 'check', 'flag']);
	expect(moved.overflow).toEqual([]);
	expect(dockHas(moved, 'reset')).toBe(true);
});

test('dividers never land in the overflow menu', () => {
	const config: DockConfig = { items: [], overflow: [] };
	expect(insertIntoDock(config, { zone: 'overflow', index: 0 }, DIVIDER_ID)).toBe(config);
});

test('remove then insert reorders within a zone', () => {
	const config: DockConfig = {
		items: [dockItem('a'), dockItem('b'), dockItem('c')],
		overflow: []
	};
	const next = insertIntoDock(removeFromDock(config, 'items', 0), { zone: 'items', index: 2 }, 'a');
	expect(ids(next)).toEqual(['b', 'c', 'a']);
});

test('removeTool clears a tool from either zone', () => {
	const config: DockConfig = { items: [dockItem('a')], overflow: ['b'] };
	expect(dockHas(removeTool(config, 'b'), 'b')).toBe(false);
	expect(dockHas(removeTool(config, 'a'), 'a')).toBe(false);
});

test('quick-added tools land before the navigation cluster', () => {
	const config: DockConfig = {
		items: [dockItem('check'), dockItem(DIVIDER_ID), dockItem('previous'), dockItem('next')],
		overflow: []
	};
	expect(quickAddIndex(config)).toBe(1);
	expect(quickAddIndex({ items: [dockItem('check')], overflow: [] })).toBe(1);
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
