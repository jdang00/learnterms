import { beforeEach, describe, expect, test, vi } from 'vitest';
import { redirect } from '@sveltejs/kit';

const mocks = vi.hoisted(() => ({
	getUser: vi.fn(),
	query: vi.fn(),
	mutation: vi.fn(),
	authenticatedConvexClient: vi.fn()
}));

vi.mock('svelte-clerk/server', () => ({ clerkClient: { users: { getUser: mocks.getUser } } }));
vi.mock('$env/static/public', () => ({ PUBLIC_CONVEX_URL: 'https://example.convex.cloud' }));
vi.mock('$lib/server/convex', () => ({
	authenticatedConvexClient: mocks.authenticatedConvexClient
}));

import { load as classes } from '../../src/routes/classes/+page.server';
import { load as cohort } from '../../src/routes/cohort/+page.server';
import { load as joinClass } from '../../src/routes/join-class/+page.server';
import { POST as joinClassPost } from '../../src/routes/join-class/+server';

const event = { locals: { auth: () => ({ userId: 'user_test' }) } };

beforeEach(() => {
	vi.resetAllMocks();
	mocks.getUser.mockResolvedValue({
		id: 'user_test',
		fullName: null,
		firstName: null,
		lastName: null,
		username: null,
		primaryEmailAddressId: 'primary',
		emailAddresses: [{ id: 'primary', emailAddress: 'student@example.com' }]
	});
	mocks.query.mockResolvedValue(null);
	mocks.mutation.mockResolvedValue('new_user');
	mocks.authenticatedConvexClient.mockImplementation(async () => ({
		query: mocks.query,
		mutation: mocks.mutation
	}));
});

describe.each([
	['classes', classes],
	['cohort', cohort]
] as const)('%s onboarding', (_name, load) => {
	test('creates a nameless Clerk account before redirecting to join class', async () => {
		await expect(load(event as never)).rejects.toMatchObject({
			status: 307,
			location: '/join-class'
		});
		expect(mocks.mutation).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ clerkUserId: 'user_test', name: 'student@example.com' })
		);
	});

	test('keeps an existing cohort member on the requested page', async () => {
		const userData = { clerkUserId: 'user_test', name: 'Student', cohortId: 'cohort_test' };
		mocks.query.mockResolvedValue(userData);
		await expect(load(event as never)).resolves.toMatchObject({ userData });
		expect(mocks.mutation).toHaveBeenCalledTimes(1);
		expect(mocks.mutation.mock.calls[0][1]).not.toHaveProperty('name');
	});
});

test('join class uses the same name fallback', async () => {
	await expect(joinClass(event as never)).resolves.toHaveProperty('seo');
	expect(mocks.mutation).toHaveBeenCalledWith(
		expect.anything(),
		expect.objectContaining({ name: 'student@example.com' })
	);
});

test.each([undefined, 'admin', 'curator'])(
	'join class redirects enrolled %s users',
	async (role) => {
		mocks.query.mockResolvedValue({ cohortId: 'cohort_test', role });
		await expect(joinClass(event as never)).rejects.toMatchObject({
			status: 307,
			location: '/classes'
		});
		expect(mocks.mutation).not.toHaveBeenCalled();
	}
);

test('developers can still open join class after enrollment', async () => {
	mocks.query.mockResolvedValue({ cohortId: 'cohort_test', role: 'dev' });
	await expect(joinClass(event as never)).resolves.toHaveProperty('seo');
});

const joinRequest = (body: unknown, userId: string | null = 'user_test') => ({
	locals: { auth: () => ({ userId }) },
	request: new Request('https://learnterms.com/join-class', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	})
});

test('join request creates a new account and uses the server session identity', async () => {
	const response = await joinClassPost(
		joinRequest({
			cohortId: 'cohort_test',
			code: ' NSUOCO2030 ',
			clerkUserId: 'someone_else'
		}) as never
	);
	expect(response.status).toBe(200);
	expect(mocks.mutation).toHaveBeenCalledTimes(2);
	expect(mocks.mutation.mock.calls[0][1]).toMatchObject({
		clerkUserId: 'user_test',
		name: 'student@example.com'
	});
	expect(mocks.mutation.mock.calls[1][1]).toEqual({
		clerkUserId: 'user_test',
		cohortId: 'cohort_test',
		code: 'NSUOCO2030'
	});
});

test('join request accepts an existing account without creating another', async () => {
	mocks.query.mockResolvedValue({ clerkUserId: 'user_test' });
	const response = await joinClassPost(
		joinRequest({ cohortId: 'cohort_test', code: 'NSUOCO2030' }) as never
	);
	expect(response.status).toBe(200);
	expect(mocks.getUser).not.toHaveBeenCalled();
	expect(mocks.mutation).toHaveBeenCalledTimes(1);
	expect(mocks.mutation.mock.calls[0][1]).toMatchObject({ clerkUserId: 'user_test' });
});

test('join request requires a session and valid input', async () => {
	const unsigned = await joinClassPost(
		joinRequest({ cohortId: 'cohort_test', code: 'NSUOCO2030' }, null) as never
	);
	expect(unsigned.status).toBe(401);
	const invalid = await joinClassPost(joinRequest({ cohortId: 'cohort_test' }) as never);
	expect(invalid.status).toBe(400);
	expect(mocks.query).not.toHaveBeenCalled();
	expect(mocks.mutation).not.toHaveBeenCalled();
});

test('join request reports a missing server token as an expired session', async () => {
	mocks.authenticatedConvexClient.mockImplementation(async () => redirect(307, '/sign-in'));
	const response = await joinClassPost(
		joinRequest({ cohortId: 'cohort_test', code: 'nsuoco2030' }) as never
	);
	expect(response.status).toBe(401);
	expect(await response.json()).toEqual({
		error: 'Your session has expired. Please sign in again.'
	});
	expect(mocks.mutation).not.toHaveBeenCalled();
});
