import { beforeEach, expect, test, vi } from 'vitest';

const convexLoad = vi.hoisted(() => vi.fn());

vi.mock('$app/env/public', () => ({ PUBLIC_CONVEX_URL: 'https://example.convex.cloud' }));
vi.mock('convex-svelte/sveltekit', () => ({ convexLoad, createConvexHttpClient: vi.fn() }));

import { load as attempt } from '../../src/routes/classes/[classId]/tests/[attemptId]/+page.server';
import { load as results } from '../../src/routes/classes/[classId]/tests/[attemptId]/results/+page.server';
import { load as builder } from '../../src/routes/classes/[classId]/tests/new/+page.server';

const params = { classId: 'class_test', attemptId: 'attempt_test' };
const signedIn = {
	locals: { auth: () => ({ userId: 'user_test' }), convexToken: 'token_test' },
	params
};
const signedOut = { locals: { auth: () => ({ userId: null }), convexToken: undefined }, params };
const loaded = (data: unknown) => ({ data, isLoading: false, error: undefined, isStale: false });

beforeEach(() => {
	convexLoad.mockReset();
	convexLoad.mockResolvedValue(loaded({}));
});

test.each([
	['attempt', attempt],
	['results', results],
	['new test', builder]
] as const)('%s sends signed-out visitors to sign in without querying Convex', async (_, load) => {
	await expect(load(signedOut as never)).rejects.toMatchObject({
		status: 307,
		location: '/sign-in'
	});
	expect(convexLoad).not.toHaveBeenCalled();
});

test('the runner loads its attempt on the server', async () => {
	await expect(attempt(signedIn as never)).resolves.toMatchObject({ loadError: null });
	expect(convexLoad).toHaveBeenCalledWith(expect.anything(), { attemptId: 'attempt_test' });
});

test('the builder loads class data and past attempts together', async () => {
	await expect(builder(signedIn as never)).resolves.toMatchObject({ loadError: null });
	expect(convexLoad).toHaveBeenCalledTimes(2);
	for (const call of convexLoad.mock.calls) expect(call[1]).toEqual({ classId: 'class_test' });
});

test('a refused read becomes the inline error instead of failing the page', async () => {
	convexLoad.mockRejectedValue(new Error('Results are not available yet'));
	await expect(results(signedIn as never)).resolves.toEqual({
		results: null,
		loadError: 'Results are not available yet'
	});
});
