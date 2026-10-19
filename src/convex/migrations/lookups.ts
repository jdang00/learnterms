import { v } from 'convex/values';
import { internalQuery } from '../_generated/server';

/**
 * Find a class by name (for debugging/lookups).
 * Run via CLI: bunx convex run migrations/lookups:findClassByName '{"name": "Ocular Disease"}'
 */
export const findClassByName = internalQuery({
	args: {
		search: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const classes = await ctx.db.query('class').collect();
		if (!args.search) {
			// Return all classes if no search provided
			return classes.map((c) => ({
				id: c._id,
				name: c.name
			}));
		}
		const searchLower = args.search!.toLowerCase();
		const matches = classes.filter((c) => c.name && c.name.toLowerCase().includes(searchLower));
		return matches.map((c) => ({
			id: c._id,
			name: c.name
		}));
	}
});

/**
 * Find a cohort by name (for debugging/lookups).
 * Run via CLI: bunx convex run migrations/lookups:findCohortByName '{"search": "NSUOCO"}'
 */
export const findCohortByName = internalQuery({
	args: {
		search: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const cohorts = await ctx.db.query('cohort').collect();

		// Get school names for context
		const schools = await ctx.db.query('school').collect();
		const schoolMap = new Map(schools.map((s) => [s._id, s.name]));

		const formatCohort = (c: (typeof cohorts)[0]) => ({
			id: c._id,
			name: c.name,
			school: schoolMap.get(c.schoolId) ?? 'Unknown',
			hasStats: !!c.stats
		});

		if (!args.search) {
			return cohorts.map(formatCohort);
		}

		const searchLower = args.search.toLowerCase();
		const matches = cohorts.filter(
			(c) =>
				(c.name && c.name.toLowerCase().includes(searchLower)) ||
				(schoolMap.get(c.schoolId)?.toLowerCase().includes(searchLower) ?? false)
		);
		return matches.map(formatCohort);
	}
});
