import { expect, test } from 'bun:test';
import {
	ariaShortcutFor,
	matchShortcut,
	optionIndexForKey,
	shouldIgnoreShortcut,
	type ShortcutGuardEvent
} from '../src/lib/components/quiz-dock/shortcuts';

const key = (k: string, extra: Partial<KeyboardEvent> = {}) =>
	({ key: k, shiftKey: false, repeat: false, ...extra }) as KeyboardEvent;

function guardEvent(k: string, target: ShortcutGuardEvent['target'] = null, extra = {}) {
	return {
		key: k,
		shiftKey: false,
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		defaultPrevented: false,
		target,
		...extra
	} as ShortcutGuardEvent;
}

const element = (tagName: string, matches: string[] = []) => ({
	tagName,
	closest: (selector: string) => (matches.some((m) => selector.includes(m)) ? {} : null)
});

test('maps keys to commands, case-insensitively', () => {
	expect(matchShortcut(key('Enter'))?.command).toBe('check');
	expect(matchShortcut(key('Escape'))?.command).toBe('clear');
	expect(matchShortcut(key('Tab'))?.command).toBe('reveal');
	expect(matchShortcut(key('ArrowRight'))?.command).toBe('next');
	expect(matchShortcut(key('H'))?.command).toBe('highlight');
	expect(matchShortcut(key('f'))?.command).toBe('flag');
});

test('shuffle requires shift', () => {
	expect(matchShortcut(key('s'))).toBeNull();
	expect(matchShortcut(key('S', { shiftKey: true }))?.command).toBe('shuffle');
});

test('key repeat only passes for navigation', () => {
	expect(matchShortcut(key('ArrowLeft', { repeat: true }))?.command).toBe('previous');
	expect(matchShortcut(key('h', { repeat: true }))).toBeNull();
	expect(matchShortcut(key('Enter', { repeat: true }))).toBeNull();
});

test('number keys map to option indexes with 0 as the tenth', () => {
	expect(optionIndexForKey('1')).toBe(0);
	expect(optionIndexForKey('9')).toBe(8);
	expect(optionIndexForKey('0')).toBe(9);
	expect(optionIndexForKey('a')).toBeNull();
});

test('ignores modifier chords, dialogs, and editable regions', () => {
	const enter = matchShortcut(key('Enter'));
	expect(shouldIgnoreShortcut(guardEvent('Enter', null, { metaKey: true }), enter)).toBe(true);
	expect(shouldIgnoreShortcut(guardEvent('Enter', element('DIV', ['dialog'])), enter)).toBe(true);
	expect(
		shouldIgnoreShortcut(guardEvent('Enter', element('DIV', ['contenteditable'])), enter)
	).toBe(true);
	expect(shouldIgnoreShortcut(guardEvent('Enter', element('DIV')), enter)).toBe(false);
});

test('lets focused buttons handle their own activation keys', () => {
	const enter = matchShortcut(key('Enter'));
	expect(shouldIgnoreShortcut(guardEvent('Enter', element('BUTTON', ['button'])), enter)).toBe(
		true
	);
	const flag = matchShortcut(key('f'));
	expect(shouldIgnoreShortcut(guardEvent('f', element('BUTTON', ['button'])), flag)).toBe(false);
});

test('text inputs only receive navigation and reveal shortcuts', () => {
	const input = element('INPUT');
	expect(shouldIgnoreShortcut(guardEvent('f', input), matchShortcut(key('f')))).toBe(true);
	expect(shouldIgnoreShortcut(guardEvent('1', input), null)).toBe(true);
	expect(shouldIgnoreShortcut(guardEvent('Tab', input), matchShortcut(key('Tab')))).toBe(false);
	expect(
		shouldIgnoreShortcut(guardEvent('ArrowRight', input), matchShortcut(key('ArrowRight')))
	).toBe(false);
	expect(
		shouldIgnoreShortcut(
			guardEvent('ArrowRight', input, { shiftKey: true }),
			matchShortcut(key('ArrowRight'))
		)
	).toBe(true);
});

test('produces valid aria-keyshortcuts values', () => {
	expect(ariaShortcutFor('shuffle')).toBe('Shift+S');
	expect(ariaShortcutFor('next')).toBe('ArrowRight');
	expect(ariaShortcutFor('attachments')).toBeUndefined();
});
