import { expect, test } from 'vitest';
import { setup } from './questionStudio.fixtures';
import { api } from '../src/convex/_generated/api';

const layout = {
	items: [
		{ id: 'check', display: 'label' as const },
		{ id: 'flag', display: 'icon' as const }
	],
	overflow: ['reset']
};

test('saves one dock layout per user, updates in place, and resets to default', async () => {
	const { t, owner } = await setup();
	const other = t.withIdentity({ subject: 'other' });

	expect(await owner.query(api.quizDock.getLayout, {})).toBeNull();

	await owner.mutation(api.quizDock.saveLayout, { layout });
	await owner.mutation(api.quizDock.saveLayout, {
		layout: { ...layout, overflow: ['reset', 'settings'] }
	});
	expect(await owner.query(api.quizDock.getLayout, {})).toEqual({
		...layout,
		overflow: ['reset', 'settings']
	});
	expect(await t.run((ctx) => ctx.db.query('quizDockLayouts').collect())).toHaveLength(1);

	expect(await other.query(api.quizDock.getLayout, {})).toBeNull();

	await owner.mutation(api.quizDock.saveLayout, { layout: null });
	expect(await owner.query(api.quizDock.getLayout, {})).toBeNull();
});

test('rejects anonymous writes and oversized layouts', async () => {
	const { t, owner } = await setup();
	expect(await t.query(api.quizDock.getLayout, {})).toBeNull();
	await expect(t.mutation(api.quizDock.saveLayout, { layout })).rejects.toThrow();
	await expect(
		owner.mutation(api.quizDock.saveLayout, {
			layout: { items: [], overflow: Array.from({ length: 41 }, (_, i) => `tool-${i}`) }
		})
	).rejects.toThrow('Too many dock tools');
});
