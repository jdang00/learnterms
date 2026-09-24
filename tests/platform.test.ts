import { expect, test } from 'bun:test';
import { isApplePlatform, modifierKeyLabel } from '../src/lib/utils/platform';

test('modifierKeyLabel shows ⌘ on Apple platforms and Ctrl elsewhere', () => {
	expect(modifierKeyLabel('macOS')).toBe('⌘');
	expect(modifierKeyLabel('MacIntel')).toBe('⌘');
	expect(modifierKeyLabel('iPad')).toBe('⌘');
	expect(modifierKeyLabel('Windows')).toBe('Ctrl');
	expect(modifierKeyLabel('Win32')).toBe('Ctrl');
	expect(modifierKeyLabel('Linux x86_64')).toBe('Ctrl');
	expect(isApplePlatform('')).toBe(false);
});
