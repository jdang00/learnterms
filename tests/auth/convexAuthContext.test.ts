import { beforeEach, expect, test, vi } from 'vitest';
import { render } from 'svelte/server';

const clerk = vi.hoisted(() => ({
	isLoaded: false,
	auth: { userId: null as string | null, sessionId: null as string | null },
	session: null
}));

vi.mock('svelte-clerk/client', () => ({ useClerkContext: () => clerk }));

import ConvexAuthHarness from './fixtures/ConvexAuthHarness.svelte';

beforeEach(() => {
	clerk.auth = { userId: null, sessionId: null };
});

test('components inside ConvexAuth can read the Convex auth state', () => {
	clerk.auth = { userId: 'user_test', sessionId: 'sess_test' };
	expect(render(ConvexAuthHarness).body).toContain('signed-in');
});

test('signed-out requests render as signed out', () => {
	expect(render(ConvexAuthHarness).body).toContain('signed-out');
});
