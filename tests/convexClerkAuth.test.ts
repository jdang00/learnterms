import { expect, test } from 'bun:test';
import { syncConvexClerkAuth } from '../src/lib/convexClerkAuth';

type TokenFetcher = Parameters<Parameters<typeof syncConvexClerkAuth>[0]['setAuth']>[0];

function fakeClient() {
	let fetchToken: TokenFetcher | undefined;
	let configured = 0;
	return {
		setAuth(fetcher: TokenFetcher) {
			fetchToken = fetcher;
			configured += 1;
		},
		get fetchToken() {
			return fetchToken;
		},
		get configured() {
			return configured;
		}
	};
}

test('authenticates after Clerk loads later than the initial page render', async () => {
	const client = fakeClient();
	const session = {
		id: 'session_1',
		getToken: async ({ skipCache }: { template: string; skipCache: boolean }) =>
			skipCache ? 'fresh-token' : 'cached-token'
	};
	syncConvexClerkAuth(
		client,
		{ isLoaded: false, userId: undefined, sessionId: undefined, initialToken: null },
		() => undefined
	);
	expect(client.configured).toBe(0);

	syncConvexClerkAuth(
		client,
		{ isLoaded: true, userId: 'user_1', sessionId: 'session_1', initialToken: null },
		() => session
	);
	expect(await client.fetchToken?.({ forceRefreshToken: false })).toBe('cached-token');
	expect(await client.fetchToken?.({ forceRefreshToken: true })).toBe('fresh-token');
});

test('uses an SSR token while Clerk loads and clears auth after sign-out', async () => {
	const client = fakeClient();
	syncConvexClerkAuth(
		client,
		{ isLoaded: false, userId: 'user_1', sessionId: undefined, initialToken: 'server-token' },
		() => undefined
	);
	expect(await client.fetchToken?.({ forceRefreshToken: false })).toBe('server-token');

	syncConvexClerkAuth(
		client,
		{ isLoaded: true, userId: null, sessionId: null, initialToken: 'server-token' },
		() => null
	);
	expect(await client.fetchToken?.({ forceRefreshToken: false })).toBeNull();
});

test('does not use a token from a different Clerk session', async () => {
	const client = fakeClient();
	syncConvexClerkAuth(
		client,
		{ isLoaded: true, userId: 'user_1', sessionId: 'session_1', initialToken: null },
		() => ({ id: 'session_2', getToken: async () => 'wrong-token' })
	);
	expect(await client.fetchToken?.({ forceRefreshToken: false })).toBeNull();
});

test('a failed Clerk token request resolves without breaking Convex auth setup', async () => {
	const client = fakeClient();
	const originalError = console.error;
	console.error = () => {};
	try {
		syncConvexClerkAuth(
			client,
			{ isLoaded: true, userId: 'user_1', sessionId: 'session_1', initialToken: null },
			() => ({
				id: 'session_1',
				getToken: async () => {
					throw new Error('temporary Clerk failure');
				}
			})
		);
		expect(await client.fetchToken?.({ forceRefreshToken: false })).toBeNull();
	} finally {
		console.error = originalError;
	}
});
