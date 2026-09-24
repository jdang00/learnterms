import type { ConvexClient } from 'convex/browser';

type ClerkSession = {
	id: string;
	getToken: (options: { template: string; skipCache: boolean }) => Promise<string | null>;
};

type AuthSnapshot = {
	isLoaded: boolean;
	userId: string | null | undefined;
	sessionId: string | null | undefined;
	initialToken: string | null;
};

async function getClerkToken(session: ClerkSession | null | undefined, forceRefreshToken: boolean) {
	if (!session) return null;
	try {
		return (await session.getToken({ template: 'convex', skipCache: forceRefreshToken })) ?? null;
	} catch (error) {
		console.error('[Convex Auth] Failed to fetch Clerk token:', error);
		return null;
	}
}

export function syncConvexClerkAuth(
	client: Pick<ConvexClient, 'setAuth'>,
	snapshot: AuthSnapshot,
	getSession: () => ClerkSession | null | undefined
) {
	if (!snapshot.isLoaded) {
		if (snapshot.initialToken) {
			client.setAuth(async ({ forceRefreshToken }) => {
				if (!forceRefreshToken) return snapshot.initialToken;
				return getClerkToken(getSession(), true);
			});
		}
		return;
	}

	if (snapshot.userId === null || snapshot.sessionId === null) {
		client.setAuth(async () => null);
		return;
	}
	if (snapshot.userId === undefined || snapshot.sessionId === undefined) return;

	client.setAuth(async ({ forceRefreshToken }) => {
		const session = getSession();
		if (!session || session.id !== snapshot.sessionId) return null;
		return getClerkToken(session, forceRefreshToken);
	});
}
