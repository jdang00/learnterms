import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const exemplarQuestionType = v.union(
	v.literal('learn'),
	v.literal('clinical'),
	v.literal('criticalThinking')
);

export const exemplarTier = v.union(v.literal('top'), v.literal('design'), v.literal('standard'));

export const exemplarStatsValidator = v.object({
	responders: v.number(),
	difficulty: v.number(),
	discrimination: v.optional(v.number()),
	optionShares: v.optional(v.array(v.number()))
});

/** The fields shared by the `questionExemplars` table and the Exemplar type. */
export const exemplarFields = {
	questionType: exemplarQuestionType,
	shape: v.string(),
	subject: v.string(),
	stem: v.string(),
	options: v.array(v.string()),
	correctIndex: v.number(),
	rationale: v.string(),
	stats: v.optional(exemplarStatsValidator),
	notes: v.optional(v.string())
};

/** One upsert row: Exemplar fields plus ranking, provenance and an optional embedding. */
export const exemplarUpsertValidator = v.object({
	...exemplarFields,
	sourceQuestionId: v.string(),
	questionId: v.optional(v.id('question')),
	cohortId: v.optional(v.id('cohort')),
	tier: exemplarTier,
	quality: v.number(),
	labelSource: v.union(v.literal('model'), v.literal('heuristic')),
	embedTextHash: v.string(),
	/** Omit to keep the stored vector when the embedded text is unchanged. */
	embedding: v.optional(v.array(v.float64()))
});

export const exemplarResultValidator = v.object({ id: v.string(), ...exemplarFields });

// Curator-written questions scored by student responses; Question Studio retrieves them as models.
export const questionExemplarsTable = defineTable({
	...exemplarFields,
	sourceQuestionId: v.string(),
	questionId: v.optional(v.id('question')),
	cohortId: v.optional(v.id('cohort')),
	tier: exemplarTier,
	/** Vector filter key, `${questionType}:${tier}`, since filters can't AND two fields. */
	typeTier: v.string(),
	quality: v.number(),
	labelSource: v.union(v.literal('model'), v.literal('heuristic')),
	embedTextHash: v.string(),
	embedding: v.array(v.float64()),
	buildId: v.string(),
	updatedAt: v.number()
})
	.index('by_sourceQuestionId', ['sourceQuestionId'])
	.vectorIndex('by_embedding', {
		vectorField: 'embedding',
		dimensions: 3072,
		filterFields: ['typeTier', 'cohortId']
	});
