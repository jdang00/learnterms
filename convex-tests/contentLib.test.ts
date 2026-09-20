import { expect, test } from 'vitest';
import { api } from '../src/convex/_generated/api';
import { setup } from './questionStudio.fixtures';

test('library lists only active R2 documents for the authorized cohort', async () => {
	const { t, ids, owner } = await setup();
	const documentId = await t.run(async (ctx) => {
		const documentId = await ctx.db.insert('contentLib', {
			title: 'New source',
			updatedAt: 1,
			cohortId: ids.cohortId,
			metadata: { storageProvider: 'r2', r2Key: 'source.pdf' }
		});
		await ctx.db.insert('contentLib', {
			title: 'Removed source',
			updatedAt: 1,
			deletedAt: 2,
			cohortId: ids.cohortId,
			metadata: { storageProvider: 'r2', r2Key: 'removed.pdf' }
		});
		return documentId;
	});
	const documents = await owner.query(api.contentLib.getR2DocumentsByCohort, {
		cohortId: ids.cohortId
	});
	expect(documents.map((doc) => doc._id)).toEqual([documentId]);
	expect(await t.run((ctx) => ctx.db.get(ids.documentId))).not.toBeNull();
});

test('library rejects unauthenticated and other-cohort requests while allowing developers', async () => {
	const { t, ids } = await setup();
	await t.run(async (ctx) => {
		await ctx.db.insert('users', {
			name: 'Outsider',
			clerkUserId: 'outsider',
			role: 'admin',
			metadata: {},
			updatedAt: 1
		});
		await ctx.db.insert('users', {
			name: 'Developer',
			clerkUserId: 'developer',
			role: 'dev',
			metadata: {},
			updatedAt: 1
		});
	});
	const args = { cohortId: ids.cohortId };
	await expect(t.query(api.contentLib.getR2DocumentsByCohort, args)).rejects.toThrow(
		'Unauthorized'
	);
	await expect(
		t.withIdentity({ subject: 'outsider' }).query(api.contentLib.getR2DocumentsByCohort, args)
	).rejects.toThrow('Unauthorized for this cohort');
	await expect(
		t.withIdentity({ subject: 'unregistered' }).query(api.contentLib.getR2DocumentsByCohort, args)
	).rejects.toThrow('Unauthorized for this cohort');
	await expect(
		t.withIdentity({ subject: 'developer' }).query(api.contentLib.getR2DocumentsByCohort, args)
	).resolves.toEqual([]);
});
