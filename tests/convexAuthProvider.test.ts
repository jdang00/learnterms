import { expect, test } from 'bun:test';
import { clerkConvexAuthProvider, type ClerkAuthSnapshot } from '../src/lib/convexAuthProvider';

const session = (id: string) => ({
	id,
	getToken: async ({ skipCache }: { template: string; skipCache: boolean }) =>
		skipCache ? 'fresh-token' : 'cached-token'
});

function clerkStub(initial: ClerkAuthSnapshot) {
	let snapshot = initial;
	let markLoaded = () => {};
	const loaded = new Promise<void>((resolve) => (markLoaded = resolve));
	return {
		provider: (initialToken: string | null = null) =>
			clerkConvexAuthProvider(() => snapshot, { initialToken, whenLoaded: () => loaded }),
		load(next: ClerkAuthSnapshot) {
			snapshot = next;
			markLoaded();
		}
	};
}

const loading: ClerkAuthSnapshot = {
	isLoaded: false,
	userId: 'user_1',
	sessionId: 'session_1',
	session: undefined
};
const signedIn: ClerkAuthSnapshot = { ...loading, isLoaded: true, session: session('session_1') };

test('reports Clerk loading and the server-rendered auth state before Clerk loads', () => {
	const clerk = clerkStub(loading);
	const state = clerk.provider()();
	expect(state.isLoading).toBe(true);
	expect(state.isAuthenticated).toBe(true);
	clerk.load({ ...signedIn, userId: null, sessionId: null, session: null });
	expect(clerk.provider()()).toMatchObject({ isLoading: false, isAuthenticated: false });
});

test('uses the server token while Clerk loads and the live session afterwards', async () => {
	const clerk = clerkStub(loading);
	const { fetchAccessToken } = clerk.provider('server-token')();
	expect(await fetchAccessToken({ forceRefreshToken: false })).toBe('server-token');
	clerk.load(signedIn);
	expect(await fetchAccessToken({ forceRefreshToken: false })).toBe('cached-token');
	expect(await fetchAccessToken({ forceRefreshToken: true })).toBe('fresh-token');
});

test('a forced refresh waits for Clerk instead of reusing the server token', async () => {
	const clerk = clerkStub(loading);
	const { fetchAccessToken } = clerk.provider('server-token')();
	const pending = fetchAccessToken({ forceRefreshToken: true });
	clerk.load(signedIn);
	expect(await pending).toBe('fresh-token');
});

test('signed-out sessions and mismatched sessions yield no token', async () => {
	const signedOut = clerkStub({ ...signedIn, userId: null, sessionId: null, session: null });
	expect(await signedOut.provider()().fetchAccessToken({ forceRefreshToken: false })).toBeNull();
	const mismatch = clerkStub({ ...signedIn, session: session('session_2') });
	expect(await mismatch.provider()().fetchAccessToken({ forceRefreshToken: false })).toBeNull();
});

test('a failed Clerk token request resolves to null', async () => {
	const clerk = clerkStub({
		...signedIn,
		session: {
			id: 'session_1',
			getToken: async () => {
				throw new Error('temporary Clerk failure');
			}
		}
	});
	const originalError = console.error;
	console.error = () => {};
	try {
		expect(await clerk.provider()().fetchAccessToken({ forceRefreshToken: false })).toBeNull();
	} finally {
		console.error = originalError;
	}
});
