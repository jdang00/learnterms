import { expect, test, vi } from 'vitest';
import { setup } from './questionStudio.fixtures';
import { api, internal } from '../src/convex/_generated/api';
import { EMPTY_NOTE, normalizeNote, NOTE_LIMIT } from '../src/lib/question-notes/document';
const doc = (text: string) =>
	JSON.stringify({
		type: 'doc',
		content: [{ type: 'paragraph', content: [{ type: 'text', text, marks: [{ type: 'bold' }] }] }]
	});
async function fixture() {
	const f = await setup();
	const questionId = await f.t.run((ctx) =>
		ctx.db.insert('question', {
			moduleId: f.ids.moduleId,
			stem: 'Original',
			rationale: 'Rationale',
			type: 'multiple_choice',
			options: [],
			correctAnswers: [],
			metadata: {},
			status: 'published',
			aiGenerated: false,
			order: 0,
			updatedAt: 1
		})
	);
	const save = (content = doc('Personal note'), expectedRevision = 0) =>
		f.owner.mutation(api.questionNotes.save, { questionId, content, expectedRevision });
	return { ...f, questionId, save };
}
test('rich notes are private, idempotent, and survive question edits and progress resets', async () => {
	const f = await fixture();
	const saved = await f.save();
	expect(saved.status).toBe('saved');
	expect(saved.revision).toBe(1);
	expect(await f.save()).toEqual(saved);
	expect(
		await f.t
			.withIdentity({ subject: 'other' })
			.query(api.questionNotes.get, { questionId: f.questionId })
	).toEqual({ content: EMPTY_NOTE, revision: 0 });
	await f.t.run((ctx) =>
		ctx.db.patch(f.questionId, {
			stem: 'Edited question',
			rationale: 'Updated rationale',
			options: [{ id: 'a', text: 'New choice' }],
			correctAnswers: ['a'],
			updatedAt: 2
		})
	);
	await f.owner.mutation(api.userProgress.clearUserProgressForModule, {
		userId: f.ids.owner,
		moduleId: f.ids.moduleId,
		removeHighlights: true
	});
	expect(await f.owner.query(api.questionNotes.get, { questionId: f.questionId })).toEqual({
		content: saved.content,
		revision: 1
	});
});
test('rejects lost updates, including stale writes after clearing a note', async () => {
	const f = await fixture();
	await f.save();
	expect((await f.save(doc('Old tab'), 0)).status).toBe('conflict');
	expect((await f.save(EMPTY_NOTE, 1)).revision).toBe(2);
	expect((await f.save(doc('Old tab'), 1)).status).toBe('conflict');
	expect((await f.save(doc('New note'), 2)).revision).toBe(3);
});
test('server enforces content limits and rejects active or unsupported markup', async () => {
	const f = await fixture();
	await expect(f.save(doc('x'.repeat(NOTE_LIMIT + 1)))).rejects.toThrow('limited');
	await expect(
		f.save(
			JSON.stringify({
				type: 'doc',
				content: [{ type: 'image', attrs: { src: 'https://example.com' } }]
			})
		)
	).rejects.toThrow('Unsupported');
	await expect(f.save('<script>alert(1)</script>')).rejects.toThrow('Invalid');
	expect((await f.save(doc('x'.repeat(NOTE_LIMIT)))).status).toBe('saved');
	expect(
		normalizeNote(
			JSON.stringify({
				type: 'doc',
				content: [
					{ type: 'paragraph', content: [{ type: 'text', text: '<script>literal text</script>' }] }
				]
			})
		).content
	).toContain('<script>literal text</script>');
});
test('requires authentication and current class access for reads and writes', async () => {
	const f = await fixture();
	await expect(f.t.query(api.questionNotes.get, { questionId: f.questionId })).rejects.toThrow(
		'Unauthorized'
	);
	await expect(
		f.t.mutation(api.questionNotes.save, {
			questionId: f.questionId,
			content: doc('Hi'),
			expectedRevision: 0
		})
	).rejects.toThrow('Unauthorized');
	await f.t.run(async (ctx) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', 'other'))
			.unique();
		await ctx.db.patch(user!._id, { cohortId: undefined });
	});
	const other = f.t.withIdentity({ subject: 'other' });
	await expect(other.query(api.questionNotes.get, { questionId: f.questionId })).rejects.toThrow(
		'Class access denied'
	);
	await expect(
		other.mutation(api.questionNotes.save, {
			questionId: f.questionId,
			content: doc('Hi'),
			expectedRevision: 0
		})
	).rejects.toThrow('Class access denied');
});
test.each(['single', 'bulk'])('%s question deletion cascades to every user note', async (mode) => {
	vi.useFakeTimers();
	try {
		const f = await fixture();
		await f.save();
		await f.t.withIdentity({ subject: 'other' }).mutation(api.questionNotes.save, {
			questionId: f.questionId,
			content: doc('Other note'),
			expectedRevision: 0
		});
		if (mode === 'single')
			await f.owner.mutation(api.question.deleteQuestion, {
				questionId: f.questionId,
				moduleId: f.ids.moduleId
			});
		else
			await f.owner.mutation(api.question.bulkDeleteQuestions, {
				questionIds: [f.questionId],
				moduleId: f.ids.moduleId
			});
		await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
		expect(
			await f.t.run((ctx) =>
				ctx.db
					.query('questionNotes')
					.withIndex('by_questionId', (q) => q.eq('questionId', f.questionId))
					.take(10)
			)
		).toEqual([]);
		await expect(f.save()).rejects.toThrow('Question unavailable');
	} finally {
		vi.useRealTimers();
	}
});
test('cascade cleanup continues beyond one batch', async () => {
	vi.useFakeTimers();
	try {
		const f = await fixture();
		await f.t.run(async (ctx) => {
			for (let i = 0; i < 105; i++)
				await ctx.db.insert('questionNotes', {
					userId: f.ids.owner,
					questionId: f.questionId,
					content: doc('Cleanup'),
					revision: 1,
					updatedAt: 1
				});
		});
		await f.t.mutation(internal.questionNotes.deleteForQuestion, { questionId: f.questionId });
		await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
		expect(
			await f.t.run((ctx) =>
				ctx.db
					.query('questionNotes')
					.withIndex('by_questionId', (q) => q.eq('questionId', f.questionId))
					.take(1)
			)
		).toEqual([]);
	} finally {
		vi.useRealTimers();
	}
});

test.each(['module', 'class'])('%s deletion also removes notes for its questions', async (mode) => {
	vi.useFakeTimers();
	try {
		const f = await fixture();
		await f.save();
		const classId = await f.t.run(async (ctx) => {
			await ctx.db.patch(f.ids.owner, { role: 'admin' });
			return (await ctx.db.get(f.ids.moduleId))!.classId;
		});
		if (mode === 'module')
			await f.owner.mutation(api.module.deleteModule, { moduleId: f.ids.moduleId, classId });
		else await f.owner.mutation(api.class.deleteClass, { classId, cohortId: f.ids.cohortId });
		await f.t.finishAllScheduledFunctions(() => vi.runAllTimers());
		expect(
			await f.t.run((ctx) =>
				ctx.db
					.query('questionNotes')
					.withIndex('by_questionId', (q) => q.eq('questionId', f.questionId))
					.take(1)
			)
		).toEqual([]);
	} finally {
		vi.useRealTimers();
	}
});
