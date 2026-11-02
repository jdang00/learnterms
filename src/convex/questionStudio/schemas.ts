import { z } from 'zod/v4';

export const draftSchema = z.object({
	questions: z
		.array(
			z.object({
				slotId: z.string(),
				stem: z.string().min(12).max(900),
				options: z.array(z.string().min(1).max(260)).length(4),
				answerIndex: z.number().int().min(0).max(3),
				rationale: z.string().min(20).max(1600),
				evidence: z
					.array(z.object({ citationId: z.string(), quote: z.string().min(6).max(700) }))
					.min(1)
					.max(4)
			})
		)
		.max(3),
	abstentions: z.array(z.object({ slotId: z.string(), reason: z.string().max(500) })).max(3)
});
export const learnBatchSchema = draftSchema.extend({
	questions: z
		.array(
			draftSchema.shape.questions.element.extend({
				evidence: z
					.array(z.object({ citationId: z.string() }))
					.min(1)
					.max(4)
			})
		)
		.max(15),
	abstentions: z.array(draftSchema.shape.abstentions.element).max(15)
});
export type QualityDraft = z.infer<typeof draftSchema>['questions'][number];
export const reviewSchema = z.object({
	reviews: z
		.array(
			z.object({
				slotId: z.string(),
				bestAnswerIndex: z.number().int().min(-1).max(3),
				grounded: z.boolean(),
				singleBestAnswer: z.boolean(),
				plausibleDistractors: z.boolean(),
				typeMatches: z.boolean(),
				reasons: z.array(z.string().max(500)).min(1).max(5)
			})
		)
		.max(3)
});
export type QualityReview = z.infer<typeof reviewSchema>['reviews'][number];
export const learnReviewSchema = z.object({
	reviews: z
		.array(
			reviewSchema.shape.reviews.element.extend({
				// Null preserves a good draft; corrections are screened and mechanically checked below.
				replacement: draftSchema.shape.questions.element.nullable()
			})
		)
		.max(3)
});
export const learnReferenceReviewSchema = z.object({
	reviews: z
		.array(
			reviewSchema.shape.reviews.element.extend({
				// Explicitly audit all options; choosing a preferred answer can hide a second valid one.
				defensibleAnswerIndices: z.array(z.number().int().min(0).max(3)).max(4),
				teachingRationale: z.boolean(),
				replacement: learnBatchSchema.shape.questions.element.nullable()
			})
		)
		.max(3)
});
