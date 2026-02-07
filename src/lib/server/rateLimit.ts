/**
 * Simple in-memory rate limiter for SvelteKit server routes.
 * Uses a sliding window approach per IP address.
 */

const requests = new Map<string, { timestamps: number[]; windowMs: number }>();

const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
	const now = Date.now();
	if (now - lastCleanup < CLEANUP_INTERVAL) return;
	lastCleanup = now;

	for (const [key, entry] of requests) {
		const cutoff = now - entry.windowMs;
		const valid = entry.timestamps.filter((t) => t > cutoff);
		if (valid.length === 0) {
			requests.delete(key);
		} else {
			entry.timestamps = valid;
		}
	}
}

export function rateLimit(
	ip: string,
	{ maxRequests = 30, windowMs = 60_000 }: { maxRequests?: number; windowMs?: number } = {}
): { ok: boolean; retryAfterMs: number } {
	cleanup();

	const now = Date.now();
	const cutoff = now - windowMs;
	const entry = requests.get(ip);
	const timestamps = (entry?.timestamps ?? []).filter((t) => t > cutoff);

	if (timestamps.length >= maxRequests) {
		const oldestInWindow = timestamps[0];
		return { ok: false, retryAfterMs: oldestInWindow + windowMs - now };
	}

	timestamps.push(now);
	requests.set(ip, { timestamps, windowMs });
	return { ok: true, retryAfterMs: 0 };
}
