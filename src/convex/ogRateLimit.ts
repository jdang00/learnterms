import { mutation } from './_generated/server';
import { components } from './_generated/api';
import { RateLimiter } from '@convex-dev/rate-limiter';
import { v } from 'convex/values';

const rateLimiter = new RateLimiter(components.rateLimiter, {
	ogImage: { kind: 'fixed window', rate: 30, period: 60_000 }
});

export const checkOgRateLimit = mutation({
	args: { key: v.string() },
	handler: async (ctx, args) => {
		const result = await rateLimiter.limit(ctx, 'ogImage', { key: args.key });
		return result;
	}
});
