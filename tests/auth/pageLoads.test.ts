import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getUser: vi.fn(),
	query: vi.fn(),
	mutation: vi.fn()
}));

vi.mock('svelte-clerk/server', () => ({ clerkClient: { users: { getUser: mocks.getUser } } }));
vi.mock('$env/static/public', () => ({ PUBLIC_CONVEX_URL: 'https://example.convex.cloud' }));
vi.mock('$lib/server/convex', () => ({
	authenticatedConvexClient: async () => ({ query: mocks.query, mutation: mocks.mutation })
}));

import { load as classes } from '../../src/routes/classes/+page.server';
import { load as cohort } from '../../src/routes/cohort/+page.server';
import { load as joinClass } from '../../src/routes/join-class/+page.server';

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
