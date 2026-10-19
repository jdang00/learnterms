import { PUBLIC_CONVEX_URL } from '$app/env/public';
import { decodeConvexLoad, encodeConvexLoad, initConvex } from 'convex-svelte/sveltekit';
import type { Transport } from '@sveltejs/kit';

// Create the Convex client before any load or component runs, on the server and in the browser,
// so results from `convexLoad()` can become live subscriptions during hydration.
initConvex(PUBLIC_CONVEX_URL);

export const transport: Transport = {
	ConvexLoadResult: { encode: encodeConvexLoad, decode: decodeConvexLoad }
};
