import { v } from 'convex/values';
import { calculateRateLimit } from '@convex-dev/rate-limiter';
import { internalMutation } from '../_generated/server';
import { questionStudioRateLimiter } from './runtime';

/** Reserve both buckets atomically; a rejected global reservation must not charge the user. */
export const reserveGenerationTokens = internalMutation({
	args: { userId: v.string(), allowance: v.number(), waitForCapacity: v.optional(v.boolean()) },
	returns: v.union(v.null(), v.object({ retryAfter: v.number() })),
	handler: async (ctx, { userId, allowance, waitForCapacity }) => {
		if (!Number.isSafeInteger(allowance) || allowance <= 0)
			throw new Error('Invalid token allowance');
		if (waitForCapacity) {
			const user = await questionStudioRateLimiter.check(ctx, 'questionStudioTokenUsagePerUser', {
				key: userId,
				count: allowance
			});
			const global = await questionStudioRateLimiter.check(ctx, 'questionStudioGlobalTokenUsage', {
				count: allowance
			});
			if (!user.ok || !global.ok)
				return { retryAfter: Math.max(user.retryAfter ?? 0, global.retryAfter ?? 0) };
		}
		await questionStudioRateLimiter.limit(ctx, 'questionStudioTokenUsagePerUser', {
			key: userId,
			count: allowance,
			throws: true
		});
		await questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalTokenUsage', {
			count: allowance,
			throws: true
		});
		return null;
	}
});

/** Successful calls consume actual tokens, including cached input; failures keep their reservation. */
export const settleGenerationTokens = internalMutation({
	args: { userId: v.string(), allowance: v.number(), actualTokens: v.number() },
	returns: v.null(),
	handler: async (ctx, { userId, allowance, actualTokens }) => {
		if (
			!Number.isSafeInteger(allowance) ||
			allowance <= 0 ||
			!Number.isSafeInteger(actualTokens) ||
			actualTokens < 0
		)
			throw new Error('Invalid token usage');
		const count = actualTokens - allowance;
		// A negative count returns unused allowance. An overage becomes debt for the next call.
		for (const name of [
			'questionStudioTokenUsagePerUser',
			'questionStudioGlobalTokenUsage'
		] as const) {
			const options = name === 'questionStudioTokenUsagePerUser' ? { key: userId } : {};
			let adjustment = count;
			if (count < 0) {
				const state = await questionStudioRateLimiter.getValue(ctx, name, options);
				const current = calculateRateLimit(state, state.config, Date.now()).value;
				const capacity = state.config.capacity ?? state.config.rate;
				// Time may have refilled the bucket while the model ran; never refund past capacity.
				adjustment = Math.max(count, current - capacity);
			}
			await questionStudioRateLimiter.limit(ctx, name, {
				...options,
				count: adjustment,
				reserve: true
			});
		}
		return null;
	}
});
