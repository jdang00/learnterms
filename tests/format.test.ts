import { expect, test } from 'bun:test';
import { formatBytes, formatClock } from '../src/lib/utils/format';

test('formatBytes picks a readable unit and falls back for missing sizes', () => {
	expect(formatBytes(undefined)).toBe('-');
	expect(formatBytes(0, 'Unknown size')).toBe('Unknown size');
	expect(formatBytes(512)).toBe('512 B');
	expect(formatBytes(532_000)).toBe('520 KB');
	expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
});

test('formatClock shows m:ss, switching to h:mm:ss past an hour', () => {
	expect(formatClock(0)).toBe('0:00');
	expect(formatClock(-5)).toBe('0:00');
	expect(formatClock(65_400)).toBe('1:05');
	expect(formatClock(3_725_000)).toBe('1:02:05');
});
