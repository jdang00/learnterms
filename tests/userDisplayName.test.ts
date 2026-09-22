import { describe, expect, test } from 'bun:test';
import { userDisplayName } from '../src/lib/userDisplayName';

describe('Clerk display names', () => {
	test('uses a full name when available', () => {
		expect(userDisplayName({ fullName: '  Jane Doe ', username: 'jane' })).toBe('Jane Doe');
	});

	test('supports accounts without a name', () => {
		expect(userDisplayName({ fullName: null, username: 'jane' })).toBe('jane');
		expect(
			userDisplayName({
				fullName: ' ',
				primaryEmailAddressId: 'primary',
				emailAddresses: [
					{ id: 'other', emailAddress: 'other@example.com' },
					{ id: 'primary', emailAddress: 'jane@example.com' }
				]
			})
		).toBe('jane@example.com');
		expect(userDisplayName({})).toBe('LearnTerms User');
	});
});
