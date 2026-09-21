import { expect, test } from 'vitest';
import { api } from '../src/convex/_generated/api';
import { setup } from './questionStudio.fixtures';

test('student analytics distinguishes missing summaries from recorded zero activity', async () => {
	const { t, ids, owner } = await setup();
	await t.run(async (ctx) => {
		await ctx.db.patch(ids.owner, {
			progressStats: {
				questionsInteracted: 0,
				questionsMastered: 0,
				totalQuestions: 10,
				updatedAt: 1
			}
		});
	});
	const students = await owner.query(api.progress.getStudentsWithProgress, {
		cohortId: ids.cohortId,
		includeSubscription: false
	});
	expect(students.find((s) => s._id === ids.owner)).toMatchObject({
		statsAvailable: true,
		questionsInteracted: 0
	});
	expect(students.find((s) => s._id !== ids.owner)).toMatchObject({
		statsAvailable: false,
		lastActivityAt: null
	});
});
