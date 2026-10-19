import type { ConvexAuthProvider } from 'convex-svelte';

export type ClerkAuthSnapshot = {
	isLoaded: boolean;
	userId: string | null | undefined;
	sessionId: string | null | undefined;
	session:
		| {
				id: string;
				getToken: (options: { template: string; skipCache: boolean }) => Promise<string | null>;
		  }
		| null
		| undefined;
};

/**
 * Adapts Clerk's reactive context to the provider shape `setupAuth()` expects.
 * While Clerk is still loading in the browser, the token minted during server rendering keeps
 * Convex authenticated; a forced refresh waits for Clerk and asks the live session instead.
 */
export function clerkConvexAuthProvider(
	clerk: () => ClerkAuthSnapshot,
	options: { initialToken: string | null; whenLoaded: () => Promise<void> }
): () => ConvexAuthProvider {
	return () => {
		const snapshot = clerk();
		return {
			isLoading: !snapshot.isLoaded,
			isAuthenticated: Boolean(snapshot.userId && snapshot.sessionId),
			fetchAccessToken: async ({ forceRefreshToken }) => {
				let current = snapshot.isLoaded ? snapshot : clerk();
				if (!current.isLoaded) {
					if (options.initialToken && !forceRefreshToken) return options.initialToken;
					await options.whenLoaded();
					current = clerk();
				}
				const session = current.session;
				if (!session || !current.userId || session.id !== current.sessionId) return null;
				try {
					return (
						(await session.getToken({ template: 'convex', skipCache: forceRefreshToken })) ?? null
					);
				} catch (error) {
					console.error('[Convex Auth] Failed to fetch Clerk token:', error);
					return null;
				}
			}
		};
	};
}
