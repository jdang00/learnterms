import { query } from './_generated/server';

export const getAllSemesters = query({
	args: {},
	handler: async (ctx) => {
		const semesters = ctx.db.query('semester').collect();

		return semesters;
	}
});
