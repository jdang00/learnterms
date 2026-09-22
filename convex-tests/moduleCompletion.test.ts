import { expect, test } from 'vitest';
import { setup } from './questionStudio.fixtures';
import { api } from '../src/convex/_generated/api';

test('module answers hydrate accurately, remain private, and clear on reset', async () => {
	const f = await setup();
	const seeded = await f.t.run(async (ctx) => {
		const module = await ctx.db.get(f.ids.moduleId);
		await ctx.db.insert('users', {
			name: 'Student',
			clerkUserId: 'student',
			cohortId: f.ids.cohortId,
			metadata: {},
			updatedAt: 1
		});
		const questionId = await ctx.db.insert('question', {
			moduleId: f.ids.moduleId,
			stem: 'Example',
			rationale: '',
			type: 'multiple_choice',
			options: [
				{ id: 'a', text: 'A' },
				{ id: 'b', text: 'B' }
			],
			correctAnswers: ['a'],
			metadata: {},
			status: 'published',
			aiGenerated: false,
			order: 0,
			updatedAt: 1
		});
		await ctx.db.insert('userProgress', {
			userId: f.ids.owner,
			classId: module!.classId,
			questionId,
			selectedOptions: ['a'],
			eliminatedOptions: [],
			isFlagged: false,
			isMastered: false,
			attempts: 0,
			metadata: {},
			updatedAt: 1
		});
		return { questionId, classId: module!.classId };
	});
	const args = { userId: f.ids.owner, classId: seeded.classId, questionIds: [seeded.questionId] };
	expect((await f.owner.query(api.userProgress.getUserProgressForModule, args)).answers).toEqual([
		{ questionId: seeded.questionId, selectedOptions: ['a'] }
	]);
	await expect(
		f.t.withIdentity({ subject: 'student' }).query(api.userProgress.getUserProgressForModule, args)
	).rejects.toThrow();
	await f.owner.mutation(api.userProgress.clearUserProgressForModule, {
		userId: f.ids.owner,
		moduleId: f.ids.moduleId
	});
	expect((await f.owner.query(api.userProgress.getUserProgressForModule, args)).answers).toEqual(
		[]
	);
});
