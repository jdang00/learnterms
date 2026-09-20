/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import schema from '../src/convex/schema';
export const modules = import.meta.glob('../src/convex/**/*.ts');
export { convexTest, schema };
export async function setup() {
	const t = convexTest(schema, modules);
	const ids = await t.run(async (ctx) => {
		const schoolId = await ctx.db.insert('school', {
			name: 'Test',
			description: 'test',
			metadata: {},
			updatedAt: 1
		});
		const cohortId = await ctx.db.insert('cohort', {
			name: 'Test',
			metadata: {},
			updatedAt: 1,
			schoolId,
			startYear: '2026',
			endYear: '2030'
		});
		const semesterId = await ctx.db.insert('semester', {
			name: 'Test',
			metadata: {},
			updatedAt: 1
		});
		const classId = await ctx.db.insert('class', {
			name: 'Test',
			metadata: {},
			updatedAt: 1,
			cohortId,
			semesterId,
			code: 'T',
			description: 'test',
			order: 0
		});
		const moduleId = await ctx.db.insert('module', {
			title: 'Test',
			metadata: {},
			updatedAt: 1,
			classId,
			cohortId,
			order: 0,
			description: 'test',
			status: 'draft',
			questionCount: 0
		});
		const documentId = await ctx.db.insert('contentLib', {
			title: 'Test',
			updatedAt: 1,
			cohortId,
			metadata: { indexedAt: 1 }
		});
		const owner = await ctx.db.insert('users', {
			name: 'Owner',
			clerkUserId: 'owner',
			cohortId,
			role: 'curator',
			metadata: {},
			updatedAt: 1
		});
		await ctx.db.insert('users', {
			name: 'Other',
			clerkUserId: 'other',
			cohortId,
			role: 'curator',
			metadata: {},
			updatedAt: 1
		});
		return { owner, cohortId, moduleId, documentId };
	});
	return { t, ids, owner: t.withIdentity({ subject: 'owner' }) };
}
