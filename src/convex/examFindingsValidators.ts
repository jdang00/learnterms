import { v } from 'convex/values';

// Test ids and value keys come from src/lib/examFindings/catalog.ts and are checked on save.
// Compact packs boxes tighter for dense, EHR-style charts.
export const examFindingsStyleValidator = v.literal('compact');

export const examFindingsValidator = v.array(
	v.object({
		test: v.string(),
		title: v.optional(v.string()),
		size: v.optional(v.union(v.literal('small'), v.literal('half'), v.literal('full'))),
		values: v.record(v.string(), v.string()),
		note: v.optional(v.string())
	})
);
