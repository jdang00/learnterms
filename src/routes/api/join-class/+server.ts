import { isRedirect, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import { authenticatedConvexClient } from '$lib/server/convex';
import { userDisplayName } from '$lib/userDisplayName';
import { clerkClient } from 'svelte-clerk/server';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { userId } = locals.auth();
	if (!userId)
		return json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid join request.' }, { status: 400 });
	}
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return json({ error: 'Invalid join request.' }, { status: 400 });
	}
	const { cohortId, code } = body as Record<string, unknown>;
	if (typeof cohortId !== 'string' || typeof code !== 'string' || !code.trim()) {
		return json({ error: 'Invalid join request.' }, { status: 400 });
	}

	try {
		const client = await authenticatedConvexClient(locals);
		const userData = await client.query(api.users.getUserById, { id: userId });
		if (!userData) {
			const user = await clerkClient.users.getUser(userId);
			const primaryEmail = user.emailAddresses?.find(
				(email) => email.id === user.primaryEmailAddressId
			)?.emailAddress;
			await client.mutation(api.users.addUser, {
				clerkUserId: userId,
				name: userDisplayName(user),
				firstName: user.firstName || undefined,
				lastName: user.lastName || undefined,
				email: primaryEmail || undefined,
				username: user.username || undefined,
				imageUrl: user.imageUrl || undefined,
				lastSignInAt: user.lastSignInAt || undefined,
				createdAt: user.createdAt || undefined,
				lastActiveAt: user.lastActiveAt || undefined
			});
		}
		await client.mutation(api.cohort.joinCohort, {
			clerkUserId: userId,
			cohortId: cohortId as Id<'cohort'>,
			code: code.trim()
		});
		return json({ success: true });
	} catch (error) {
		if (isRedirect(error)) {
			return json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
		}
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes('already joined a class')) {
			return json(
				{ error: 'You have already joined a class. Contact an administrator to change classes.' },
				{ status: 409 }
			);
		}
		if (message.includes('Invalid code')) {
			return json(
				{ error: 'This class code is no longer valid. Please try again.' },
				{ status: 400 }
			);
		}
		if (message.includes('Unauthorized')) {
			return json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
		}
		console.error('Failed to join class:', error);
		return json({ error: 'Unable to join class. Please try again.' }, { status: 500 });
	}
};
