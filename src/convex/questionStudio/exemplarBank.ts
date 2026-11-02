import { embed } from 'ai';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import {
	internalAction,
	internalMutation,
	internalQuery,
	type ActionCtx
} from '../_generated/server';
import { EMBEDDING_DIMENSION, EMBEDDING_MODEL } from '../aiModels';
import { pagedArgs } from '../migrations/shared';
import { exemplarForTier, type Exemplar, type ExemplarTier } from './exemplars';
import { queryText, selectDiverse } from './exemplarStats';
import {
	exemplarQuestionType,
	exemplarResultValidator,
	exemplarTier,
	exemplarUpsertValidator
} from './exemplarValidators';
import { assertOpenRouterKey, openRouter } from './shared';

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 10;
/** Vector hits fetched before exclusion and diversity selection. */
const CANDIDATE_POOL = 40;

/**
 * Upsert exemplar rows by source question id, stamping them with the build that wrote them.
 * Model-assigned labels survive a heuristic-only rebuild of the same item.
 * Seeding: bun scripts/ai-eval/exemplars/push.ts (add --prod --yes-production for production)
 */
export const upsertExemplars = internalMutation({
	args: { buildId: v.string(), exemplars: v.array(exemplarUpsertValidator) },
	returns: v.object({ inserted: v.number(), updated: v.number(), skipped: v.number() }),
	handler: async (ctx, { buildId, exemplars }) => {
		let inserted = 0;
		let updated = 0;
		let skipped = 0;
		for (const { embedding, ...exemplar } of exemplars) {
			if (embedding && embedding.length !== EMBEDDING_DIMENSION) {
				throw new Error(`Exemplar embeddings must have ${EMBEDDING_DIMENSION} dimensions`);
			}
			const existing = await ctx.db
				.query('questionExemplars')
				.withIndex('by_sourceQuestionId', (q) =>
					q.eq('sourceQuestionId', exemplar.sourceQuestionId)
				)
				.unique();
			const keepModelLabels =
				existing?.labelSource === 'model' && exemplar.labelSource === 'heuristic';
			const labels = keepModelLabels
				? {
						questionType: existing.questionType,
						shape: existing.shape,
						labelSource: 'model' as const
					}
				: {};
			const row = { ...exemplar, ...labels, buildId, updatedAt: Date.now() };
			const typeTier = `${row.questionType}:${row.tier}`;
			if (existing) {
				const reuse = existing.embedTextHash === exemplar.embedTextHash;
				if (!embedding && !reuse) {
					skipped += 1;
					continue;
				}
				await ctx.db.patch(existing._id, {
					...row,
					typeTier,
					...(embedding ? { embedding } : {})
				});
				updated += 1;
			} else if (embedding) {
				await ctx.db.insert('questionExemplars', { ...row, typeTier, embedding });
				inserted += 1;
			} else {
				skipped += 1;
			}
		}
		return { inserted, updated, skipped };
	}
});

/** Embedded-text hashes for rows a rebuild may reuse. Rows carry ~25 KB vectors, so keep calls small. */
export const existingExemplarKeys = internalQuery({
	args: { sourceQuestionIds: v.array(v.string()) },
	returns: v.array(
		v.object({ sourceQuestionId: v.string(), embedTextHash: v.string(), labelSource: v.string() })
	),
	handler: async (ctx, { sourceQuestionIds }) => {
		const rows = await Promise.all(
			sourceQuestionIds.slice(0, 100).map((id) =>
				ctx.db
					.query('questionExemplars')
					.withIndex('by_sourceQuestionId', (q) => q.eq('sourceQuestionId', id))
					.unique()
			)
		);
		return rows
			.filter((row): row is Doc<'questionExemplars'> => row !== null)
			.map((row) => ({
				sourceQuestionId: row.sourceQuestionId,
				embedTextHash: row.embedTextHash,
				labelSource: row.labelSource
			}));
	}
});

/**
 * Delete rows not written by `buildId`, a page at a time.
 * Run via CLI: bunx convex run questionStudio/exemplarBank:pruneExemplars '{"buildId": "..."}'
 */
export const pruneExemplars = internalMutation({
	args: { buildId: v.string(), ...pagedArgs },
	returns: v.object({ deleted: v.number(), done: v.boolean() }),
	handler: async (ctx, args) => {
		const page = await ctx.db
			.query('questionExemplars')
			.paginate({ cursor: args.cursor ?? null, numItems: args.batchSize ?? 100 });
		let deleted = 0;
		for (const row of page.page) {
			if (row.buildId === args.buildId) continue;
			await ctx.db.delete(row._id);
			deleted += 1;
		}
		if (!page.isDone && args.continueAutomatically !== false) {
			await ctx.scheduler.runAfter(0, internal.questionStudio.exemplarBank.pruneExemplars, {
				...args,
				cursor: page.continueCursor
			});
		}
		return { deleted, done: page.isDone };
	}
});

export const getExemplars = internalQuery({
	args: { ids: v.array(v.id('questionExemplars')) },
	returns: v.array(
		v.object({
			_id: v.id('questionExemplars'),
			exemplar: exemplarResultValidator,
			quality: v.number(),
			tier: exemplarTier
		})
	),
	handler: async (ctx, { ids }) => {
		const rows = await Promise.all(ids.slice(0, 100).map((id) => ctx.db.get(id)));
		return rows
			.filter((row): row is Doc<'questionExemplars'> => row !== null)
			.map((row) => ({
				_id: row._id,
				exemplar: exemplarForTier(toExemplar(row), row.tier),
				quality: row.quality,
				tier: row.tier
			}));
	}
});

function toExemplar(row: Doc<'questionExemplars'>): Exemplar {
	return {
		id: row.sourceQuestionId,
		questionType: row.questionType,
		shape: row.shape,
		subject: row.subject,
		stem: row.stem,
		options: row.options,
		correctIndex: row.correctIndex,
		rationale: row.rationale,
		...(row.stats ? { stats: row.stats } : {}),
		...(row.notes ? { notes: row.notes } : {})
	};
}

/**
 * ExemplarSource semantics over the live bank: nearest exemplars of the requested type by
 * objective/context embedding, honoring `exclude`, then diversified across subjects and shapes.
 * Shared by the internal action and by generation workers, which already run as actions.
 */
export async function searchExemplars(
	ctx: ActionCtx,
	args: {
		questionType: Exemplar['questionType'];
		objective: string;
		context?: string;
		limit?: number;
		exclude?: string[];
		tiers?: ExemplarTier[];
	}
): Promise<Exemplar[]> {
	assertOpenRouterKey();
	const limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(args.limit ?? DEFAULT_LIMIT)));
	const tiers = args.tiers?.length ? args.tiers : (['top'] as const);
	const { embedding } = await embed({
		model: openRouter().embedding(EMBEDDING_MODEL),
		value: queryText(args)
	});
	const typeTiers = tiers.map((tier) => `${args.questionType}:${tier}`);
	const hits = await ctx.vectorSearch('questionExemplars', 'by_embedding', {
		vector: embedding,
		limit: Math.min(256, CANDIDATE_POOL + (args.exclude?.length ?? 0)),
		filter: (q) => q.or(...typeTiers.map((typeTier) => q.eq('typeTier', typeTier)))
	});
	const scores = new Map<Id<'questionExemplars'>, number>(hits.map((hit) => [hit._id, hit._score]));
	const rows: {
		_id: Id<'questionExemplars'>;
		exemplar: Exemplar;
		quality: number;
		tier: ExemplarTier;
	}[] = await ctx.runQuery(internal.questionStudio.exemplarBank.getExemplars, {
		ids: hits.map((hit) => hit._id)
	});
	const exclude = new Set(args.exclude ?? []);
	const seenStems = new Set<string>();
	const pool = rows
		.filter((row) => {
			// Copies of one question across modules are separate rows; show one.
			const stem = row.exemplar.stem.toLowerCase();
			if (exclude.has(row.exemplar.id) || seenStems.has(stem)) return false;
			seenStems.add(stem);
			return true;
		})
		.map((row) => ({
			id: row.exemplar.id,
			subject: row.exemplar.subject,
			shape: row.exemplar.shape,
			quality: row.quality,
			similarity: scores.get(row._id) ?? 0,
			tier: row.tier,
			exemplar: row.exemplar
		}))
		.sort((a, b) => b.similarity - a.similarity);
	// At least one exemplar with a full rationale whenever the top tier has a candidate.
	return selectDiverse(pool, limit, (item) => item.tier === 'top').map((item) => item.exemplar);
}

export const findExemplars = internalAction({
	args: {
		questionType: exemplarQuestionType,
		objective: v.string(),
		context: v.optional(v.string()),
		limit: v.optional(v.number()),
		exclude: v.optional(v.array(v.string())),
		tiers: v.optional(v.array(exemplarTier))
	},
	returns: v.array(exemplarResultValidator),
	handler: (ctx, args): Promise<Exemplar[]> => searchExemplars(ctx, args)
});
