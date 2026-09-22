import { expect, test } from 'vitest';
import { setup } from './questionStudio.fixtures';
import { api } from '../src/convex/_generated/api';
import { stemFingerprint } from '../src/lib/utils/stemHighlights';

async function fixture() {
	const base = await setup();
	const questionId = await base.t.run((ctx) =>
		ctx.db.insert('question', {
			moduleId: base.ids.moduleId,
			stem: '<p>A <strong>clinical</strong> question.</p>',
			rationale: 'Explanation',
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
	const version = (await base.owner.query(api.stemHighlights.get, { questionId })).version;
	const range = { id: 'first', start: 2, end: 10, quote: 'clinical' };
	const add = () =>
		base.owner.mutation(api.stemHighlights.edit, {
			questionId,
			version,
			operation: { type: 'add', range }
		});
	return { ...base, questionId, version, range, add };
}

test('persists private highlights, handles retries, and supports remove/undo without overwriting other edits', async () => {
	const f = await fixture();
	await f.add();
	await f.add();
	expect(
		(await f.owner.query(api.stemHighlights.get, { questionId: f.questionId })).ranges
	).toEqual([f.range]);
	expect(
		(
			await f.t
				.withIdentity({ subject: 'other' })
				.query(api.stemHighlights.get, { questionId: f.questionId })
		).ranges
	).toEqual([]);
	await f.owner.mutation(api.stemHighlights.edit, {
		questionId: f.questionId,
		version: f.version,
		operation: { type: 'add', range: { id: 'second', start: 11, end: 19, quote: 'question' } }
	});
	await f.owner.mutation(api.stemHighlights.edit, {
		questionId: f.questionId,
		version: f.version,
		operation: { type: 'remove', id: f.range.id }
	});
	expect(
		(await f.owner.query(api.stemHighlights.get, { questionId: f.questionId })).ranges.map(
			(r) => r.id
		)
	).toEqual(['second']);
	await f.add();
	expect(
		(await f.owner.query(api.stemHighlights.get, { questionId: f.questionId })).ranges
	).toHaveLength(2);
});

test('reset preserves highlights by default and removes only the caller highlights when requested', async () => {
	const f = await fixture();
	await f.add();
	const other = f.t.withIdentity({ subject: 'other' });
	await other.mutation(api.stemHighlights.edit, {
		questionId: f.questionId,
		version: f.version,
		operation: { type: 'add', range: f.range }
	});
	await f.owner.mutation(api.userProgress.clearUserProgressForModule, {
		userId: f.ids.owner,
		moduleId: f.ids.moduleId
	});
	expect(
		(await f.owner.query(api.stemHighlights.get, { questionId: f.questionId })).ranges
	).toHaveLength(1);
	await f.owner.mutation(api.userProgress.clearUserProgressForModule, {
		userId: f.ids.owner,
		moduleId: f.ids.moduleId,
		removeHighlights: true
	});
	expect(
		(await f.owner.query(api.stemHighlights.get, { questionId: f.questionId })).ranges
	).toEqual([]);
	expect(
		(await other.query(api.stemHighlights.get, { questionId: f.questionId })).ranges
	).toHaveLength(1);
});

test('question edits hide old ranges and reject stale writes; unrelated updates keep highlights', async () => {
	const f = await fixture();
	await f.add();
	await f.t.run((ctx) => ctx.db.patch(f.questionId, { updatedAt: 2, flagCount: 1 }));
	expect(
		(await f.owner.query(api.stemHighlights.get, { questionId: f.questionId })).ranges
	).toHaveLength(1);
	await f.t.run((ctx) => ctx.db.patch(f.questionId, { stem: 'Changed question.' }));
	expect(await f.owner.query(api.stemHighlights.get, { questionId: f.questionId })).toEqual({
		questionId: f.questionId,
		version: await stemFingerprint('Changed question.'),
		ranges: [],
		stale: true
	});
	await expect(f.add()).rejects.toThrow('Question changed');
});

test('rejects unauthenticated, cross-cohort, deleted-question and malformed range access', async () => {
	const f = await fixture();
	await expect(f.t.query(api.stemHighlights.get, { questionId: f.questionId })).rejects.toThrow(
		'Unauthorized'
	);
	await f.t.run(async (ctx) => {
		const other = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', 'other'))
			.unique();
		await ctx.db.patch(other!._id, { cohortId: undefined });
	});
	const other = f.t.withIdentity({ subject: 'other' });
	await expect(
		other.mutation(api.stemHighlights.edit, {
			questionId: f.questionId,
			version: f.version,
			operation: { type: 'add', range: f.range }
		})
	).rejects.toThrow('Class access denied');
	await expect(
		f.owner.mutation(api.stemHighlights.edit, {
			questionId: f.questionId,
			version: f.version,
			operation: { type: 'add', range: { ...f.range, start: -1 } }
		})
	).rejects.toThrow('Invalid highlight');
	await f.t.run((ctx) => ctx.db.patch(f.questionId, { deletedAt: 2 }));
	await expect(f.add()).rejects.toThrow('Question unavailable');
});

test('reselecting highlighted text erases just that portion and undo restores both sides atomically', async () => {
	const f = await fixture();
	await f.add();
	const change = await f.owner.mutation(api.stemHighlights.edit, {
		questionId: f.questionId,
		version: f.version,
		operation: { type: 'toggle', range: { id: 'erase', start: 4, end: 7, quote: 'ini' } }
	});
	const after = await f.owner.query(api.stemHighlights.get, { questionId: f.questionId });
	expect(after.ranges.map(({ start, end, quote }) => ({ start, end, quote }))).toEqual([
		{ start: 2, end: 4, quote: 'cl' },
		{ start: 7, end: 10, quote: 'cal' }
	]);
	await f.owner.mutation(api.stemHighlights.edit, {
		questionId: f.questionId,
		version: f.version,
		operation: {
			type: 'patch',
			removeIds: change.added.map((r) => r.id),
			addRanges: change.removed
		}
	});
	expect(
		(await f.owner.query(api.stemHighlights.get, { questionId: f.questionId })).ranges
	).toEqual([f.range]);
	await f.owner.mutation(api.stemHighlights.edit, {
		questionId: f.questionId,
		version: f.version,
		operation: { type: 'toggle', range: { ...f.range, id: 'erase-all' } }
	});
	expect(
		(await f.owner.query(api.stemHighlights.get, { questionId: f.questionId })).ranges
	).toEqual([]);
});

test('selection removes overlapping portions from every saved range and keeps unrelated highlights', async () => {
	const f = await fixture();
	await f.add();
	await f.owner.mutation(api.stemHighlights.edit, {
		questionId: f.questionId,
		version: f.version,
		operation: { type: 'add', range: { id: 'overlap', start: 7, end: 19, quote: 'cal question' } }
	});
	await f.owner.mutation(api.stemHighlights.edit, {
		questionId: f.questionId,
		version: f.version,
		operation: { type: 'toggle', range: { id: 'erase-overlap', start: 7, end: 12, quote: 'cal q' } }
	});
	expect(
		(await f.owner.query(api.stemHighlights.get, { questionId: f.questionId })).ranges.map(
			(r) => r.quote
		)
	).toEqual(['clini', 'uestion']);
});

test('highlight mode is a private persistent preference and survives module resets', async () => {
	const f = await fixture();
	await f.owner.mutation(api.stemHighlights.setEnabled, { enabled: true });
	expect((await f.owner.query(api.users.getUserById, { id: 'owner' }))?.stemHighlightEnabled).toBe(
		true
	);
	await f.owner.mutation(api.userProgress.clearUserProgressForModule, {
		userId: f.ids.owner,
		moduleId: f.ids.moduleId,
		removeHighlights: true
	});
	expect((await f.owner.query(api.users.getUserById, { id: 'owner' }))?.stemHighlightEnabled).toBe(
		true
	);
	const other = f.t.withIdentity({ subject: 'other' });
	expect(
		(await other.query(api.users.getUserById, { id: 'other' }))?.stemHighlightEnabled
	).toBeUndefined();
	await f.owner.mutation(api.stemHighlights.setEnabled, { enabled: false });
	expect((await f.owner.query(api.users.getUserById, { id: 'owner' }))?.stemHighlightEnabled).toBe(
		false
	);
	await expect(f.t.mutation(api.stemHighlights.setEnabled, { enabled: true })).rejects.toThrow(
		'Unauthorized'
	);
});
