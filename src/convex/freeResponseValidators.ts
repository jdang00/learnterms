import { v } from 'convex/values';
export const acceptanceValidator = v.union(
	v.literal('lenient'),
	v.literal('balanced'),
	v.literal('strict')
);
export const freeResponseGradeValidator = v.object({
	isCorrect: v.boolean(),
	feedback: v.string(),
	comparison: v.string(),
	response: v.string()
});
