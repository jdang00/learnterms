import { query } from './_generated/server';

export const getAllSemesters = query({
	args: {},
	handler: async (ctx) => {
		const schools = ctx.db.query('semester').collect();

		return schools;
	}
});
