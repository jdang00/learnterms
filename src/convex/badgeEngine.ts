import type { Doc, Id } from './_generated/dataModel';

const DAY_MS = 24 * 60 * 60 * 1000;

export type BadgeMetricKey =
	| 'questions_interacted'
	| 'questions_mastered'
	| 'questions_flagged'
	| 'early_interactions'
	| 'late_interactions'
	| 'questions_created'
	| 'streak_current_days'
	| 'streak_best_days';

export type BadgeMetricOp = 'gte' | 'gt' | 'eq' | 'lte' | 'lt';

export type BadgeRuleCondition = {
	metric: BadgeMetricKey;
	op: BadgeMetricOp;
	value: number;
};

type DbCtx = { db: any };

type ScopeRef =
	| { scopeType: 'global' }
	| { scopeType: 'cohort'; cohortId: Id<'cohort'> }
	| { scopeType: 'class'; classId: Id<'class'> };

export type ProgressMetricDelta = {
	userId: Id<'users'>;
	classId: Id<'class'>;
	occurredAt: number;
	interactedDelta: number;
	masteredDelta: number;
	flaggedDelta: number;
	earlyInteractionsDelta: number;
	lateInteractionsDelta: number;
	questionsCreatedDelta?: number;
	utcOffsetMinutes?: number;
	touchStreak: boolean;
};

function clampNonNegative(value: number) {
	return Math.max(0, value);
}

function toDayKey(ts: number, utcOffsetMinutes?: number) {
	if (utcOffsetMinutes === undefined) return Math.floor(ts / DAY_MS);
	return Math.floor((ts - utcOffsetMinutes * 60_000) / DAY_MS);
}

function compareMetric(left: number, op: BadgeMetricOp, right: number) {
	if (op === 'gte') return left >= right;
	if (op === 'gt') return left > right;
	if (op === 'eq') return left === right;
	if (op === 'lte') return left <= right;
	return left < right;
}

function getMetricValue(metricDoc: Doc<'userBadgeMetrics'>, metric: BadgeMetricKey) {
	if (metric === 'questions_interacted') return metricDoc.questionsInteracted;
	if (metric === 'questions_mastered') return metricDoc.questionsMastered;
	if (metric === 'questions_flagged') return metricDoc.questionsFlagged;
	if (metric === 'early_interactions') return metricDoc.earlyInteractions;
	if (metric === 'late_interactions') return metricDoc.lateInteractions;
	if (metric === 'questions_created') return metricDoc.questionsCreated ?? 0;
	if (metric === 'streak_current_days') return metricDoc.streakCurrentDays;
	return metricDoc.streakBestDays;
}

async function getMetricDoc(ctx: DbCtx, userId: Id<'users'>, scope: ScopeRef) {
	if (scope.scopeType === 'global') {
		return await ctx.db
			.query('userBadgeMetrics')
			.withIndex('by_user_scopeType', (q: any) => q.eq('userId', userId).eq('scopeType', 'global'))
			.unique();
	}

	if (scope.scopeType === 'cohort') {
		return await ctx.db
			.query('userBadgeMetrics')
			.withIndex('by_user_scope_cohort', (q: any) =>
				q.eq('userId', userId).eq('scopeType', 'cohort').eq('cohortId', scope.cohortId)
			)
			.unique();
	}

	return await ctx.db
		.query('userBadgeMetrics')
		.withIndex('by_user_scope_class', (q: any) =>
			q.eq('userId', userId).eq('scopeType', 'class').eq('classId', scope.classId)
		)
		.unique();
}

type StreakUpdate = {
	touchStreak: boolean;
	occurredAt: number;
	utcOffsetMinutes?: number;
};

async function upsertMetricDoc(
	ctx: DbCtx,
	userId: Id<'users'>,
	scope: ScopeRef,
	delta: {
		interacted: number;
		mastered: number;
		flagged: number;
		early: number;
		late: number;
		created: number;
	},
	streakUpdate: StreakUpdate
) {
	const now = Date.now();
	const existing = await getMetricDoc(ctx, userId, scope);

	const base = existing ?? {
		userId,
		scopeType: scope.scopeType,
		cohortId: scope.scopeType === 'cohort' ? scope.cohortId : undefined,
		classId: scope.scopeType === 'class' ? scope.classId : undefined,
		questionsInteracted: 0,
		questionsMastered: 0,
		questionsFlagged: 0,
		earlyInteractions: 0,
		lateInteractions: 0,
		questionsCreated: 0,
		streakCurrentDays: 0,
		streakBestDays: 0,
		lastActivityDayKey: undefined as number | undefined,
		updatedAt: now
	};

	let streakCurrentDays = base.streakCurrentDays;
	let streakBestDays = base.streakBestDays;
	let lastActivityDayKey = base.lastActivityDayKey;

	if (scope.scopeType === 'global' && streakUpdate.touchStreak) {
		const dayKey = toDayKey(streakUpdate.occurredAt, streakUpdate.utcOffsetMinutes);
		if (lastActivityDayKey === undefined) {
			streakCurrentDays = 1;
			streakBestDays = Math.max(streakBestDays, 1);
			lastActivityDayKey = dayKey;
		} else if (dayKey === lastActivityDayKey) {
			// same day, keep streak as-is
		} else if (dayKey === lastActivityDayKey + 1) {
			streakCurrentDays += 1;
			streakBestDays = Math.max(streakBestDays, streakCurrentDays);
			lastActivityDayKey = dayKey;
		} else if (dayKey > lastActivityDayKey + 1) {
			streakCurrentDays = 1;
			streakBestDays = Math.max(streakBestDays, 1);
			lastActivityDayKey = dayKey;
		}
	}

	const payload = {
		userId,
		scopeType: scope.scopeType,
		cohortId: scope.scopeType === 'cohort' ? scope.cohortId : undefined,
		classId: scope.scopeType === 'class' ? scope.classId : undefined,
		questionsInteracted: clampNonNegative(base.questionsInteracted + delta.interacted),
		questionsMastered: clampNonNegative(base.questionsMastered + delta.mastered),
		questionsFlagged: clampNonNegative(base.questionsFlagged + delta.flagged),
		earlyInteractions: clampNonNegative(base.earlyInteractions + delta.early),
		lateInteractions: clampNonNegative(base.lateInteractions + delta.late),
		questionsCreated: clampNonNegative((base.questionsCreated ?? 0) + delta.created),
		streakCurrentDays: clampNonNegative(streakCurrentDays),
		streakBestDays: clampNonNegative(streakBestDays),
		lastActivityDayKey,
		updatedAt: now
	};

	if (existing) {
		await ctx.db.patch(existing._id, payload);
		return { ...existing, ...payload } as Doc<'userBadgeMetrics'>;
	}

	const id = await ctx.db.insert('userBadgeMetrics', payload);
	return { _id: id, _creationTime: now, ...payload } as Doc<'userBadgeMetrics'>;
}

function evaluateConditions(metricDoc: Doc<'userBadgeMetrics'>, conditions: BadgeRuleCondition[]) {
	return conditions.every((condition) =>
		compareMetric(getMetricValue(metricDoc, condition.metric), condition.op, condition.value)
	);
}

async function awardBadgeIfEligible(
	ctx: DbCtx,
	args: {
		userId: Id<'users'>;
		badge: Doc<'badgeDefinitions'>;
		metricDoc: Doc<'userBadgeMetrics'> | null;
		rules: Doc<'badgeRules'>[];
		source: Doc<'userBadgeAwards'>['source'];
		contextCohortId?: Id<'cohort'>;
		contextClassId?: Id<'class'>;
	}
) {
	if (!args.metricDoc || args.rules.length === 0) return null;

	const meetsRule = args.rules.some((rule) =>
		evaluateConditions(args.metricDoc!, rule.allOf as any)
	);
	if (!meetsRule) return null;

	const existing = await ctx.db
		.query('userBadgeAwards')
		.withIndex('by_user_badge', (q: any) =>
			q.eq('userId', args.userId).eq('badgeDefinitionId', args.badge._id)
		)
		.unique();

	if (existing) return existing._id;

	const matchingRule = args.rules.find((rule) =>
		evaluateConditions(args.metricDoc!, rule.allOf as any)
	);

	const awardId = await ctx.db.insert('userBadgeAwards', {
		userId: args.userId,
		badgeDefinitionId: args.badge._id,
		awardedByRuleId: matchingRule?._id,
		source: args.source,
		cohortId:
			args.badge.scopeType === 'cohort' || args.badge.scopeType === 'class'
				? args.badge.cohortId
				: args.contextCohortId,
		classId: args.badge.scopeType === 'class' ? args.badge.classId : args.contextClassId,
		awardedAt: Date.now(),
		updatedAt: Date.now()
	});

	await ctx.db.patch(args.badge._id, {
		awardedCount: (args.badge.awardedCount ?? 0) + 1,
		updatedAt: Date.now()
	});

	return awardId;
}

async function getCandidateBadges(
	ctx: DbCtx,
	cohortId: Id<'cohort'> | undefined,
	classIds: Id<'class'>[]
) {
	const globalBadges = await ctx.db
		.query('badgeDefinitions')
		.withIndex('by_scopeType', (q: any) => q.eq('scopeType', 'global'))
		.collect();

	const cohortBadges = cohortId
		? await ctx.db
				.query('badgeDefinitions')
				.withIndex('by_cohortId', (q: any) => q.eq('cohortId', cohortId))
				.collect()
		: [];

	const classBadges = await Promise.all(
		classIds.map((classId) =>
			ctx.db
				.query('badgeDefinitions')
				.withIndex('by_classId', (q: any) => q.eq('classId', classId))
				.collect()
		)
	);

	const merged = [...globalBadges, ...cohortBadges, ...classBadges.flat()];
	const deduped = new Map<string, Doc<'badgeDefinitions'>>();
	for (const badge of merged) {
		if (!badge.isActive) continue;
		deduped.set(badge._id, badge);
	}
	return [...deduped.values()];
}

async function evaluateAndAwardForContext(
	ctx: DbCtx,
	args: {
		userId: Id<'users'>;
		cohortId?: Id<'cohort'>;
		classIds: Id<'class'>[];
		metricDocsByClassId: Map<string, Doc<'userBadgeMetrics'>>;
		cohortMetricDoc: Doc<'userBadgeMetrics'> | null;
		globalMetricDoc: Doc<'userBadgeMetrics'> | null;
		source: Doc<'userBadgeAwards'>['source'];
		contextCohortId?: Id<'cohort'>;
		contextClassId?: Id<'class'>;
	}
) {
	const candidateBadges = await getCandidateBadges(ctx, args.cohortId, args.classIds);
	if (candidateBadges.length === 0) return [];

	const activeRules = await ctx.db
		.query('badgeRules')
		.withIndex('by_isActive', (q: any) => q.eq('isActive', true))
		.collect();

	const rulesByBadgeId = new Map<string, Doc<'badgeRules'>[]>();
	for (const rule of activeRules) {
		const group = rulesByBadgeId.get(rule.badgeDefinitionId) ?? [];
		group.push(rule);
		rulesByBadgeId.set(rule.badgeDefinitionId, group);
	}

	const awardedIds: Id<'userBadgeAwards'>[] = [];
	for (const badge of candidateBadges) {
		const rules = rulesByBadgeId.get(badge._id) ?? [];
		if (rules.length === 0) continue;

		const metricDoc =
			badge.scopeType === 'global'
				? args.globalMetricDoc
				: badge.scopeType === 'cohort'
					? args.cohortMetricDoc
					: badge.classId
						? (args.metricDocsByClassId.get(badge.classId) ?? null)
						: null;

		const awardId = await awardBadgeIfEligible(ctx, {
			userId: args.userId,
			badge,
			metricDoc,
			rules,
			source: args.source,
			contextCohortId: args.contextCohortId,
			contextClassId: args.contextClassId
		});
		if (awardId) awardedIds.push(awardId);
	}

	return awardedIds;
}

export async function applyProgressDeltaAndEvaluateBadges(ctx: DbCtx, args: ProgressMetricDelta) {
	const classDoc = await ctx.db.get(args.classId);
	if (!classDoc) {
		return { awardedAwardIds: [] as Id<'userBadgeAwards'>[] };
	}

	const globalMetricDoc = await upsertMetricDoc(
		ctx,
		args.userId,
		{ scopeType: 'global' },
		{
			interacted: args.interactedDelta,
			mastered: args.masteredDelta,
			flagged: args.flaggedDelta,
			early: args.earlyInteractionsDelta,
			late: args.lateInteractionsDelta,
			created: args.questionsCreatedDelta ?? 0
		},
		{
			touchStreak: args.touchStreak,
			occurredAt: args.occurredAt,
			utcOffsetMinutes: args.utcOffsetMinutes
		}
	);

	const cohortMetricDoc = await upsertMetricDoc(
		ctx,
		args.userId,
		{ scopeType: 'cohort', cohortId: classDoc.cohortId },
		{
			interacted: args.interactedDelta,
			mastered: args.masteredDelta,
			flagged: args.flaggedDelta,
			early: args.earlyInteractionsDelta,
			late: args.lateInteractionsDelta,
			created: args.questionsCreatedDelta ?? 0
		},
		{ touchStreak: false, occurredAt: args.occurredAt }
	);

	const classMetricDoc = await upsertMetricDoc(
		ctx,
		args.userId,
		{ scopeType: 'class', classId: args.classId },
		{
			interacted: args.interactedDelta,
			mastered: args.masteredDelta,
			flagged: args.flaggedDelta,
			early: args.earlyInteractionsDelta,
			late: args.lateInteractionsDelta,
			created: args.questionsCreatedDelta ?? 0
		},
		{ touchStreak: false, occurredAt: args.occurredAt }
	);

	const metricDocsByClassId = new Map<string, Doc<'userBadgeMetrics'>>();
	metricDocsByClassId.set(args.classId, classMetricDoc);

	const awardedAwardIds = await evaluateAndAwardForContext(ctx, {
		userId: args.userId,
		cohortId: classDoc.cohortId,
		classIds: [args.classId],
		metricDocsByClassId,
		cohortMetricDoc,
		globalMetricDoc,
		source: 'earned',
		contextCohortId: classDoc.cohortId,
		contextClassId: args.classId
	});

	return { awardedAwardIds };
}

export async function applyQuestionCreationDeltaAndEvaluateBadges(
	ctx: DbCtx,
	args: {
		userId: Id<'users'>;
		classId: Id<'class'>;
		questionsCreatedDelta: number;
		occurredAt: number;
	}
) {
	if (args.questionsCreatedDelta === 0) {
		return { awardedAwardIds: [] as Id<'userBadgeAwards'>[] };
	}

	return await applyProgressDeltaAndEvaluateBadges(ctx, {
		userId: args.userId,
		classId: args.classId,
		occurredAt: args.occurredAt,
		interactedDelta: 0,
		masteredDelta: 0,
		flaggedDelta: 0,
		earlyInteractionsDelta: 0,
		lateInteractionsDelta: 0,
		questionsCreatedDelta: args.questionsCreatedDelta,
		touchStreak: false
	});
}
