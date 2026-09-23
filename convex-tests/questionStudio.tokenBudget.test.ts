import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import rateLimiter from '@convex-dev/rate-limiter/test';
import { internal } from '../src/convex/_generated/api';
import { questionStudioRateLimiter } from '../src/convex/questionStudio/runtime';
import { convexTest, modules, schema } from './questionStudio.fixtures';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('five concurrent worker reservations settle to actual usage and leave capacity for reviews', async () => {
	const t = convexTest(schema, modules);
	rateLimiter.register(t);
	for (let worker = 0; worker < 5; worker++) {
		await t.mutation(internal.questionStudio.tokenBudget.reserveGenerationTokens, {
			userId: 'owner',
			allowance: 30000
		});
	}
	for (let worker = 0; worker < 5; worker++) {
		await t.mutation(internal.questionStudio.tokenBudget.settleGenerationTokens, {
			userId: 'owner',
			allowance: 30000,
			actualTokens: 6000
		});
	}
	for (let worker = 0; worker < 5; worker++) {
		await t.mutation(internal.questionStudio.tokenBudget.reserveGenerationTokens, {
			userId: 'owner',
			allowance: 30000
		});
	}
	const value = await t.run((ctx) =>
		questionStudioRateLimiter.getValue(ctx, 'questionStudioTokenUsagePerUser', { key: 'owner' })
	);
	expect(value.value).toBe(60000);
});

test('a rejected global reservation does not consume user capacity', async () => {
	const t = convexTest(schema, modules);
	rateLimiter.register(t);
	await t.run((ctx) =>
		questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalTokenUsage', { count: 2000000 })
	);
	await expect(
		t.mutation(internal.questionStudio.tokenBudget.reserveGenerationTokens, {
			userId: 'owner',
			allowance: 30000
		})
	).rejects.toThrow('RateLimited');
	const value = await t.run((ctx) =>
		questionStudioRateLimiter.getValue(ctx, 'questionStudioTokenUsagePerUser', { key: 'owner' })
	);
	expect(value.value).toBe(240000);
});

test('cached plan settlement returns the full reservation; uncompleted calls remain charged', async () => {
	const t = convexTest(schema, modules);
	rateLimiter.register(t);
	await t.mutation(internal.questionStudio.tokenBudget.reserveGenerationTokens, {
		userId: 'owner',
		allowance: 30000
	});
	await t.mutation(internal.questionStudio.tokenBudget.reserveGenerationTokens, {
		userId: 'owner',
		allowance: 30000
	});
	await t.mutation(internal.questionStudio.tokenBudget.settleGenerationTokens, {
		userId: 'owner',
		allowance: 30000,
		actualTokens: 0
	});
	const value = await t.run((ctx) =>
		questionStudioRateLimiter.getValue(ctx, 'questionStudioTokenUsagePerUser', { key: 'owner' })
	);
	expect(value.value).toBe(210000);
});

test('a slow call cannot refund above the bucket capacity after time-based refill', async () => {
	const t = convexTest(schema, modules);
	rateLimiter.register(t);
	await t.mutation(internal.questionStudio.tokenBudget.reserveGenerationTokens, {
		userId: 'owner',
		allowance: 30000
	});
	vi.advanceTimersByTime(120000);
	await t.mutation(internal.questionStudio.tokenBudget.settleGenerationTokens, {
		userId: 'owner',
		allowance: 30000,
		actualTokens: 6000
	});
	const value = await t.run((ctx) =>
		questionStudioRateLimiter.getValue(ctx, 'questionStudioTokenUsagePerUser', { key: 'owner' })
	);
	expect(value.value).toBe(240000);
});

test('waiting reservations leave both buckets untouched until capacity is available', async () => {
	const t = convexTest(schema, modules);
	rateLimiter.register(t);
	await t.mutation(internal.questionStudio.tokenBudget.reserveGenerationTokens, {
		userId: 'owner',
		allowance: 240000
	});
	const limited = await t.mutation(internal.questionStudio.tokenBudget.reserveGenerationTokens, {
		userId: 'owner',
		allowance: 10000,
		waitForCapacity: true
	});
	expect(limited?.retryAfter).toBe(5000);
	const state = await t.run((ctx) =>
		questionStudioRateLimiter.getValue(ctx, 'questionStudioTokenUsagePerUser', { key: 'owner' })
	);
	expect(state.value).toBe(0);
	vi.advanceTimersByTime(5000);
	expect(
		await t.mutation(internal.questionStudio.tokenBudget.reserveGenerationTokens, {
			userId: 'owner',
			allowance: 10000,
			waitForCapacity: true
		})
	).toBeNull();
});
