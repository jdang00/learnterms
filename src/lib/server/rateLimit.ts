/**
 * Simple in-memory rate limiter for SvelteKit server routes.
 * Uses a sliding window approach per IP address.
 */

const requests = new Map<string, number[]>();

const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
	const now = Date.now();
	if (now - lastCleanup < CLEANUP_INTERVAL) return;
	lastCleanup = now;

	const cutoff = now - windowMs;
	for (const [key, timestamps] of requests) {
		const valid = timestamps.filter((t) => t > cutoff);
		if (valid.length === 0) {
			requests.delete(key);
		} else {
			requests.set(key, valid);
		}
	}
}

export function rateLimit(
	ip: string,
	{ maxRequests = 30, windowMs = 60_000 }: { maxRequests?: number; windowMs?: number } = {}
): { ok: boolean; retryAfterMs: number } {
	cleanup(windowMs);

	const now = Date.now();
	const cutoff = now - windowMs;
	const timestamps = (requests.get(ip) ?? []).filter((t) => t > cutoff);

	if (timestamps.length >= maxRequests) {
		const oldestInWindow = timestamps[0];
		return { ok: false, retryAfterMs: oldestInWindow + windowMs - now };
	}

	timestamps.push(now);
	requests.set(ip, timestamps);
	return { ok: true, retryAfterMs: 0 };
}
