import { v } from 'convex/values';
import { authAdminMutation, authAdminQuery, authQuery } from './authQueries';
import { internalMutation, mutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';

const scopeTypeValidator = v.union(v.literal('global'), v.literal('cohort'), v.literal('class'));
const issuerTypeValidator = v.union(v.literal('platform'), v.literal('cohort'));
const metricValidator = v.union(
	v.literal('questions_interacted'),
	v.literal('questions_mastered'),
	v.literal('questions_flagged'),
	v.literal('early_interactions'),
	v.literal('late_interactions'),
	v.literal('questions_created'),
	v.literal('streak_current_days'),
	v.literal('streak_best_days')
);
const metricOpValidator = v.union(
	v.literal('gte'),
	v.literal('gt'),
	v.literal('eq'),
	v.literal('lte'),
	v.literal('lt')
);

const upsertBadgeArgs = {
	badgeId: v.optional(v.id('badgeDefinitions')),
	key: v.string(),
	name: v.string(),
	description: v.string(),
	iconKey: v.string(),
	iconColor: v.string(),
	gradient: v.object({
		from: v.string(),
		mid: v.string(),
		to: v.string()
	}),
	ownedPct: v.number(),
	scopeType: scopeTypeValidator,
	cohortId: v.optional(v.id('cohort')),
	classId: v.optional(v.id('class')),
	issuerType: issuerTypeValidator,
	issuerName: v.string(),
	issuerUrl: v.optional(v.string()),
	scopeLabel: v.string(),
	eligibility: v.string(),
	seasonLabel: v.optional(v.string()),
	isActive: v.optional(v.boolean())
};

const upsertRuleArgs = {
	ruleId: v.optional(v.id('badgeRules')),
	badgeDefinitionId: v.id('badgeDefinitions'),
	name: v.optional(v.string()),
	allOf: v.array(
		v.object({
			metric: metricValidator,
			op: metricOpValidator,
			value: v.number()
		})
	),
	isActive: v.optional(v.boolean())
};

type UpsertBadgeArgs = {
	badgeId?: Id<'badgeDefinitions'>;
	key: string;
	name: string;
	description: string;
	iconKey: string;
	iconColor: string;
	gradient: { from: string; mid: string; to: string };
	ownedPct: number;
	scopeType: 'global' | 'cohort' | 'class';
	cohortId?: Id<'cohort'>;
	classId?: Id<'class'>;
	issuerType: 'platform' | 'cohort';
	issuerName: string;
	issuerUrl?: string;
	scopeLabel: string;
	eligibility: string;
	seasonLabel?: string;
	isActive?: boolean;
};

type UpsertRuleArgs = {
	ruleId?: Id<'badgeRules'>;
	badgeDefinitionId: Id<'badgeDefinitions'>;
	name?: string;
	allOf: Array<{
		metric:
			| 'questions_interacted'
			| 'questions_mastered'
			| 'questions_flagged'
			| 'early_interactions'
			| 'late_interactions'
			| 'questions_created'
			| 'streak_current_days'
			| 'streak_best_days';
		op: 'gte' | 'gt' | 'eq' | 'lte' | 'lt';
		value: number;
	}>;
	isActive?: boolean;
};

const SUPPORTED_PLATFORM_BADGE_KEYS = new Set([
	'study_streak',
	'early_bird',
	'night_owl',
	'question_creator'
]);

function isSupportedIssuerType(issuerType: string) {
	return issuerType === 'platform' || issuerType === 'cohort';
}

function isSupportedPlatformBadgeKey(key: string) {
	return SUPPORTED_PLATFORM_BADGE_KEYS.has(key);
}

function toProperCase(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

async function resolveScopedReferences(
	ctx: { db: any },
	args: UpsertBadgeArgs
): Promise<{ cohortId?: Id<'cohort'>; classId?: Id<'class'> }> {
	if (args.scopeType === 'global') return {};

	if (args.scopeType === 'cohort') {
		if (!args.cohortId) {
			throw new Error('cohortId is required for cohort-scoped badges');
		}
		const cohort = await ctx.db.get(args.cohortId);
		if (!cohort) throw new Error('Cohort not found');
		return { cohortId: cohort._id };
	}

	if (!args.classId) {
		throw new Error('classId is required for class-scoped badges');
	}
	const classItem = await ctx.db.get(args.classId);
	if (!classItem) throw new Error('Class not found');

	return { classId: classItem._id, cohortId: classItem.cohortId };
}

async function normalizeIssuerForBadge(
	ctx: { db: any },
	args: UpsertBadgeArgs,
	resolvedScope: { cohortId?: Id<'cohort'> }
) {
	if (args.issuerType === 'platform') {
		return {
			issuerType: 'platform' as const,
			issuerName: 'LearnTerms',
			issuerUrl: args.issuerUrl?.trim() || undefined
		};
	}

	if (!resolvedScope.cohortId) {
		throw new Error('Cohort issuer badges must be cohort or class scoped');
	}

	const cohort = await ctx.db.get(resolvedScope.cohortId);
	if (!cohort) throw new Error('Cohort not found');

	return {
		issuerType: 'cohort' as const,
		issuerName: cohort.name.trim() || 'Cohort',
		issuerUrl: undefined as string | undefined
	};
}

async function getCaller(ctx: { db: any; identity: { subject: string } }) {
	return await ctx.db
		.query('users')
		.withIndex('by_clerkUserId', (q: any) => q.eq('clerkUserId', ctx.identity.subject))
		.first();
}

async function enforceAdminScope(
	ctx: { db: any; identity: { subject: string } },
	args: UpsertBadgeArgs,
	resolvedScope: { cohortId?: Id<'cohort'> }
) {
	const caller = await getCaller(ctx);
	if (!caller) throw new Error('Caller user record not found');

	const callerRole = caller.role ?? 'student';
	if (callerRole === 'dev') return;

	if (args.scopeType === 'global') {
		throw new Error('Only dev users can create global badges');
	}
	if (!caller.cohortId) {
		throw new Error('Admin must belong to a cohort to manage scoped badges');
	}
	if (resolvedScope.cohortId !== caller.cohortId) {
		throw new Error('You can only manage badges for your own cohort');
	}
	if (args.issuerType === 'platform') {
		throw new Error('Only dev users can assign platform issuer type');
	}
}

async function enforceAdminScopeForExistingBadge(
	ctx: { db: any; identity: { subject: string } },
	badge: Doc<'badgeDefinitions'>
) {
	const caller = await getCaller(ctx);
	if (!caller) throw new Error('Caller user record not found');

	const callerRole = caller.role ?? 'student';
	if (callerRole === 'dev') return;

	if (badge.scopeType === 'global') {
		throw new Error('Only dev users can manage global badge rules');
	}
	if (!caller.cohortId) {
		throw new Error('Admin must belong to a cohort to manage scoped badges');
	}
	if (badge.cohortId !== caller.cohortId) {
		throw new Error('You can only manage badges for your own cohort');
	}
	if (badge.issuerType === 'platform') {
		throw new Error('Only dev users can manage platform-issued badge rules');
	}
}

async function upsertBadge(ctx: { db: any }, args: UpsertBadgeArgs, createdByUserId?: Id<'users'>) {
	const normalizedKey = args.key.trim().toLowerCase();
	if (!normalizedKey) throw new Error('Badge key is required');

	const resolvedScope = await resolveScopedReferences(ctx, args);
	const issuer = await normalizeIssuerForBadge(ctx, args, resolvedScope);

	const existingWithKey = await ctx.db
		.query('badgeDefinitions')
		.withIndex('by_key', (q: any) => q.eq('key', normalizedKey))
		.unique();

	if (existingWithKey && (!args.badgeId || existingWithKey._id !== args.badgeId)) {
		throw new Error('Badge key already exists');
	}

	const payload = {
		key: normalizedKey,
		name: toProperCase(args.name),
		description: args.description.trim(),
		iconKey: args.iconKey.trim(),
		iconColor: args.iconColor.trim(),
		gradient: args.gradient,
		ownedPct: args.ownedPct,
		scopeType: args.scopeType,
		cohortId: resolvedScope.cohortId,
		classId: resolvedScope.classId,
		issuerType: issuer.issuerType,
		issuerName: issuer.issuerName,
		issuerUrl: issuer.issuerUrl,
		scopeLabel: args.scopeLabel.trim(),
		eligibility: args.eligibility.trim(),
		seasonLabel: args.seasonLabel?.trim() || undefined,
		isActive: args.isActive ?? true,
		updatedAt: Date.now()
	};

	if (args.badgeId) {
		const existing = await ctx.db.get(args.badgeId);
		if (!existing) throw new Error('Badge not found');
		await ctx.db.patch(args.badgeId, payload);
		return args.badgeId;
	}

	return await ctx.db.insert('badgeDefinitions', {
		...payload,
		awardedCount: 0,
		createdByUserId
	});
}

async function upsertRule(ctx: { db: any }, args: UpsertRuleArgs, createdByUserId?: Id<'users'>) {
	if (args.allOf.length === 0) {
		throw new Error('Rule must have at least one condition');
	}

	const badge = await ctx.db.get(args.badgeDefinitionId);
	if (!badge) throw new Error('Badge not found');

	const payload = {
		badgeDefinitionId: args.badgeDefinitionId,
		name: args.name?.trim() || undefined,
		allOf: args.allOf,
		isActive: args.isActive ?? true,
		updatedAt: Date.now()
	};

	if (args.ruleId) {
		const existing = await ctx.db.get(args.ruleId);
		if (!existing) throw new Error('Rule not found');
		if (existing.badgeDefinitionId !== args.badgeDefinitionId) {
			throw new Error('Cannot move a rule to a different badge');
		}
		await ctx.db.patch(args.ruleId, payload);
		return args.ruleId;
	}

	return await ctx.db.insert('badgeRules', {
		...payload,
		createdByUserId
	});
}

async function getVisibleBadgesForViewer(ctx: { db: any }, viewer: Doc<'users'> | null) {
	const badges = await ctx.db
		.query('badgeDefinitions')
		.withIndex('by_isActive', (q: any) => q.eq('isActive', true))
		.collect();

	const supportedBadges = badges.filter((badge) => {
		if (!isSupportedIssuerType(badge.issuerType)) return false;
		if (badge.issuerType === 'platform' && !isSupportedPlatformBadgeKey(badge.key)) return false;
		return true;
	});

	const classScoped = supportedBadges.filter(
		(badge) => badge.scopeType === 'class' && badge.classId
	);
	const classDocs = await Promise.all(classScoped.map((badge) => ctx.db.get(badge.classId!)));
	const classCohortMap = new Map<string, Id<'cohort'>>();
	for (const classDoc of classDocs) {
		if (classDoc) classCohortMap.set(classDoc._id, classDoc.cohortId);
	}

	const visible = supportedBadges.filter((badge) => {
		if (badge.scopeType === 'global') return true;
		if (!viewer?.cohortId) return false;
		if (badge.scopeType === 'cohort') return badge.cohortId === viewer.cohortId;
		if (!badge.classId) return false;
		return classCohortMap.get(badge.classId) === viewer.cohortId;
	});

	return { visible, classCohortMap };
}

export const listBadgesForViewer = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		let viewer: Doc<'users'> | null = null;

		if (identity) {
			viewer = await ctx.db
				.query('users')
				.withIndex('by_clerkUserId', (q: any) => q.eq('clerkUserId', identity.subject))
				.first();
		}

		const { visible, classCohortMap } = await getVisibleBadgesForViewer(ctx, viewer);

		let awardsByBadgeId = new Map<string, Doc<'userBadgeAwards'>>();
		if (viewer) {
			const awards = await ctx.db
				.query('userBadgeAwards')
				.withIndex('by_userId', (q: any) => q.eq('userId', viewer._id))
				.collect();
			awardsByBadgeId = new Map(awards.map((award) => [award.badgeDefinitionId, award]));
		}

		const allUsers = await ctx.db.query('users').collect();
		const activeUsers = allUsers.filter((user) => !user.deletedAt);
		const activeUserIds = new Set(activeUsers.map((user) => user._id));
		const globalDenominator = activeUsers.length;

		const cohortIds = [
			...new Set(visible.map((badge) => badge.cohortId).filter(Boolean))
		] as Id<'cohort'>[];
		const cohortDenominator = new Map<string, number>();
		for (const cohortId of cohortIds) {
			const users = await ctx.db
				.query('users')
				.withIndex('by_cohortId', (q: any) => q.eq('cohortId', cohortId))
				.collect();
			cohortDenominator.set(cohortId, users.filter((user) => !user.deletedAt).length);
		}

		const awardCountsByBadgeId = new Map<string, number>();
		const badgeAwards = await Promise.all(
			visible.map(async (badge) => {
				const awards = await ctx.db
					.query('userBadgeAwards')
					.withIndex('by_badgeDefinitionId', (q: any) => q.eq('badgeDefinitionId', badge._id))
					.collect();
				return [badge._id, awards] as const;
			})
		);
		for (const [badgeId, awards] of badgeAwards) {
			const count = awards.filter((award) => activeUserIds.has(award.userId)).length;
			awardCountsByBadgeId.set(badgeId, count);
		}

		const withOwnershipAndAwards = visible.map((badge) => {
			const denominator =
				badge.scopeType === 'global'
					? globalDenominator
					: badge.scopeType === 'cohort'
						? ((badge.cohortId ? cohortDenominator.get(badge.cohortId) : 0) ?? 0)
						: ((badge.classId
								? cohortDenominator.get(classCohortMap.get(badge.classId) ?? '')
								: 0) ?? 0);

			const activeAwardCount = awardCountsByBadgeId.get(badge._id) ?? 0;
			const computedPct = denominator > 0 ? (activeAwardCount / denominator) * 100 : 0;

			const award = awardsByBadgeId.get(badge._id);

			return {
				...badge,
				ownedPct: computedPct,
				earned: !!award,
				awardedAt: award?.awardedAt
			};
		});

		return withOwnershipAndAwards.sort((a, b) => {
			if (Number(b.earned) !== Number(a.earned)) return Number(b.earned) - Number(a.earned);
			if (b.ownedPct !== a.ownedPct) return b.ownedPct - a.ownedPct;
			return a.name.localeCompare(b.name);
		});
	}
});

export const listBadgeCatalogForViewer = authQuery({
	args: {},
	handler: async (ctx) => {
		const viewer = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q: any) => q.eq('clerkUserId', ctx.identity.subject))
			.first();
		if (!viewer) throw new Error('User not found');
		const role = viewer.role ?? 'student';
		if (!(role === 'dev' || role === 'admin')) {
			throw new Error('Unauthorized');
		}

		const { visible, classCohortMap } = await getVisibleBadgesForViewer(ctx, viewer);

		const allUsers = await ctx.db.query('users').collect();
		const activeUsers = allUsers.filter((user) => !user.deletedAt);
		const activeUserIds = new Set(activeUsers.map((user) => user._id));
		const globalDenominator = activeUsers.length;

		const cohortIds = [
			...new Set(visible.map((badge) => badge.cohortId).filter(Boolean))
		] as Id<'cohort'>[];
		const cohortDenominator = new Map<string, number>();
		for (const cohortId of cohortIds) {
			const users = await ctx.db
				.query('users')
				.withIndex('by_cohortId', (q: any) => q.eq('cohortId', cohortId))
				.collect();
			cohortDenominator.set(cohortId, users.filter((user) => !user.deletedAt).length);
		}

		const awardCountsByBadgeId = new Map<string, number>();
		const badgeAwards = await Promise.all(
			visible.map(async (badge) => {
				const awards = await ctx.db
					.query('userBadgeAwards')
					.withIndex('by_badgeDefinitionId', (q: any) => q.eq('badgeDefinitionId', badge._id))
					.collect();
				return [badge._id, awards] as const;
			})
		);
		for (const [badgeId, awards] of badgeAwards) {
			const count = awards.filter((award) => activeUserIds.has(award.userId)).length;
			awardCountsByBadgeId.set(badgeId, count);
		}

		return visible
			.map((badge) => {
				const denominator =
					badge.scopeType === 'global'
						? globalDenominator
						: badge.scopeType === 'cohort'
							? ((badge.cohortId ? cohortDenominator.get(badge.cohortId) : 0) ?? 0)
							: ((badge.classId
									? cohortDenominator.get(classCohortMap.get(badge.classId) ?? '')
									: 0) ?? 0);

				const activeAwardCount = awardCountsByBadgeId.get(badge._id) ?? 0;
				const computedPct = denominator > 0 ? (activeAwardCount / denominator) * 100 : 0;

				return {
					...badge,
					ownedPct: computedPct
				};
			})
			.sort((a, b) => {
				if (b.ownedPct !== a.ownedPct) return b.ownedPct - a.ownedPct;
				return a.name.localeCompare(b.name);
			});
	}
});

export const getNextUnseenBadgeAwardForViewer = authQuery({
	args: {},
	handler: async (ctx) => {
		const viewer = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q: any) => q.eq('clerkUserId', ctx.identity.subject))
			.first();

		if (!viewer) return null;

		const unseenAwards = await ctx.db
			.query('userBadgeAwards')
			.withIndex('by_userId_seenAt', (q: any) => q.eq('userId', viewer._id).eq('seenAt', undefined))
			.collect();

		if (unseenAwards.length === 0) return null;

		const sortedAwards = unseenAwards.sort((a, b) => a.awardedAt - b.awardedAt);
		for (const nextAward of sortedAwards) {
			const badge = await ctx.db.get(nextAward.badgeDefinitionId);
			if (
				!badge ||
				!isSupportedIssuerType(badge.issuerType) ||
				(badge.issuerType === 'platform' && !isSupportedPlatformBadgeKey(badge.key))
			) {
				await ctx.db.patch(nextAward._id, {
					seenAt: Date.now(),
					updatedAt: Date.now()
				});
				continue;
			}

			return {
				awardId: nextAward._id,
				awardedAt: nextAward.awardedAt,
				source: nextAward.source,
				badge: {
					_id: badge._id,
					key: badge.key,
					name: badge.name,
					description: badge.description,
					iconKey: badge.iconKey,
					iconColor: badge.iconColor,
					gradient: badge.gradient,
					issuerType: badge.issuerType,
					issuerName: badge.issuerName,
					scopeType: badge.scopeType,
					scopeLabel: badge.scopeLabel
				}
			};
		}

		return null;
	}
});

export const markBadgeAwardSeen = mutation({
	args: {
		awardId: v.id('userBadgeAwards')
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');

		const viewer = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q: any) => q.eq('clerkUserId', identity.subject))
			.first();

		if (!viewer) throw new Error('User not found');

		const award = await ctx.db.get(args.awardId);
		if (!award) throw new Error('Badge award not found');
		if (award.userId !== viewer._id) throw new Error('Unauthorized');

		if (award.seenAt) {
			return { alreadySeen: true };
		}

		await ctx.db.patch(award._id, {
			seenAt: Date.now(),
			updatedAt: Date.now()
		});

		return { alreadySeen: false };
	}
});

export const getCohortBadgeBoard = authQuery({
	args: {},
	handler: async (ctx) => {
		const viewer = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q: any) => q.eq('clerkUserId', ctx.identity.subject))
			.first();

		if (!viewer) throw new Error('User not found');
		if (!viewer.cohortId) throw new Error('You must be assigned to a cohort');

		const cohort = await ctx.db.get(viewer.cohortId);
		if (!cohort) throw new Error('Cohort not found');

		const members = await ctx.db
			.query('users')
			.withIndex('by_cohortId', (q: any) => q.eq('cohortId', viewer.cohortId))
			.collect();
		const activeMembers = members
			.filter((member) => !member.deletedAt)
			.sort((a, b) => a.name.localeCompare(b.name));
		const activeMemberIds = new Set(activeMembers.map((member) => member._id));

		const awards = await ctx.db
			.query('userBadgeAwards')
			.withIndex('by_cohortId', (q: any) => q.eq('cohortId', viewer.cohortId))
			.collect();
		const activeMemberAwards = awards.filter((award) => activeMemberIds.has(award.userId));

		const awardsByUserId = new Map<string, Doc<'userBadgeAwards'>[]>();
		for (const award of activeMemberAwards) {
			const group = awardsByUserId.get(award.userId) ?? [];
			group.push(award);
			awardsByUserId.set(award.userId, group);
		}

		const badgeIds = [...new Set(activeMemberAwards.map((award) => award.badgeDefinitionId))];
		const badgeDocs = await Promise.all(badgeIds.map((badgeId) => ctx.db.get(badgeId)));
		const badgeById = new Map<string, Doc<'badgeDefinitions'>>();
		for (const badge of badgeDocs) {
			if (!badge) continue;
			if (!isSupportedIssuerType(badge.issuerType)) continue;
			if (badge.issuerType === 'platform' && !isSupportedPlatformBadgeKey(badge.key)) continue;
			badgeById.set(badge._id, badge);
		}

		const memberRows = activeMembers
			.map((member) => {
				const memberAwards = (awardsByUserId.get(member._id) ?? [])
					.map((award) => {
						const badge = badgeById.get(award.badgeDefinitionId);
						if (!badge) return null;
						return {
							awardId: award._id,
							badgeId: badge._id,
							key: badge.key,
							name: badge.name,
							description: badge.description,
							iconKey: badge.iconKey,
							iconColor: badge.iconColor,
							gradient: badge.gradient,
							issuerName: badge.issuerName,
							issuerType: badge.issuerType,
							scopeType: badge.scopeType,
							awardedAt: award.awardedAt
						};
					})
					.filter((award): award is NonNullable<typeof award> => !!award)
					.sort((a, b) => b.awardedAt - a.awardedAt);

				return {
					userId: member._id,
					name: member.name,
					firstName: member.firstName,
					lastName: member.lastName,
					imageUrl: member.imageUrl,
					role: member.role ?? 'student',
					earnedCount: memberAwards.length,
					recentAwards: memberAwards.slice(0, 6),
					awards: memberAwards
				};
			})
			.sort((a, b) => {
				if (b.earnedCount !== a.earnedCount) return b.earnedCount - a.earnedCount;
				return a.name.localeCompare(b.name);
			});

		const membersWithAwards = memberRows.filter((member) => member.earnedCount > 0).length;
		const flattenedAwards = memberRows
			.flatMap((member) =>
				member.awards.map((award) => ({
					...award,
					userId: member.userId,
					userName: member.name,
					userImageUrl: member.imageUrl
				}))
			)
			.sort((a, b) => b.awardedAt - a.awardedAt);

		const badgeCountMap = new Map<
			string,
			{
				badgeId: string;
				key: string;
				name: string;
				description: string;
				iconKey: string;
				iconColor: string;
				gradient: { from: string; mid: string; to: string };
				issuerName: string;
				issuerType: string;
				count: number;
			}
		>();
		for (const award of flattenedAwards) {
			const existing = badgeCountMap.get(award.badgeId);
			if (existing) {
				existing.count += 1;
				continue;
			}
			badgeCountMap.set(award.badgeId, {
				badgeId: award.badgeId,
				key: award.key,
				name: award.name,
				description: award.description,
				iconKey: award.iconKey,
				iconColor: award.iconColor,
				gradient: award.gradient,
				issuerName: award.issuerName,
				issuerType: award.issuerType,
				count: 1
			});
		}
		const topBadges = [...badgeCountMap.values()]
			.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
			.slice(0, 12);

		return {
			cohort: {
				_id: cohort._id,
				name: cohort.name,
				description: cohort.description,
				startYear: cohort.startYear,
				endYear: cohort.endYear,
				picUrl: cohort.pic_url,
				memberCount: activeMembers.length
			},
			totals: {
				totalMembers: activeMembers.length,
				totalAwards: flattenedAwards.length,
				badgesRepresented: badgeById.size,
				membersWithAwards
			},
			members: memberRows,
			recentAwards: flattenedAwards.slice(0, 24),
			topBadges,
			generatedAt: Date.now()
		};
	}
});

export const upsertBadgeDefinition = authAdminMutation({
	args: upsertBadgeArgs,
	handler: async (ctx, args) => {
		const resolvedScope = await resolveScopedReferences(ctx, args);
		await enforceAdminScope(ctx, args, resolvedScope);

		const caller = await getCaller(ctx);
		return await upsertBadge(ctx, args, caller?._id);
	}
});

export const upsertBadgeRule = authAdminMutation({
	args: upsertRuleArgs,
	handler: async (ctx, args) => {
		const badge = await ctx.db.get(args.badgeDefinitionId);
		if (!badge) throw new Error('Badge not found');
		await enforceAdminScopeForExistingBadge(ctx, badge);

		const caller = await getCaller(ctx);
		return await upsertRule(ctx, args, caller?._id);
	}
});

export const listBadgeRulesForBadge = authAdminQuery({
	args: {
		badgeDefinitionId: v.id('badgeDefinitions')
	},
	handler: async (ctx, args) => {
		const badge = await ctx.db.get(args.badgeDefinitionId);
		if (!badge) throw new Error('Badge not found');
		await enforceAdminScopeForExistingBadge(ctx, badge);

		return await ctx.db
			.query('badgeRules')
			.withIndex('by_badgeDefinitionId', (q: any) =>
				q.eq('badgeDefinitionId', args.badgeDefinitionId)
			)
			.collect();
	}
});

export const ensureTrackablePlatformBadgesInternal = internalMutation({
	args: {
		deactivateOtherPlatformBadges: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
		const definitions: Array<
			UpsertBadgeArgs & { rule: UpsertRuleArgs['allOf']; ruleName: string }
		> = [
			{
				key: 'study_streak',
				name: 'Study Streak',
				description: 'Keep your momentum going with a 7-day study streak.',
				iconKey: 'flame',
				iconColor: '#f97316',
				gradient: { from: '#fb923c', mid: '#f97316', to: '#ea580c' },
				ownedPct: 0,
				scopeType: 'global',
				issuerType: 'platform',
				issuerName: 'LearnTerms',
				scopeLabel: 'All LearnTerms users',
				eligibility: 'Maintain a 7-day active study streak',
				isActive: true,
				ruleName: 'study_streak_rule',
				rule: [{ metric: 'streak_current_days', op: 'gte', value: 7 }]
			},
			{
				key: 'early_bird',
				name: 'Early Bird',
				description: 'You put in the reps before 8 AM.',
				iconKey: 'sunrise',
				iconColor: '#eab308',
				gradient: { from: '#fde047', mid: '#eab308', to: '#ca8a04' },
				ownedPct: 0,
				scopeType: 'global',
				issuerType: 'platform',
				issuerName: 'LearnTerms',
				scopeLabel: 'All LearnTerms users',
				eligibility: 'Complete 20 early-morning study interactions',
				isActive: true,
				ruleName: 'early_bird_rule',
				rule: [{ metric: 'early_interactions', op: 'gte', value: 20 }]
			},
			{
				key: 'night_owl',
				name: 'Night Owl',
				description: 'You keep going when it is late.',
				iconKey: 'moon',
				iconColor: '#a78bfa',
				gradient: { from: '#c4b5fd', mid: '#8b5cf6', to: '#6d28d9' },
				ownedPct: 0,
				scopeType: 'global',
				issuerType: 'platform',
				issuerName: 'LearnTerms',
				scopeLabel: 'All LearnTerms users',
				eligibility: 'Complete 20 late-night study interactions',
				isActive: true,
				ruleName: 'night_owl_rule',
				rule: [{ metric: 'late_interactions', op: 'gte', value: 20 }]
			},
			{
				key: 'question_creator',
				name: 'Question Creator',
				description: 'Contribute 10 or more questions to your cohort content.',
				iconKey: 'lightbulb',
				iconColor: '#0ea5e9',
				gradient: { from: '#38bdf8', mid: '#0ea5e9', to: '#0284c7' },
				ownedPct: 0,
				scopeType: 'global',
				issuerType: 'platform',
				issuerName: 'LearnTerms',
				scopeLabel: 'All LearnTerms users',
				eligibility: 'Create at least 10 questions',
				isActive: true,
				ruleName: 'question_creator_rule',
				rule: [{ metric: 'questions_created', op: 'gte', value: 10 }]
			}
		];

		const ensuredBadgeIds: Id<'badgeDefinitions'>[] = [];

		for (const definition of definitions) {
			const existing = await ctx.db
				.query('badgeDefinitions')
				.withIndex('by_key', (q: any) => q.eq('key', definition.key))
				.unique();

			const badgeId = await upsertBadge(
				ctx,
				{
					badgeId: existing?._id,
					key: definition.key,
					name: definition.name,
					description: definition.description,
					iconKey: definition.iconKey,
					iconColor: definition.iconColor,
					gradient: definition.gradient,
					ownedPct: definition.ownedPct,
					scopeType: definition.scopeType,
					issuerType: definition.issuerType,
					issuerName: definition.issuerName,
					scopeLabel: definition.scopeLabel,
					eligibility: definition.eligibility,
					isActive: definition.isActive
				},
				existing?.createdByUserId
			);
			ensuredBadgeIds.push(badgeId);

			const rules = await ctx.db
				.query('badgeRules')
				.withIndex('by_badgeDefinitionId', (q: any) => q.eq('badgeDefinitionId', badgeId))
				.collect();

			const matchingRule = rules.find((rule) => rule.name === definition.ruleName);
			await upsertRule(
				ctx,
				{
					ruleId: matchingRule?._id,
					badgeDefinitionId: badgeId,
					name: definition.ruleName,
					allOf: definition.rule,
					isActive: true
				},
				matchingRule?.createdByUserId
			);

			for (const rule of rules) {
				if (matchingRule && rule._id === matchingRule._id) continue;
				if (rule.name === definition.ruleName) continue;
				if (rule.isActive) {
					await ctx.db.patch(rule._id, { isActive: false, updatedAt: Date.now() });
				}
			}
		}

		if (args.deactivateOtherPlatformBadges ?? true) {
			const platformBadges = await ctx.db
				.query('badgeDefinitions')
				.withIndex('by_scopeType', (q: any) => q.eq('scopeType', 'global'))
				.collect();
			for (const badge of platformBadges) {
				if (badge.issuerType !== 'platform') continue;
				if (isSupportedPlatformBadgeKey(badge.key)) continue;
				if (!badge.isActive) continue;
				await ctx.db.patch(badge._id, { isActive: false, updatedAt: Date.now() });
			}
		}

		return { ensuredBadgeIds, count: ensuredBadgeIds.length };
	}
});

// Internal helper for CLI-based seeding with `bunx convex run badges:upsertBadgeDefinitionInternal`.
export const upsertBadgeDefinitionInternal = internalMutation({
	args: upsertBadgeArgs,
	handler: async (ctx, args) => {
		return await upsertBadge(ctx, args);
	}
});

// Internal helper for CLI-based rule seeding with `bunx convex run badges:upsertBadgeRuleInternal`.
export const upsertBadgeRuleInternal = internalMutation({
	args: upsertRuleArgs,
	handler: async (ctx, args) => {
		return await upsertRule(ctx, args);
	}
});

export const normalizeBadgeNamesInternal = internalMutation({
	args: {},
	handler: async (ctx) => {
		const badges = await ctx.db.query('badgeDefinitions').collect();
		let updated = 0;

		for (const badge of badges) {
			const properName = toProperCase(badge.name);
			if (badge.name === properName) continue;
			await ctx.db.patch(badge._id, {
				name: properName,
				updatedAt: Date.now()
			});
			updated += 1;
		}

		return { scanned: badges.length, updated };
	}
});
