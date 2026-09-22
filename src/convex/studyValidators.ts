import { v } from 'convex/values';
export const studyEvidenceValidator = v.object({
	questionId: v.id('question'),
	checkedAt: v.optional(v.number()),
	latestCorrect: v.optional(v.boolean()),
	cleanRecallCount: v.number(),
	firstCleanAt: v.optional(v.number()),
	masteredAt: v.optional(v.number()),
	lastMasteredAt: v.optional(v.number()),
	activeAttemptChecks: v.optional(v.number()),
	activeAttemptRevealed: v.optional(v.boolean()),
	needsFreshEvidence: v.optional(v.boolean())
});
